import { ChatGroq } from "@langchain/groq";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { log } from "node:console";
import readline from "node:readline/promises";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
});

async function callModel(state) {
  console.log("calling llm");
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__");

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
