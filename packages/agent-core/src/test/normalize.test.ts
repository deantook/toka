import assert from "node:assert/strict";
import {
  normalizeToolArguments,
  normalizeToolListResult,
  parseMcpToolContent,
} from "../mcp/normalize.js";

const listProjectsRaw = [
  {
    type: "text",
    text: JSON.stringify({ id: "p1", name: "新职伤", kind: "TASK" }),
  },
  {
    type: "text",
    text: JSON.stringify({ id: "p2", name: "电影", kind: "TASK" }),
  },
  {
    type: "text",
    text: JSON.stringify({ id: "inbox", name: "Inbox", kind: "TASK" }),
  },
];

const parsedList = parseMcpToolContent(listProjectsRaw);
assert.ok(Array.isArray(parsedList), "multiple text blocks should parse to array");
assert.equal((parsedList as unknown[]).length, 3);
assert.deepEqual((parsedList as { name: string }[])[0], {
  id: "p1",
  name: "新职伤",
  kind: "TASK",
});

const singleTask = parseMcpToolContent([
  { type: "text", text: JSON.stringify({ id: "t1", title: "买牛奶" }) },
]);
assert.equal(typeof singleTask, "object");
assert.equal((singleTask as { title: string }).title, "买牛奶");

const normalized = normalizeToolListResult(parsedList);
assert.equal(normalized.length, 3);

const emptyFromSingleBeforeFix = normalizeToolListResult({
  id: "p1",
  name: "only one",
});
assert.equal(emptyFromSingleBeforeFix.length, 0);

assert.deepEqual(normalizeToolArguments("search_task", { keyword: "待追" }), {
  query: "待追",
});
assert.deepEqual(
  normalizeToolArguments("search_task", { query: "买牛奶" }),
  { query: "买牛奶" },
);

console.log("normalize.test.ts: all passed");
