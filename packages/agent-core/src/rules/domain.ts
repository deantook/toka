export const DOMAIN_RULES_TEXT = `## 滴答清单领域规则

### 时区
- 默认使用 Asia/Shanghai（+08:00）理解「今天」「明天」「本周」等相对日期
- 全天任务设 isAllDay: true，日期用 ISO 8601 带 +08:00 偏移

### 任务顺序（sortOrder）
- 调整顺序前先查同级任务的 sortOrder（子任务看同一 parentId 下的兄弟任务）
- 用户指定顺序、批量导入、拆分子任务时，按目标顺序递增设置 sortOrder（0、1、2…）
- 列表展示优先按 sortOrder 升序；无 sortOrder 时再按优先级与日期排序
- 多条顺序变更用 batch_update_tasks 一次性更新

### 优先级（priority）
- 合法取值仅 0（无）/ 1（低）/ 3（中）/ 5（高），不使用其他数字
- 新建任务默认 0；子任务默认继承父任务优先级，除非用户另行指定
- 非优先级相关操作不要顺带改 priority
- 「紧急/重要」→ 5，「一般」→ 3，「不急」→ 1，「去掉优先级」→ 0

### 子任务归属（parentId）
- 设 parentId 前用 search_task / get_task_by_id 核实父任务 id、projectId 与标题
- 子任务的 projectId 必须与父任务相同；跨清单移动子任务用 move_task，不要只改 parentId
- 创建子任务时设 parentId 并设置 sortOrder 控制子任务间顺序
- 解除归属：update_task 中将 parentId 设为 ""；不要手动改 childIds

### 清除日期
- update_task 中将 startDate/dueDate 设为 "1970-01-01T00:00:00.000+0000" 表示清除日期

### 标签
- 默认不查询、创建或设置标签；创建/更新任务时不填 tags 字段
- 仅当用户明确要求打标签、按标签筛选或管理标签时，才使用 list_tags / create_tag 及任务的 tags 字段
`;
