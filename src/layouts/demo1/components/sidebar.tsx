import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { Kbd } from '@/components/ui/kbd';
import { MOD_KEY } from '@/lib/keyboard';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';

export const SIDEBAR_GRADIENT =
  'bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-deep)_100%)]';

export function Sidebar() {
  const { settings, storeOption } = useSettings();
  const collapsed = settings.layouts.demo1.sidebarCollapse;

  const toggleCollapse = () => {
    storeOption('layouts.demo1.sidebarCollapse', !collapsed);
  };

  return (
    <aside
      className={cn(
        'sidebar lg:fixed lg:top-0 lg:bottom-0 z-30 lg:flex flex-col items-stretch shrink-0 text-white',
        'shadow-[1px_0_0_0_rgb(0_0_0/0.04)]',
        SIDEBAR_GRADIENT,
      )}
    >
      <SidebarHeader />
      <div className="sidebar-scroll grow min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-color:rgb(255_255_255/0.25)_transparent]">
        <div className="w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={toggleCollapse}
          className="group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[16px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          title={collapsed ? 'Keep sidebar expanded' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px] shrink-0" strokeWidth={1.9} />
          ) : (
            <PanelLeftClose className="size-[18px] shrink-0" strokeWidth={1.9} />
          )}
          <span className="sidebar-footer-label truncate">
            {collapsed ? 'Keep expanded' : 'Collapse sidebar'}
          </span>
          <Kbd size="xs" className="sidebar-footer-label ms-auto border-white/20 bg-white/10 text-white/80 font-sans">
            {MOD_KEY} B
          </Kbd>
        </button>
      </div>
    </aside>
  );
}
