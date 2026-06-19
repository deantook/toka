import { useState } from "react";
import type { SessionMeta } from "../../types";

interface Props {
  sessions: SessionMeta[];
  currentSessionId: string;
  streaming: boolean;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
  onClearAll: () => Promise<boolean>;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

export function ChatHistorySidebar({
  sessions,
  currentSessionId,
  streaming,
  onSelect,
  onNew,
  onDelete,
  onClearAll,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleConfirmClear = async () => {
    setClearing(true);
    const ok = await onClearAll();
    setClearing(false);
    if (ok) {
      setConfirmClear(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="shrink-0 border-b border-[#e0e0dc]">
        {confirmClear ? (
          <div className="px-3 py-2.5 bg-[#faf6ed]">
            <p className="text-[12px] text-[#5c4a2a] leading-snug">
              清除全部记录？不可恢复。
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={handleConfirmClear}
                disabled={streaming || clearing}
                className="text-[12px] text-[#1c1c1a] disabled:opacity-40"
              >
                {clearing ? "清除中…" : "确认"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                disabled={clearing}
                className="text-[12px] text-[#aaa] hover:text-[#5c5c58] disabled:opacity-40"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center px-3 py-2.5 ${
              sessions.length > 0 ? "justify-between" : "justify-end"
            }`}
          >
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={streaming}
                className="text-[12px] text-[#aaa] hover:text-[#5c5c58] disabled:opacity-40 transition-colors"
              >
                清除全部
              </button>
            )}
            <button
              type="button"
              onClick={onNew}
              disabled={streaming}
              className="text-[12px] text-[#5c5c58] hover:text-[#1c1c1a] disabled:opacity-40 transition-colors"
            >
              + 新建
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.length === 0 ? (
          <p className="text-[#aaa] text-[12px] px-3 py-6">暂无记录</p>
        ) : (
          <ul>
            {sessions.map((session) => {
              const active = session.id === currentSessionId;
              return (
                <li key={session.id}>
                  <div
                    className={`group flex items-center border-l-2 transition-colors ${
                      active
                        ? "border-[#1c1c1a] bg-[#e8e8e4]"
                        : "border-transparent hover:bg-[#e8e8e4]/60"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      className="flex-1 min-w-0 text-left px-3 py-2"
                    >
                      <p
                        className={`text-[13px] truncate leading-snug ${
                          active ? "text-[#1c1c1a]" : "text-[#3d3d3a]"
                        }`}
                      >
                        {session.title}
                      </p>
                      <p className="text-[11px] text-[#aaa] mt-0.5">
                        {formatTime(session.updatedAt)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(session.id)}
                      className="shrink-0 pr-2 pl-1 py-2 text-[#ccc] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
