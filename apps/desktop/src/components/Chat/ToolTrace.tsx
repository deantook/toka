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
            className="border border-[#e8e8e4] bg-[#fafaf8] text-[11px]"
            open={defaultOpen}
          >
            <summary className="cursor-pointer px-2.5 py-1.5 flex items-center gap-2">
              <span className="px-1 py-0.5 text-[10px] font-medium text-[#5c5c58] bg-[#f0f0ec] border border-[#dcdcd8]">
                工具
              </span>
              <span className="text-[#3d3d3a]">{tc.name}</span>
              {hasResult && (
                <span className="text-[10px] text-[#8a8a86]">已完成</span>
              )}
            </summary>
            <div className="px-2.5 pb-2 space-y-1.5 border-t border-[#e8e8e4] pt-1.5">
              {tc.args && (
                <div>
                  <p className="text-[10px] text-[#8a8a86] mb-0.5">参数</p>
                  <pre className="overflow-x-auto text-[10px] font-mono whitespace-pre-wrap text-[#3d3d3a] bg-white border border-[#e8e8e4] px-2 py-1">
                    {JSON.stringify(tc.args, null, 2)}
                  </pre>
                </div>
              )}
              {hasResult && (
                <div>
                  <p className="text-[10px] text-[#8a8a86] mb-0.5">结果</p>
                  <pre className="overflow-x-auto text-[10px] font-mono max-h-32 whitespace-pre-wrap text-[#3d3d3a] bg-white border border-[#e8e8e4] px-2 py-1">
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
