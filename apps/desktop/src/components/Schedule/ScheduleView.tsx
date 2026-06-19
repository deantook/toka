import { useCallback, useEffect, useState } from "react";
import type { ScheduleTask } from "../../types";
import { TaskList } from "./TaskList";

type Range = "today" | "week";

interface Props {
  agentUrl: string;
  refreshKey: number;
  onTaskClick: (task: { id: string; title: string }) => void;
}

export function ScheduleView({ agentUrl, refreshKey, onTaskClick }: Props) {
  const [range, setRange] = useState<Range>("today");
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${agentUrl}/api/tasks?range=${range}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `请求失败 (${res.status})`);
      }
      const data = (await res.json()) as { tasks: ScheduleTask[] };
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [agentUrl, range]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshKey]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">日程</h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(
            [
              ["today", "今日"],
              ["week", "本周"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === id
                  ? "bg-white text-indigo-600 shadow-sm font-medium"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {loading && (
          <p className="text-slate-400 text-sm text-center py-8">加载中...</p>
        )}
        {!loading && error && (
          <div className="text-center py-8">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              type="button"
              onClick={fetchTasks}
              className="text-xs text-indigo-600 hover:underline"
            >
              重试
            </button>
          </div>
        )}
        {!loading && !error && (
          <TaskList
            tasks={tasks}
            onTaskClick={onTaskClick}
          />
        )}
      </div>
    </div>
  );
}
