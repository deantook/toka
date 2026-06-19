import assert from "node:assert/strict";
import { ContextEngine } from "../context/engine.js";
import type { AnalyzerResult } from "../types.js";

const calls: string[] = [];
const mockMcp = {
  callTool: async (name: string) => {
    calls.push(name);
    if (name === "list_projects") return [{ id: "p1", name: "工作" }];
    if (name === "search_task") return [{ id: "t1", title: "买牛奶" }];
    return [];
  },
};

const engine = new ContextEngine(mockMcp as never);
const analysis: AnalyzerResult = {
  intent: "query",
  role: "scheduler",
  entities: { keywords: ["牛奶"] },
  contextNeeded: ["projects", "tasks", "dateRange"],
};

const snap1 = await engine.build(analysis, "今天有什么事");
assert.equal(snap1.projects.length, 1);
assert.ok(snap1.today);

const snap2 = await engine.build(analysis, "今天有什么事");
assert.equal(calls.filter((c) => c === "list_projects").length, 1, "cache hit");

console.log("context.test.ts: all passed");
