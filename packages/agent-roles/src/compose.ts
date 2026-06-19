import type { AgentRole } from "@toka/agent-core";
import { ANALYZER_PROMPT } from "./prompts/analyzer.js";
import { GENERAL_PROMPT } from "./prompts/general.js";
import { PLANNER_PROMPT } from "./prompts/planner.js";
import { REVIEWER_PROMPT } from "./prompts/reviewer.js";
import { SCHEDULER_PROMPT } from "./prompts/scheduler.js";

const ROLE_PROMPTS: Record<AgentRole, string> = {
  general: GENERAL_PROMPT,
  planner: PLANNER_PROMPT,
  scheduler: SCHEDULER_PROMPT,
  reviewer: REVIEWER_PROMPT,
};

export function getRolePrompt(role: AgentRole): string {
  return ROLE_PROMPTS[role] ?? ROLE_PROMPTS.general;
}

export function composeSystemPrompt(
  role: AgentRole,
  contextPrompt: string,
  domainRules: string,
): string {
  return `${getRolePrompt(role)}\n\n${contextPrompt}\n\n${domainRules}`;
}

export function buildAnalyzerUserPrompt(
  userMessage: string,
  nowLabel: string,
): string {
  return `用户消息：${userMessage}\n当前日期时间（Asia/Shanghai）：${nowLabel}`;
}

export { ANALYZER_PROMPT };
