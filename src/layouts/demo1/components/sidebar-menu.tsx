'use client';

import { JSX, useCallback, useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR } from '@/config/menu.config';
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
import { useAllPermissions, useIsSuperAdmin } from '@/hooks/use-permission';
import { useGetShopRevisionCountQuery } from '@/store/api/shopRevision';
import { Pin } from 'lucide-react';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const permissions = useAllPermissions();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: shopRevisionCount = 0 } = useGetShopRevisionCountQuery();

  const [pinnedItems, setPinnedItems] = useState<Set<string>>(new Set());
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

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

    const parentPath = findParentPath(MENU_SIDEBAR);
    if (parentPath) {
      setOpenItems(prev => new Set(prev).add(parentPath));
    }
  }, [pathname]);

  // ─── Toggle pin ──────────────────────────────────────────────────────────
  const togglePin = (itemPath: string) => {
    setPinnedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemPath)) {
        newSet.delete(itemPath);
      } else {
        newSet.add(itemPath);
        // Auto‑open when pinned
        setOpenItems(open => new Set(open).add(itemPath));
      }
      return newSet;
    });
  };

  // ─── Handle open/close from accordion ──────────────────────────────────
  const handleOpenChange = (value: string | string[]) => {
  const newOpen = new Set(Array.isArray(value) ? value : [value]);
  pinnedItems.forEach(pinned => {
    if (!newOpen.has(pinned)) {
      newOpen.add(pinned);
    }
  });
  setOpenItems(newOpen);
};

  // ─── Permission logic (unchanged) ──────────────────────────────────────
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  const normalizePermissionKey = (key: string) =>
    key
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

  const getPermissionKey = (item: MenuItem): string | null => {
    if (item.permissionKey) return item.permissionKey;
    if (item.title) return item.title;
    if (item.path) {
      const pathSegments = item.path.split('/').filter(Boolean);
      if (pathSegments.length) return pathSegments.join('_');
    }
    return null;
  };

  const hasReadPermission = (item: MenuItem): boolean => {
    if (isSuperAdmin) return true;
    const permissionKey = getPermissionKey(item);
    if (!permissionKey) return false;

    if (permissionKey === 'stone_types_colors') {
      const stoneTypeKeysToTry = ['stone_type', 'Stone Type', 'stone_types'];
      const stoneColorKeysToTry = ['stone_color', 'Stone Color', 'stone_colors'];
      
      let hasStoneTypeRead = false;
      let hasStoneColorRead = false;
      
      for (const key of stoneTypeKeysToTry) {
        const perm = permissions[normalizePermissionKey(key) as keyof typeof permissions];
        if (perm?.can_read === true) {
          hasStoneTypeRead = true;
          break;
        }
      }
      
      for (const key of stoneColorKeysToTry) {
        const perm = permissions[normalizePermissionKey(key) as keyof typeof permissions];
        if (perm?.can_read === true) {
          hasStoneColorRead = true;
          break;
        }
      }
      
      return hasStoneTypeRead || hasStoneColorRead;
    }

    const keysToTry = [
      permissionKey,
      normalizePermissionKey(permissionKey),
      permissionKey.toLowerCase(),
      permissionKey.replace(/_/g, ' '),
      normalizePermissionKey(permissionKey.replace(/_/g, ' ')),
    ];

    for (const key of keysToTry) {
      const permission = permissions[key as keyof typeof permissions];
      if (permission?.can_read === true) {
        return true;
      }
    }

    return false;
  };

  const filterMenuByPermissions = useCallback((items: MenuConfig, parentPermissionKey?: string): MenuConfig => {
    return items.reduce<MenuConfig>((filtered, item) => {
      if (item.heading || item.separator) {
        filtered.push(item);
        return filtered;
      }

      if (item.path === '/') {
        filtered.push(item);
        return filtered;
      }

      if (!isSuperAdmin && ['Employees', 'Department'].includes(item.title || '')) {
        return filtered;
      }

      if (item.superAdminOnly && !isSuperAdmin) {
        return filtered;
      }

      let children: MenuConfig | undefined;
      if (item.children) {
        const currentPermKey = getPermissionKey(item);
        children = filterMenuByPermissions(item.children, currentPermKey);
      }

      let itemHasPermission: boolean;
      if (parentPermissionKey === 'stone_types_colors') {
        const stoneTypeKeysToTry = ['stone_type', 'Stone Type', 'stone_types'];
        const stoneColorKeysToTry = ['stone_color', 'Stone Color', 'stone_colors'];
        
        let hasStoneTypeRead = false;
        let hasStoneColorRead = false;
        
        for (const key of stoneTypeKeysToTry) {
          const perm = permissions[normalizePermissionKey(key) as keyof typeof permissions];
          if (perm?.can_read === true) {
            hasStoneTypeRead = true;
            break;
          }
        }
        
        for (const key of stoneColorKeysToTry) {
          const perm = permissions[normalizePermissionKey(key) as keyof typeof permissions];
          if (perm?.can_read === true) {
            hasStoneColorRead = true;
            break;
          }
        }
        
        itemHasPermission = hasStoneTypeRead || hasStoneColorRead;
      } else {
        itemHasPermission = hasReadPermission(item);
      }

      const hasAccessibleChildren = children?.length ? true : false;

      if (!itemHasPermission && !hasAccessibleChildren) {
        return filtered;
      }

      filtered.push(item.children ? { ...item, children } : item);
      return filtered;
    }, []);
  }, [permissions, isSuperAdmin]);

  const filteredMenu = useMemo(
    () => filterMenuByPermissions(MENU_SIDEBAR),
    [filterMenuByPermissions]
  );

  // ─── Class names ──────────────────────────────────────────────────────
  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label: 'uppercase text-xs font-medium text-muted-foreground/70 py-2.25 pb-px',
    separator: '',
    item: 'h-8 hover:bg-transparent text-white hover:text-white/50 data-[selected=true]:text-white data-[selected=true]:bg-[#667F01]! data-[selected=true]:py-6',
    sub: '',
    subTrigger: 'h-8 hover:bg-transparent text-white hover:text-white/50 data-[selected=true]:text-primary data-[selected=true]:bg-[#667F01]! data-[selected=true]:font-medium [&_svg]:text-white [&_svg]:w-6 [&_svg]:h-6',
    subContent: 'py-0 [&_svg]:text-white [&_svg]:w-5 [&_svg]:h-5',
    indicator: 'text-white',
  };

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
      const badgeText = item.badge ?? (item.path?.endsWith('/revision') ? String(shopRevisionCount) : undefined);

      return (
        <AccordionMenuSub
          key={index}
          value={itemPath}
          // No defaultOpen – controlled by parent via value
        >
          <AccordionMenuSubTrigger className="text-[18px] font-medium group">
            {item.icon && (typeof item.icon === 'string' ? (
              <img src={`/images/icons/${item.icon}`} data-slot="accordion-menu-icon" />
            ) : (
              <item.icon data-slot="accordion-menu-icon" />
            ))}
            <span data-slot="accordion-menu-title">{item.title}</span>
            
            {badgeText !== undefined && (
              <Badge
                variant="secondary"
                size="sm"
                className="ms-auto bg-[#667F01] text-white"
              >
                {badgeText}
              </Badge>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePin(itemPath);
              }}
              className="ms-2 opacity-0 group-hover:opacity-100 transition-opacity"
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              <Pin 
                size={18} 
                className={isPinned ? 'fill-current text-white' : 'text-white opacity-50'}
              />
            </button>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"   // Each submenu is single-select for its children
            collapsible
            parentValue={itemPath}
            className="ps-6 [&_[data-state=open]]:text-white [&_svg]:text-white [&_svg]:w-5 [&_svg]:h-5"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-lg text-[#E2E4ED]"
        >
          <Link to={item.path || '#'}>
            {item.icon && <img src={`/images/icons/${item.icon}`} />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (item: MenuItem, index: number): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-${index}`}
        className="text-sm font-medium"
      >
        {item.icon && <item.icon data-slot="accordion-menu-icon" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (items: MenuConfig, level: number = 0): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (item: MenuItem, index: number, level: number = 0): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub
          key={index}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
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
            className={cn(
              'ps-4',
              !item.collapse && 'relative',
              !item.collapse && (level > 0 ? '' : ''),
            )}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, item.collapse ? level : level + 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      const badgeText = item.badge ?? (item.path?.endsWith('/revision') ? String(shopRevisionCount) : undefined);
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[14px]"
        >
          <Link to={item.path || '#'}>{item.title}</Link>
          {badgeText !== undefined && (
            <Badge
              variant="secondary"
              size="sm"
              className="ms-auto me-[-10px] bg-[#667F01] text-white"
            >
              {badgeText}
            </Badge>
          )}
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (item: MenuItem, index: number, level: number = 0): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className="text-[13px]"
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto me-[-10px]">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => {
    return <AccordionMenuLabel key={index} className='text-[#E6E9E7] text-[16px] leading-[24px] p-0'>{item.heading}</AccordionMenuLabel>;
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="multiple"                     // allow multiple open
        collapsible
        value={Array.from(openItems)}       // controlled open items
        onValueChange={handleOpenChange}    // handle toggles, preserve pinned
        classNames={classNames}
        pinnedItems={pinnedItems}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </div>
  );
}