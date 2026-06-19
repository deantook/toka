import {
  addLocalDays,
  startOfLocalDay,
  toLocalDayEndExclusiveISO,
  toLocalDayStartISO,
} from "../datetime.js";
import { normalizeToolListResult } from "./normalize.js";

/** Query undone tasks in chunks of max 14 days (API limit). */
export async function fetchUndoneTasksInRange(
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>,
  start: Date,
  end: Date,
  projectIds?: string[],
): Promise<unknown[]> {
  const results: unknown[] = [];
  let cursor = startOfLocalDay(start);
  const endDay = startOfLocalDay(end);

  while (cursor <= endDay) {
    const chunkEnd = addLocalDays(cursor, 13);
    const actualEnd = chunkEnd > endDay ? endDay : chunkEnd;
    const response = await callTool("list_undone_tasks_by_date", {
      search: {
        startDate: toLocalDayStartISO(cursor),
        endDate: toLocalDayEndExclusiveISO(actualEnd),
        projectIds: projectIds ?? null,
      },
    });
    results.push(...normalizeToolListResult(response));
    cursor = addLocalDays(actualEnd, 1);
  }

  return results;
}
