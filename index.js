import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import { log } from "node:console";
import readline from "node:readline/promises";

// agent tools
const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});
const tools = [tool];
const toolNode = new ToolNode(tools);

// modle
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
}).bindTools(tools);

// agent function
async function callModel(state) {
  console.log("calling llm");
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

// control flow
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls.length > 0) {
    console.log("Searching the web...");
    return "tools";
  }
  return "__end__";
}

// workflow
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// compile the workflow
const app = workflow.compile();

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const userInput = await rl.question("You: ");
    if (userInput === "/bye") break;

    const finalState = await app.invoke({
      messages: [{ role: "human", content: userInput }],
    });

    console.log("AI:", finalState.messages.at(-1)?.content);
  }

  rl.close();
}

main();
