import assert from "node:assert/strict";
import type { AppConfig } from "@toka/agent-core";
import {
  analyzeIntent,
  inferIntentHeuristic,
  inferRoleHeuristic,
  isTaskListQuery,
} from "../pipeline/analyzer.js";
import { MemoryConversationStore } from "../store/memory.js";
import { AgentPipeline } from "../pipeline/pipeline.js";

assert(isTaskListQuery("今天做什么"), "today task list query");
assert(isTaskListQuery("我今天有哪些任务"), "explicit task list query");
assert(!isTaskListQuery("帮我创建一个任务"), "create is not a list query");

assert.equal(inferIntentHeuristic("帮我拆解这个项目"), "breakdown");
assert.equal(inferIntentHeuristic("安排一下本周日程"), "schedule");
assert.equal(inferIntentHeuristic("清理过期任务"), "review");
assert.equal(inferIntentHeuristic("添加一个待办"), "create");
assert.equal(inferIntentHeuristic("标记完成"), "update");
assert.equal(inferIntentHeuristic("今天做什么"), "query");
assert.equal(inferIntentHeuristic("随便聊聊"), "query");

assert.equal(inferRoleHeuristic("拆解成子任务"), "planner");
assert.equal(inferRoleHeuristic("今天有哪些待办"), "scheduler");
assert.equal(inferRoleHeuristic("回顾过期任务"), "reviewer");
assert.equal(inferRoleHeuristic("创建任务"), "general");

const emptyConfig: AppConfig = {
  llmBaseUrl: "http://127.0.0.1:1",
  llmApiKey: "",
  llmModel: "test",
  dida365Token: "",
};

const fallback = await analyzeIntent(emptyConfig, "今天做什么");
assert.equal(fallback.intent, "query");
assert.equal(fallback.role, "scheduler");
assert.deepEqual(fallback.contextNeeded, ["projects", "dateRange"]);

const store = new MemoryConversationStore();
store.appendMessage("s1", { role: "user", content: "hi" });
assert.equal(store.getMessages("s1").length, 1);
store.clear("s1");
assert.equal(store.getMessages("s1").length, 0);

const mockMcp = {
  updateConfig: () => {},
  connect: async () => {},
  setCallObserver: () => {},
  callTool: async () => [],
  filterOpenAiTools: () => [],
  getOpenAiTools: () => [],
};

const pipeline = new AgentPipeline(emptyConfig, mockMcp as never, store);
const events: Array<{ type: string; message?: string }> = [];
await pipeline.run("s2", "hello", (event) => {
  events.push(event);
});
assert.equal(events.length, 1);
assert.equal(events[0]?.type, "error");
assert.match(events[0]?.message ?? "", /LLM API Key/);

console.log("pipeline.test.ts: all assertions passed");
