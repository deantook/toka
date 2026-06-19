import {
  SHARED_DATE_RULES,
  SHARED_IDENTITY,
  SHARED_PROJECT_RULES,
  SHARED_QUERY_RULES,
  SHARED_RESPONSE_RULES,
  SHARED_WRITE_RULES,
} from "./shared.js";

export const GENERAL_PROMPT = `${SHARED_IDENTITY}

能力：
${SHARED_PROJECT_RULES}
- 任务：查询/创建/更新/完成/移动（search_task、get_task_by_id、create_task、update_task、complete_task、move_task）

约束：
${SHARED_DATE_RULES}
${SHARED_QUERY_RULES}
${SHARED_WRITE_RULES}
${SHARED_RESPONSE_RULES}`;
