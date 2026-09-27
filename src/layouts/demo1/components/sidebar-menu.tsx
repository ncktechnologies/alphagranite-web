'use client';

import { JSX, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';
import { useFilteredMenu } from '@/hooks/use-filtered-menu';
import { useMenu } from '@/hooks/use-menu';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { useGetShopRevisionCountQuery } from '@/store/api/shopRevision';
import { Pin } from 'lucide-react';

function MenuIcon({ icon }: { icon: MenuItem['icon'] }) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return <img src={`/images/icons/${icon}`} data-slot="accordion-menu-icon" className="size-[18px] shrink-0" alt="" />;
  }
  const Icon = icon;
  return <Icon data-slot="accordion-menu-icon" className="size-[18px] shrink-0 text-current" strokeWidth={1.9} />;
}

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { hasActiveChild } = useMenu(pathname);
  const filteredMenu = useFilteredMenu();
  const { data: shopRevisionCount = 0 } = useGetShopRevisionCountQuery();
  const { pinnedMenu, setPinnedMenu } = useUiPreferences();

  const pinnedItems = useMemo(() => new Set(pinnedMenu), [pinnedMenu]);
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set(pinnedMenu));

  // ─── Auto‑open the parent of the current route ──────────────────────────
  useEffect(() => {
    const findParentPath = (items: MenuConfig): string | null => {
      for (const item of items) {
        if (item.path && pathname.startsWith(item.path) && item.path !== '/') {
          return item.path;
        }
        if (item.children) {
          const childResult = findParentPath(item.children);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    const parentPath = findParentPath(filteredMenu);
    if (parentPath) {
      setOpenItems((prev) => new Set(prev).add(parentPath));
    }
  }, [pathname, filteredMenu]);

  // ─── Toggle pin (persisted per browser) ────────────────────────────────
  const togglePin = (itemPath: string) => {
    if (pinnedItems.has(itemPath)) {
      setPinnedMenu(pinnedMenu.filter((p) => p !== itemPath));
    } else {
      setPinnedMenu([...pinnedMenu, itemPath]);
      setOpenItems((open) => new Set(open).add(itemPath));
    }
  };

  // ─── Handle open/close from accordion (pinned sections stay open) ─────
  const handleOpenChange = (value: string | string[]) => {
    const newOpen = new Set(Array.isArray(value) ? value : [value]);
    pinnedItems.forEach((pinned) => newOpen.add(pinned));
    setOpenItems(newOpen);
  };

  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  const revisionBadge = (item: MenuItem) =>
    item.badge ?? (item.path?.endsWith('/revision') ? String(shopRevisionCount) : undefined);

  // ─── Class names ──────────────────────────────────────────────────────
  const itemBase =
    'relative h-10 px-3 gap-3 rounded-lg text-[14px] font-medium text-white/80 transition-colors ' +
    'hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white ' +
    '[&_svg]:opacity-100 [&_svg]:text-current ' +
    'data-[selected=true]:bg-white/[0.16] data-[selected=true]:text-white ' +
    'data-[selected=true]:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.10)] ' +
    "before:content-[''] before:absolute before:-start-3 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] " +
    'before:rounded-e-full before:bg-white before:opacity-0 before:transition-opacity data-[selected=true]:before:opacity-100';

  const classNames: AccordionMenuClassNames = {
    root: 'space-y-0.5',
    group: 'gap-px',
    label: 'uppercase text-[11px] font-semibold tracking-[0.08em] text-white/55 px-3 pt-5 pb-2',
    separator: 'bg-white/10',
    item: itemBase,
    sub: '',
    subTrigger:
      'h-10 px-3 gap-3 rounded-lg text-[14px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white [&_svg]:opacity-100 [&_[data-slot=accordion-menu-sub-indicator]]:text-white/60',
    subContent: 'py-0',
    indicator: 'text-white',
  };

  const childItemClass =
    'h-9 px-3 gap-2 text-[13.5px] font-normal text-white/70 before:-start-[0.72rem] before:h-4 data-[selected=true]:font-semibold data-[selected=true]:bg-white/[0.12]';

  // ─── Menu builders ────────────────────────────────────────────────────
  const buildMenu = (items: MenuConfig): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (item.disabled) {
        return buildMenuItemRootDisabled(item, index);
      } else {
        return buildMenuItemRoot(item, index);
      }
    });
  };

  const buildMenuItemRoot = (item: MenuItem, index: number): JSX.Element => {
    if (item.children) {
      const itemPath = item.path || `root-${index}`;
      const isPinned = pinnedItems.has(itemPath);
      const badgeText = revisionBadge(item);
      const childActive = hasActiveChild(item.children);

      return (
        <AccordionMenuSub key={index} value={itemPath}>
          <AccordionMenuSubTrigger
            className={cn('group', childActive && 'text-white bg-white/[0.06]')}
          >
            <MenuIcon icon={item.icon} />
            <span data-slot="accordion-menu-title" className="truncate">{item.title}</span>

            {badgeText !== undefined && (
              <Badge
                variant="secondary"
                size="sm"
                shape="circle"
                className="ms-auto bg-white/20 text-white tabular-nums"
              >
                {badgeText}
              </Badge>
            )}

            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                togglePin(itemPath);
              }}
              className={cn(
                'inline-flex size-6 items-center justify-center rounded-md transition-opacity hover:bg-white/15',
                badgeText === undefined && 'ms-auto',
                isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              title={isPinned ? 'Unpin section' : 'Pin section open'}
              data-slot="badge"
            >
              <Pin
                size={14}
                className={isPinned ? 'fill-current text-white' : 'text-white/60'}
              />
            </span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={itemPath}
            className="relative ps-[1.95rem] before:absolute before:start-[1.3rem] before:inset-y-1 before:w-px before:bg-white/15"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    return (
      <AccordionMenuItem key={index} value={item.path || ''}>
        <Link to={item.path || '#'}>
          <MenuIcon icon={item.icon} />
          <span data-slot="accordion-menu-title" className="truncate">{item.title}</span>
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemRootDisabled = (item: MenuItem, index: number): JSX.Element => {
    return (
      <AccordionMenuItem key={index} value={`disabled-${index}`} className="opacity-60">
        <MenuIcon icon={item.icon} />
        <span data-slot="accordion-menu-title">{item.title}</span>
        <Badge variant="secondary" size="sm" className="ms-auto bg-white/15 text-white">
          Soon
        </Badge>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (items: MenuConfig, level: number = 0): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      }
      return buildMenuItemChild(item, index, level);
    });
  };

  const buildMenuItemChild = (item: MenuItem, index: number, level: number = 0): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `child-${level}-${index}`}>
          <AccordionMenuSubTrigger className="h-9 text-[13.5px] font-normal">
            {item.collapse ? (
              <span className="text-white/60">
                <span className="hidden [[data-state=open]>span>&]:inline">
                  {item.collapseTitle}
                </span>
                <span className="inline [[data-state=open]>span>&]:hidden">
                  {item.expandTitle}
                </span>
              </span>
            ) : (
              item.title
            )}
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn('ps-4', !item.collapse && 'relative')}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, item.collapse ? level : level + 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    const badgeText = revisionBadge(item);
    return (
      <AccordionMenuItem key={index} value={item.path || ''} className={childItemClass}>
        <Link to={item.path || '#'}>
          <span className="truncate">{item.title}</span>
          {badgeText !== undefined && (
            <Badge
              variant="secondary"
              size="sm"
              shape="circle"
              className="ms-auto bg-white/20 text-white tabular-nums"
            >
              {badgeText}
            </Badge>
          )}
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildDisabled = (item: MenuItem, index: number, level: number = 0): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className={cn(childItemClass, 'opacity-60')}
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        <Badge variant="secondary" size="sm" className="ms-auto bg-white/15 text-white">
          Soon
        </Badge>
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => {
    return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <nav aria-label="Main" className="flex grow shrink-0 py-3 px-3">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="multiple" // allow multiple open
        collapsible
        value={Array.from(openItems)} // controlled open items
        onValueChange={handleOpenChange} // handle toggles, preserve pinned
        classNames={classNames}
        pinnedItems={pinnedItems}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </nav>
  );
}
