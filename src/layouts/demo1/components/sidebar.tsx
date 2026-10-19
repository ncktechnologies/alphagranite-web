import { MousePointer2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { Kbd } from '@/components/ui/kbd';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MOD_KEY } from '@/lib/keyboard';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';
import { SidebarRailMenu } from './sidebar-rail-menu';

export const SIDEBAR_GRADIENT =
  'bg-[linear-gradient(180deg,var(--sidebar)_0%,var(--sidebar-deep)_100%)]';

export function Sidebar() {
  const { settings, storeOption } = useSettings();
  const collapsed = settings.layouts.demo1.sidebarCollapse;
  const hoverExpand = settings.layouts.demo1.sidebarHoverExpand;
  // Collapsed without expand-on-hover: icon rail with tooltips and flyouts
  const rail = collapsed && !hoverExpand;

  const toggleCollapse = () => {
    storeOption('layouts.demo1.sidebarCollapse', !collapsed);
  };

  const toggleHoverExpand = () => {
    storeOption('layouts.demo1.sidebarHoverExpand', !hoverExpand);
  };

  const footerButton =
    'group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white';

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
          {rail ? <SidebarRailMenu /> : <SidebarMenu />}
        </div>
      </div>
      <div className="shrink-0 space-y-0.5 border-t border-white/10 p-3">
        {collapsed && (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="switch"
                aria-checked={hoverExpand}
                onClick={toggleHoverExpand}
                className={footerButton}
              >
                <MousePointer2 className={cn('size-[18px] shrink-0', !hoverExpand && 'opacity-60')} strokeWidth={1.9} />
                <span className="sidebar-footer-label truncate">Expand on hover</span>
                <span
                  aria-hidden
                  className={cn(
                    'sidebar-footer-label ms-auto flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                    hoverExpand ? 'bg-white/90' : 'bg-white/20',
                  )}
                >
                  <span
                    className={cn(
                      'size-3 rounded-full transition-transform',
                      hoverExpand ? 'translate-x-3 bg-sidebar' : 'bg-white/80',
                    )}
                  />
                </span>
              </button>
            </TooltipTrigger>
            {/* The label is hidden on the rail, so say what the button does */}
            {rail && <TooltipContent side="right">Turn on expand on hover</TooltipContent>}
          </Tooltip>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className={footerButton}
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
