import type { AnalyzerResult, AppConfig, UserIntent } from "@toka/agent-core";
import { formatPromptDateTime } from "@toka/agent-core";
import {
  ANALYZER_PROMPT,
  buildAnalyzerUserPrompt,
} from "@toka/agent-roles";
import { runSimpleCompletion } from "../llm/tool-loop.js";

/** Detect user messages that ask for a task list (today / date range / todos). */
export function isTaskListQuery(message: string): boolean {
  const asksTasks =
    /哪些任务|有什么任务|什么任务|任务有哪些|待办|todo|to-do|做什么|有什么事|有什么安排|有哪些事|列一下|列出|查一下|查询/.test(
      message,
    );
  const hasDate =
    /今天|今日|明天|后天|本周|这周|这周内|本日/.test(message);
  return asksTasks || (hasDate && /任务|待办|安排|做什么/.test(message));
}

export function inferIntentHeuristic(msg: string): UserIntent {
  if (/拆解|分解|规划|子任务|拆分/.test(msg)) return "breakdown";
  if (/日程|安排|schedule/.test(msg)) return "schedule";
  if (/回顾|清理|过期|review/.test(msg)) return "review";
  if (/创建|添加|新建|create/.test(msg)) return "create";
  if (/完成|更新|修改|删除/.test(msg)) return "update";
  if (isTaskListQuery(msg)) return "query";
  return "query";
}

export function inferRoleHeuristic(msg: string): AnalyzerResult["role"] {
  if (/拆解|分解|规划|子任务/.test(msg)) return "planner";
  if (/日程|安排|今天|本周|哪些任务|待办|做什么/.test(msg)) return "scheduler";
  if (/回顾|清理|过期/.test(msg)) return "reviewer";
  return "general";
}

function heuristicResult(userMessage: string): AnalyzerResult {
  return {
    intent: inferIntentHeuristic(userMessage),
    role: inferRoleHeuristic(userMessage),
    entities: {},
    contextNeeded: isTaskListQuery(userMessage)
      ? ["projects", "dateRange"]
      : ["projects"],
  };
}

export async function analyzeIntent(
  config: AppConfig,
  userMessage: string,
): Promise<AnalyzerResult> {
  try {
    const raw = await runSimpleCompletion(
      config,
      ANALYZER_PROMPT,
      buildAnalyzerUserPrompt(userMessage, formatPromptDateTime()),
    );
    const parsed = JSON.parse(raw) as Partial<AnalyzerResult>;
    const result: AnalyzerResult = {
      intent: (parsed.intent as UserIntent) ?? "query",
      role: parsed.role ?? "general",
      entities: parsed.entities ?? {},
      contextNeeded: parsed.contextNeeded ?? ["projects"],
    };
    if (isTaskListQuery(userMessage)) {
      if (!result.contextNeeded.includes("dateRange")) {
        result.contextNeeded = [...result.contextNeeded, "dateRange"];
      }
      if (result.intent === "query" && result.role === "general") {
        result.role = "scheduler";
      }
    }
    return result;
  } catch {
    return heuristicResult(userMessage);
  }
}
