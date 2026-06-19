import type { ScheduleTask } from "../../types";

interface Props {
  tasks: ScheduleTask[];
  onTaskClick: (task: { id: string; title: string }) => void;
}

const PRIORITY_LABELS: Record<number, { label: string; className: string }> = {
  5: { label: "高", className: "bg-red-100 text-red-700" },
  3: { label: "中", className: "bg-amber-100 text-amber-700" },
  1: { label: "低", className: "bg-sky-100 text-sky-700" },
  0: { label: "", className: "" },
};

function formatDate(date?: string): string | null {
  if (!date) return null;
  const d = date.slice(0, 10);
  if (d.length < 10) return date;
  const today = new Date().toISOString().slice(0, 10);
  if (d === today) return "今天";
  return d.slice(5);
}

function sortTasks(tasks: ScheduleTask[]): ScheduleTask[] {
  return [...tasks].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pb !== pa) return pb - pa;
    const da = a.startDate ?? a.dueDate ?? "";
    const db = b.startDate ?? b.dueDate ?? "";
    return da.localeCompare(db);
  });
}

export function TaskList({ tasks, onTaskClick }: Props) {
  const sorted = sortTasks(tasks);

  if (sorted.length === 0) {
    return (
      <p className="text-slate-400 text-sm text-center py-8">暂无待办任务</p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map((task) => {
        const priority = PRIORITY_LABELS[task.priority ?? 0];
        const dateLabel = formatDate(task.startDate ?? task.dueDate);

        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onTaskClick({ id: task.id, title: task.title })}
              className="w-full text-left rounded-lg border border-slate-100 px-3 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {dateLabel && (
                      <span className="text-xs text-slate-400">{dateLabel}</span>
                    )}
                    {task.projectId && (
                      <span className="text-xs text-slate-400 truncate max-w-[120px]">
                        {task.projectId.slice(0, 8)}…
                      </span>
                    )}
                    {priority?.label && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
