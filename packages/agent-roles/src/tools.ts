import type { AgentRole } from "@toka/agent-core";

const GENERAL_TOOLS = [
  "list_projects",
  "search_task",
  "get_task_by_id",
  "create_task",
  "update_task",
  "complete_task",
  "move_task",
  "get_project_with_undone_tasks",
  "get_user_preference",
] as const;

export const ROLE_TOOLS: Record<AgentRole, readonly string[]> = {
  general: GENERAL_TOOLS,
  planner: [...GENERAL_TOOLS, "create_project", "batch_add_tasks"],
  scheduler: [
    ...GENERAL_TOOLS,
    "list_undone_tasks_by_date",
    "list_undone_tasks_by_time_query",
    "filter_tasks",
    "batch_update_tasks",
  ],
  reviewer: [
    ...GENERAL_TOOLS,
    "list_undone_tasks_by_date",
    "list_undone_tasks_by_time_query",
    "filter_tasks",
    "batch_update_tasks",
    "delete_task",
    "list_completed_tasks_by_date",
  ],
};
