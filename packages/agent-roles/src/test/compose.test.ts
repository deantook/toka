import assert from "node:assert/strict";
import {
  composeSystemPrompt,
  getRolePrompt,
  SHARED_WRITE_RULES,
} from "../index.js";

assert.match(getRolePrompt("planner"), /batch_add_tasks/);
assert.match(getRolePrompt("reviewer"), /delete_task/);
assert.doesNotMatch(SHARED_WRITE_RULES, /用户确认/);

const composed = composeSystemPrompt(
  "general",
  "## 上下文\n今日：2026-06-20",
  "## 领域规则\n测试规则",
);
assert.match(composed, /Toka 滴答清单助手/);
assert.match(composed, /## 上下文/);
assert.match(composed, /## 领域规则/);

console.log("compose.test.ts: all assertions passed");
