import {
  addLocalDays,
  DEFAULT_TIMEZONE,
  formatPromptDateTime,
  localDateString,
  resolveDateRangeFromMessage,
  startOfLocalDay,
} from "../datetime.js";
import type { Dida365McpClient } from "../mcp/client.js";
import { fetchUndoneTasksInRange } from "../mcp/task-fetch.js";
import { normalizeToolListResult } from "../mcp/normalize.js";
import type {
  AnalyzerResult,
  ProjectSummary,
  TaskSummary,
  UserSnapshot,
} from "../types.js";

function isTaskListQuery(message: string): boolean {
  return /今天|今日|明天|后天|本周|这周|有什么事|待办|任务/.test(message);
}

export class ContextEngine {
  private cache: { key: string; snapshot: UserSnapshot; expires: number } | null =
    null;
  private TTL_MS = 60_000;

  constructor(private mcp: Dida365McpClient) {}

  async build(
    analysis: AnalyzerResult,
    userMessage: string,
  ): Promise<UserSnapshot> {
    const cacheKey = JSON.stringify({ analysis, userMessage });
    if (
      this.cache &&
      this.cache.key === cacheKey &&
      Date.now() < this.cache.expires
    ) {
      return this.cache.snapshot;
    }

    const needed = new Set(analysis.contextNeeded);
    if (isTaskListQuery(userMessage)) {
      needed.add("dateRange");
    }

    let projects: ProjectSummary[] = [];
    if (needed.has("projects") || needed.size === 0) {
      try {
        const result = await this.mcp.callTool("list_projects", {});
        projects = normalizeToolListResult(result) as ProjectSummary[];
      } catch {
        projects = [];
      }
    }

    let matchedTasks: TaskSummary[] = [];
    if (needed.has("tasks") || analysis.entities.keywords?.length) {
      try {
        const keyword = analysis.entities.keywords?.[0];
        if (keyword) {
          const found = await this.mcp.callTool("search_task", { keyword });
          matchedTasks = normalizeToolListResult(found) as TaskSummary[];
        } else {
          const filter = await this.mcp.callTool("filter_tasks", {
            filter: { status: [0] },
          });
          matchedTasks = normalizeToolListResult(filter).slice(
            0,
            30,
          ) as TaskSummary[];
        }
      } catch {
        matchedTasks = [];
      }
    }

    let dateRangeTasks: TaskSummary[] = [];
    let dateRangeLabel: string | undefined;

    const needsDateRange =
      needed.has("dateRange") ||
      ["schedule", "review", "query"].includes(analysis.intent) ||
      isTaskListQuery(userMessage) ||
      /今天|今日|明天|后天|本周|这周/.test(userMessage);

    if (needsDateRange) {
      const fromMessage = resolveDateRangeFromMessage(userMessage);
      let start: Date;
      let end: Date;
      let label: string | undefined;

      if (fromMessage) {
        ({ start, end, label } = fromMessage);
      } else if (analysis.entities.dateRange?.start) {
        start = new Date(analysis.entities.dateRange.start);
        end = analysis.entities.dateRange.end
          ? new Date(analysis.entities.dateRange.end)
          : addLocalDays(start, 7);
        label = `${localDateString(start)} ~ ${localDateString(end)}`;
      } else {
        start = startOfLocalDay(new Date());
        end = addLocalDays(start, 7);
        label = `未来 7 天 (${localDateString(start)} ~ ${localDateString(end)})`;
      }

      dateRangeLabel = label;

      try {
        dateRangeTasks = (await fetchUndoneTasksInRange(
          (name, args) => this.mcp.callTool(name, args),
          start,
          end,
        )) as TaskSummary[];
      } catch {
        dateRangeTasks = [];
      }
    }

    const snapshot: UserSnapshot = {
      fetchedAt: Date.now(),
      timezone: "Asia/Shanghai",
      today: localDateString(new Date()),
      projects,
      matchedTasks,
      dateRangeTasks,
      dateRangeLabel,
    };

    this.cache = {
      key: cacheKey,
      snapshot,
      expires: Date.now() + this.TTL_MS,
    };

    return snapshot;
  }

  snapshotToPrompt(snapshot: UserSnapshot, analysis: AnalyzerResult): string {
    const nowLabel = formatPromptDateTime();
    const parts: string[] = [
      `## 当前日期时间（${DEFAULT_TIMEZONE}）`,
      nowLabel,
      `今日日期：${snapshot.today}`,
      "",
      "**重要**：用户说「今天」「今日」时，指的是上述「今日日期」，不要使用 UTC 日期。",
      `意图: ${analysis.intent}`,
    ];

    if (snapshot.dateRangeLabel) {
      parts.push(`查询范围: ${snapshot.dateRangeLabel}`);
    }

    if (snapshot.projects.length) {
      parts.push(`### 项目 (${snapshot.projects.length})`);
      parts.push(JSON.stringify(snapshot.projects.slice(0, 20), null, 2));
    }

    if (snapshot.matchedTasks.length) {
      parts.push(`### 相关任务 (${snapshot.matchedTasks.length})`);
      parts.push(JSON.stringify(snapshot.matchedTasks.slice(0, 20), null, 2));
    }

    if (snapshot.dateRangeTasks.length) {
      const heading = snapshot.dateRangeLabel
        ? `### ${snapshot.dateRangeLabel} 未完成任务 (${snapshot.dateRangeTasks.length})`
        : `### 日期范围内未完成任务 (${snapshot.dateRangeTasks.length})`;
      parts.push(heading);
      parts.push(JSON.stringify(snapshot.dateRangeTasks.slice(0, 30), null, 2));
    } else if (snapshot.dateRangeLabel) {
      parts.push(`### ${snapshot.dateRangeLabel} 预取任务 (0)`);
      parts.push(
        "（系统预取未返回任务；回答用户前仍须调用 list_undone_tasks_by_date 核实，不可直接断言无任务）",
      );
    }

    return parts.join("\n\n");
  }
}
