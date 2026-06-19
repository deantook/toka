import assert from "node:assert/strict";
import {
  DEFAULT_TIMEZONE,
  addLocalDays,
  localDateString,
  resolveDateRangeFromMessage,
  startOfLocalDay,
} from "../datetime.js";

assert.equal(DEFAULT_TIMEZONE, "Asia/Shanghai");

const todayRange = resolveDateRangeFromMessage("今天有什么事");
assert.ok(todayRange);
assert.equal(localDateString(todayRange!.start), localDateString(new Date()));

const weekRange = resolveDateRangeFromMessage("本周待办");
assert.ok(weekRange);
assert.ok(weekRange!.end.getTime() >= weekRange!.start.getTime());

const d = startOfLocalDay(new Date("2026-06-20T15:30:00+08:00"));
assert.match(d.toISOString(), /2026-06-19|T20:00:00\.000Z|2026-06-20/);

const next = addLocalDays(d, 1);
assert.ok(next.getTime() > d.getTime());

console.log("datetime.test.ts: all passed");
