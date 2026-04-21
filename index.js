import { ChatGroq } from "@langchain/groq";
import {
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import { log } from "node:console";
import readline from "node:readline/promises";

// Memory layer → stores conversation state across runs (per thread_id)
const checkpointer = new MemorySaver();

// -------------------- TOOLS SETUP --------------------

// Tavily tool → used for web search when LLM decides it needs external info
const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});

// Wrap tools into LangGraph-compatible format
const tools = [tool];
const toolNode = new ToolNode(tools);

// -------------------- MODEL SETUP --------------------

// LLM configuration (Groq hosted model)
// bindTools → allows model to call tools when needed
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0, // deterministic responses
  maxRetries: 2,
}).bindTools(tools);

// -------------------- AGENT LOGIC --------------------

// Main agent execution → sends messages to LLM and gets response
async function callModel(state) {
  if (state.messages.length === 1) {
    console.log("Generating a response...");
  }
  // LLM processes full conversation history
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

// -------------------- CONTROL FLOW --------------------

// Decides whether to continue workflow or end
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  // If model requested tool usage → go to tools node
  if (lastMessage.tool_calls.length > 0) {
    console.log("Searching the web...");
    return "tools";
  }

  // Otherwise → end execution
  return "__end__";
}

// -------------------- WORKFLOW DEFINITION --------------------

// Graph-based workflow:
// start → agent → (tool or end)
// tools → agent (loop back after tool execution)
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Compile workflow into executable app with memory support
const app = workflow.compile({ checkpointer });

// -------------------- CLI LOOP --------------------

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const userInput = await rl.question("You: ");

    // Exit condition
    if (userInput === "/bye") break;

    const finalState = await app.invoke(
      {
        messages: [{ role: "human", content: userInput }],
      },
      {
        configurable: { thread_id: "1" },
      },
    );

    console.log("AI:", finalState.messages.at(-1)?.content);
  }

  rl.close();
}

main();
