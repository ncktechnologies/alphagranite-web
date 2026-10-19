import { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFilteredMenu } from '@/hooks/use-filtered-menu';
import { useMenu } from '@/hooks/use-menu';
import { useGetShopRevisionCountQuery } from '@/store/api/shopRevision';

/**
 * Icon-only sidebar used when the sidebar is collapsed and expand-on-hover is off.
 * Every icon has a tooltip; sections open their pages in a flyout to the right,
 * so nothing is out of reach without widening the sidebar.
 */

function RailIcon({ icon }: { icon: MenuItem['icon'] }) {
  if (!icon) return null;
  if (typeof icon === 'string') return <img src={`/images/icons/${icon}`} className="size-[18px] shrink-0" alt="" />;
  const Icon = icon;
  return <Icon className="size-[18px] shrink-0 text-current" strokeWidth={1.9} />;
}

const railItem =
  'relative flex h-10 w-12 items-center justify-center rounded-lg text-white/80 transition-colors ' +
  'hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none ' +
  'data-[state=open]:bg-white/10 data-[state=open]:text-white ' +
  'data-[active=true]:bg-white/[0.16] data-[active=true]:text-white data-[active=true]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.10)] ' +
  "before:content-[''] before:absolute before:-start-3 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] " +
  'before:rounded-e-full before:bg-white before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100';

export function SidebarRailMenu() {
  const { pathname } = useLocation();
  const { isActive, hasActiveChild } = useMenu(pathname);
  const menu = useFilteredMenu();
  const { data: shopRevisionCount = 0 } = useGetShopRevisionCountQuery();

  const badgeFor = (item: MenuItem) =>
    item.badge ?? (item.path?.endsWith('/revision') ? String(shopRevisionCount) : undefined);

  // A section shows a dot when any page inside it has a non-zero badge
  const hasBadge = (items: MenuConfig): boolean =>
    items.some((i) => (Number(badgeFor(i)) || 0) > 0 || (i.children ? hasBadge(i.children) : false));

  const buildFlyoutItems = (items: MenuConfig): JSX.Element[] =>
    items.map((item, i) => {
      if (item.children) {
        return (
          <DropdownMenuSub key={i}>
            <DropdownMenuSubTrigger>{item.title ?? item.expandTitle}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[70vh] overflow-y-auto">
              {buildFlyoutItems(item.children)}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }
      if (item.disabled) {
        return (
          <DropdownMenuItem key={i} disabled>
            {item.title}
            <span className="ms-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
        );
      }
      const badge = badgeFor(item);
      const active = item.path ? isActive(item.path) : false;
      return (
        <DropdownMenuItem key={i} asChild>
          <Link
            to={item.path || '#'}
            aria-current={active ? 'page' : undefined}
            className={cn(active && 'bg-primary-soft font-semibold text-primary-accent')}
          >
            <span className="truncate">{item.title}</span>
            {badge !== undefined && (
              <span className="ms-auto rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">{badge}</span>
            )}
          </Link>
        </DropdownMenuItem>
      );
    });

  const buildRoot = (item: MenuItem, index: number, prev?: MenuItem): JSX.Element | null => {
    if (item.heading) {
      // Headings become a quiet divider between groups (none before the first item)
      return index === 0 || prev?.heading ? null : <div key={index} className="mx-3 my-2 h-px w-6 bg-white/15" aria-hidden />;
    }

    if (item.children) {
      const active = hasActiveChild(item.children);
      return (
        <DropdownMenu key={index}>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger className={railItem} data-active={active} aria-label={item.title}>
                <RailIcon icon={item.icon} />
                {hasBadge(item.children) && (
                  <span className="absolute end-2 top-2 size-2 rounded-full bg-warning ring-2 ring-sidebar" aria-hidden />
                )}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" sideOffset={10} className="w-60 max-h-[80vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {item.title}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {buildFlyoutItems(item.children)}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (item.disabled) {
      return (
        <Tooltip key={index} delayDuration={150}>
          <TooltipTrigger asChild>
            <span className={cn(railItem, 'opacity-50')} aria-disabled>
              <RailIcon icon={item.icon} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">{item.title} · Soon</TooltipContent>
        </Tooltip>
      );
    }

    const active = isActive(item.path);
    return (
      <Tooltip key={index} delayDuration={150}>
        <TooltipTrigger asChild>
          <Link
            to={item.path || '#'}
            className={railItem}
            data-active={active}
            aria-current={active ? 'page' : undefined}
            aria-label={item.title}
          >
            <RailIcon icon={item.icon} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3 py-3">
      {menu.map((item, i) => buildRoot(item, i, menu[i - 1]))}
    </nav>
  );
}
