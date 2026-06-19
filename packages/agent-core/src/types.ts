export type UserIntent =
  | "create"
  | "update"
  | "schedule"
  | "breakdown"
  | "review"
  | "query";

export type AgentRole = "general" | "planner" | "scheduler" | "reviewer";

export interface AppConfig {
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  dida365Token: string;
  dida365McpUrl?: string;
}

export interface AnalyzerResult {
  intent: UserIntent;
  role: AgentRole;
  entities: {
    projectNames?: string[];
    dateRange?: { start: string; end: string };
    keywords?: string[];
  };
  contextNeeded: Array<"projects" | "tasks" | "dateRange">;
}

export interface ProjectSummary {
  id: string;
  name: string;
  kind?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  projectId?: string;
  startDate?: string;
  dueDate?: string;
  priority?: number;
  status?: number;
  parentId?: string;
  sortOrder?: number;
}

export interface UserSnapshot {
  fetchedAt: number;
  timezone: "Asia/Shanghai";
  today: string;
  projects: ProjectSummary[];
  matchedTasks: TaskSummary[];
  dateRangeTasks: TaskSummary[];
  dateRangeLabel?: string;
}

export const MVP_TOOLS = [
  "list_projects",
  "create_project",
  "update_project",
  "get_project_by_id",
  "get_project_with_undone_tasks",
  "search_task",
  "get_task_by_id",
  "get_task_in_project",
  "create_task",
  "batch_add_tasks",
  "update_task",
  "batch_update_tasks",
  "complete_task",
  "complete_tasks_in_project",
  "delete_task",
  "move_task",
  "filter_tasks",
  "list_undone_tasks_by_date",
  "list_undone_tasks_by_time_query",
  "list_completed_tasks_by_date",
  "get_user_preference",
  "list_columns",
] as const;

export type MvpToolName = (typeof MVP_TOOLS)[number];

export interface AppliedAction {
  type: "create" | "update" | "complete" | "delete" | "move";
  taskTitle: string;
  detail: string;
}

export type SseEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string; result: unknown }
  | {
      type: "mcp_call";
      name: string;
      mcpUrl: string;
      request: { method: "tools/call"; name: string; arguments: Record<string, unknown> };
      response?: { raw: unknown; parsed: unknown };
      error?: string;
      durationMs: number;
    }
  | { type: "actions_applied"; actions: AppliedAction[] }
  | { type: "done"; message: string }
  | { type: "error"; message: string };
