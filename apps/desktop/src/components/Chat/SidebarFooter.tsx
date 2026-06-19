interface SidebarFooterProps {
  collapsed: boolean;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function SidebarFooter({
  collapsed,
  onOpenSettings,
  onToggleSidebar,
}: SidebarFooterProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-[#e0e0dc] bg-[#f0f0ec]">
      <button
        type="button"
        onClick={onOpenSettings}
        className="text-[12px] text-[#aaa] hover:text-[#5c5c58] transition-colors"
        aria-label="设置"
        title="设置"
      >
        {collapsed ? "设" : "设置"}
      </button>
      <button
        type="button"
        onClick={onToggleSidebar}
        className="text-[12px] text-[#aaa] hover:text-[#5c5c58] transition-colors px-0.5"
        aria-label={collapsed ? "展开侧栏" : "折叠侧栏"}
        title={collapsed ? "展开侧栏" : "折叠侧栏"}
      >
        {collapsed ? "»" : "«"}
      </button>
    </div>
  );
}
