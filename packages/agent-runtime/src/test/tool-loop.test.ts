import assert from "node:assert/strict";
import { actionFromTool, WRITE_TOOLS } from "../llm/tool-loop.js";

assert(WRITE_TOOLS.has("create_task"));
assert(WRITE_TOOLS.has("delete_task"));
assert(!WRITE_TOOLS.has("list_projects"));

const action = actionFromTool(
  "create_task",
  { title: "买牛奶", dueDate: "2026-06-21" },
  { id: "t1", title: "买牛奶" },
);
assert.equal(action?.type, "create");
assert.equal(action?.taskTitle, "买牛奶");
assert.match(action?.detail ?? "", /创建任务/);

const batch = actionFromTool(
  "batch_add_tasks",
  { tasks: [{ title: "子任务 A" }, { title: "子任务 B" }] },
  [{ id: "t2", title: "子任务 A" }, { id: "t3", title: "子任务 B" }],
);
assert.equal(batch?.type, "create");
assert.match(batch?.taskTitle ?? "", /子任务 A/);
assert.match(batch?.detail ?? "", /批量创建 2 个任务/);

assert.equal(actionFromTool("list_projects", {}, {}), null);

console.log("tool-loop.test.ts: all assertions passed");
