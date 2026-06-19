interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface Props {
  toolCalls: ToolCall[];
  defaultOpen?: boolean;
}

export function ToolTrace({ toolCalls, defaultOpen = false }: Props) {
  if (!toolCalls.length) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {toolCalls.map((tc, j) => {
        const hasResult = tc.result !== undefined;
        return (
          <details
            key={`${tc.name}-${j}`}
            className="rounded-lg border border-slate-200/80 bg-slate-50/80 text-xs"
            open={defaultOpen}
          >
            <summary className="cursor-pointer px-2.5 py-1.5 flex items-center gap-2">
              <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                工具
              </span>
              <span className="font-medium text-slate-700">{tc.name}</span>
              {hasResult && (
                <span className="text-[10px] text-emerald-600">已完成</span>
              )}
            </summary>
            <div className="px-2.5 pb-2 space-y-1.5 border-t border-slate-200/60 pt-1.5">
              {tc.args && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">参数</p>
                  <pre className="overflow-x-auto text-[10px] whitespace-pre-wrap text-slate-600">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                </div>
              )}
              {hasResult && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-0.5">结果</p>
                  <pre className="overflow-x-auto text-[10px] max-h-32 whitespace-pre-wrap text-slate-600">
                    {JSON.stringify(tc.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
