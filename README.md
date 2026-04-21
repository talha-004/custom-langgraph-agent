# AI Agent with Memory + Web Search (LangGraph)

A simple AI agent built using LangGraph, Groq, and Tavily.

This agent can:

- Chat with the user
- Remember past conversations
- Search the web when needed
- Follow a controlled workflow

---

## What This Project Does

This is not just a chatbot.
It is an **AI agent** that:

- Understands context
- Decides when to use tools
- Uses web search
- Stores memory per user session

---

## Tech Stack

- LangGraph → workflow control
- Groq → LLM (brain)
- Tavily → web search tool
- MemorySaver → stores chat history
- Node.js readline → CLI interface

---

## How Memory Works

```js
const checkpointer = new MemorySaver();
```

MemorySaver stores all messages in a session.

```js
{
  configurable: {
    thread_id: "1";
  }
}
```

- `thread_id` acts like a session ID
- Same thread → same memory
- Different thread → new conversation

### Example

```
You: My name is Talha
You: What is my name?
AI: Your name is Talha
```

This works because previous messages are stored and reused.

---

## How Web Search Works

```js
const tool = new TavilySearch({
  maxResults: 3,
  topic: "general",
});
```

- Tavily is a search API
- Returns top results from the internet

### Flow

1. User asks a question
2. AI checks if it needs external data
3. If yes → calls Tavily
4. Gets results
5. Generates final answer

---

## LLM Setup (Brain)

```js
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxRetries: 2,
}).bindTools(tools);
```

Key points:

- `temperature: 0` → more accurate, less random
- `bindTools(tools)` → allows AI to use tools

Without binding tools, the agent cannot perform web search.

---

## Agent Function

```js
async function callModel(state) {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}
```

- Takes full conversation history
- Sends it to LLM
- Returns the response

---

## Decision Logic

```js
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}
```

This controls the flow:

- If tool is required → go to tools
- Otherwise → end response

---

## Tool Execution

```js
const toolNode = new ToolNode(tools);
```

- Executes tool calls (like Tavily search)
- Sends results back to the agent

---

## Workflow (Core Concept)

```js
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);
```

### Flow

User → Agent
Agent decides → tool or finish
If tool → run tool → back to agent
Agent → final answer

---

## Compile App

```js
const app = workflow.compile({ checkpointer });
```

This connects:

- Workflow
- Memory system

---

## CLI Loop

```js
while (true) {
  const userInput = await rl.question("You: ");
```

- Reads input from terminal
- Sends to agent
- Prints response

Exit with:

```
/bye
```

---

## Full Execution Flow

1. User sends message
2. Agent receives message
3. Memory is loaded
4. LLM processes input
5. If needed → tool is called
6. Tool returns data
7. Agent generates final response
8. Memory is updated

---

## Important Concepts

### Memory

- Controlled by MemorySaver
- Uses thread_id

### Tools

- Must be defined and bound to LLM

### Workflow

- Controls how agent behaves

### Loop

- Agent ↔ Tools ↔ Agent

---

## Common Mistakes

- Not binding tools to LLM
- Not using thread_id (memory won’t work)
- Incorrect workflow edges
- Ignoring tool_calls logic

---

## Real-World Use Cases

- AI assistants with memory
- Customer support bots
- Research agents
- Developer copilots

---

## Run the App

```bash
node --env-file=.env index.js
```

---

## Final Understanding

This project shows how to build a real AI agent that:

- Uses memory
- Calls tools dynamically
- Follows a structured workflow
