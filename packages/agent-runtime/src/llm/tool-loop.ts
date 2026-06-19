import type OpenAI from "openai";
import type {
  AppliedAction,
  AppConfig,
  Dida365McpClient,
  SseEvent,
} from "@toka/agent-core";
import { createLlmClient } from "./client.js";

export const WRITE_TOOLS = new Set([
  "create_task",
  "batch_add_tasks",
  "update_task",
  "batch_update_tasks",
  "complete_task",
  "delete_task",
  "move_task",
  "create_project",
]);

const ACTION_TYPE_BY_TOOL: Record<string, AppliedAction["type"]> = {
  create_task: "create",
  batch_add_tasks: "create",
  create_project: "create",
  update_task: "update",
  batch_update_tasks: "update",
  complete_task: "complete",
  delete_task: "delete",
  move_task: "move",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function titleFromRecord(record: Record<string, unknown>): string | undefined {
  return asString(record.title) ?? asString(record.name) ?? asString(record.projectName);
}

function taskTitleFrom(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
): string {
  if (toolName === "create_project") {
    return asString(args.name) ?? titleFromRecord(asRecord(result) ?? {}) ?? "新项目";
  }

  const direct = asString(args.title) ?? asString(args.name);
  if (direct) return direct;

  if (toolName === "batch_add_tasks" || toolName === "batch_update_tasks") {
    const tasks = args.tasks;
    if (Array.isArray(tasks) && tasks.length > 0) {
      const first = asRecord(tasks[0]);
      const firstTitle = first ? titleFromRecord(first) : undefined;
      if (firstTitle) {
        return tasks.length > 1 ? `${firstTitle} 等 ${tasks.length} 项` : firstTitle;
      }
      return `批量操作 ${tasks.length} 项`;
    }
  }

  const resultRecord = asRecord(result);
  if (resultRecord) {
    const fromResult = titleFromRecord(resultRecord);
    if (fromResult) return fromResult;
  }

  if (Array.isArray(result) && result.length > 0) {
    const first = asRecord(result[0]);
    const fromFirst = first ? titleFromRecord(first) : undefined;
    if (fromFirst) {
      return result.length > 1 ? `${fromFirst} 等 ${result.length} 项` : fromFirst;
    }
  }

  return asString(args.taskId) ?? asString(args.projectId) ?? "未知任务";
}

function detailFrom(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
): string {
  switch (toolName) {
    case "create_task": {
      const parts = ["创建任务"];
      const dueDate = asString(args.dueDate) ?? asString(args.startDate);
      if (dueDate) parts.push(`截止 ${dueDate}`);
      const priority = args.priority;
      if (typeof priority === "number") parts.push(`优先级 ${priority}`);
      return parts.join("，");
    }
    case "batch_add_tasks": {
      const tasks = args.tasks;
      const count = Array.isArray(tasks) ? tasks.length : 1;
      return `批量创建 ${count} 个任务`;
    }
    case "create_project":
      return `创建清单「${taskTitleFrom(toolName, args, result)}」`;
    case "update_task": {
      const changes: string[] = [];
      for (const key of ["title", "dueDate", "startDate", "priority", "content"]) {
        const value = args[key];
        if (value !== undefined && value !== null && value !== "") {
          changes.push(`${key}=${String(value)}`);
        }
      }
      return changes.length > 0 ? `更新：${changes.join("，")}` : "更新任务";
    }
    case "batch_update_tasks": {
      const tasks = args.tasks;
      const count = Array.isArray(tasks) ? tasks.length : 1;
      return `批量更新 ${count} 个任务`;
    }
    case "complete_task":
      return "标记完成";
    case "delete_task":
      return "已删除";
    case "move_task": {
      const target = asString(args.projectId) ?? asString(args.projectName);
      return target ? `移动到 ${target}` : "移动任务";
    }
    default:
      return toolName;
  }
}

export function actionFromTool(
  name: string,
  args: Record<string, unknown>,
  result: unknown,
): AppliedAction | null {
  if (!WRITE_TOOLS.has(name)) return null;

  const type = ACTION_TYPE_BY_TOOL[name];
  if (!type) return null;

  return {
    type,
    taskTitle: taskTitleFrom(name, args, result),
    detail: detailFrom(name, args, result),
  };
}

function isToolFailure(result: unknown): boolean {
  const record = asRecord(result);
  return record != null && "error" in record && record.error != null;
}

export interface ToolLoopOptions {
  config: AppConfig;
  mcp: Dida365McpClient;
  systemPrompt: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  onEvent: (event: SseEvent) => void;
  toolNames?: string[];
}

export async function runToolLoop(
  options: ToolLoopOptions,
): Promise<{ content: string; actions: AppliedAction[] }> {
  const client = createLlmClient(options.config);
  const tools = options.toolNames
    ? options.mcp.filterOpenAiTools(options.toolNames)
    : options.mcp.getOpenAiTools();
  const actions: AppliedAction[] = [];
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: options.systemPrompt },
    ...options.messages,
  ];

  let iterations = 0;
  const maxIterations = 12;
  let consecutiveFailures = 0;

  while (iterations < maxIterations) {
    iterations += 1;

    const stream = await client.chat.completions.create({
      model: options.config.llmModel,
      messages,
      tools: tools.length > 0 ? (tools as unknown as OpenAI.Chat.ChatCompletionTool[]) : undefined,
      stream: true,
    });

    let assistantContent = "";
    const toolCalls = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        assistantContent += delta.content;
        options.onEvent({ type: "text_delta", delta: delta.content });
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCalls.has(idx)) {
            toolCalls.set(idx, {
              id: tc.id ?? `call_${idx}`,
              name: tc.function?.name ?? "",
              arguments: tc.function?.arguments ?? "",
            });
          } else {
            const existing = toolCalls.get(idx)!;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          }
        }
      }
    }

    if (toolCalls.size === 0) {
      return { content: assistantContent, actions };
    }

    const formattedToolCalls = Array.from(toolCalls.values()).map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: { name: tc.name, arguments: tc.arguments },
    }));

    messages.push({
      role: "assistant",
      content: assistantContent || null,
      tool_calls: formattedToolCalls,
    });

    for (const tc of formattedToolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        args = {};
      }

      options.onEvent({ type: "tool_start", name: tc.function.name, args });

      let toolResult: unknown;
      let failed = false;

      try {
        toolResult = await options.mcp.callTool(tc.function.name, args);
        options.onEvent({
          type: "tool_end",
          name: tc.function.name,
          result: toolResult,
        });
      } catch (err) {
        failed = true;
        const message = err instanceof Error ? err.message : String(err);
        toolResult = { error: message };
        options.onEvent({
          type: "tool_end",
          name: tc.function.name,
          result: toolResult,
        });
      }

      if (failed || isToolFailure(toolResult)) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= 3) {
          return {
            content: "连续 3 次工具调用失败，已中止。请检查网络或 Token 配置后重试。",
            actions,
          };
        }
      } else {
        consecutiveFailures = 0;
        const action = actionFromTool(tc.function.name, args, toolResult);
        if (action) actions.push(action);
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return {
    content: "已达到最大工具调用次数，请简化请求后重试。",
    actions,
  };
}

export async function runSimpleCompletion(
  config: AppConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = createLlmClient(config);
  const response = await client.chat.completions.create({
    model: config.llmModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });
  return response.choices[0]?.message?.content ?? "{}";
}
