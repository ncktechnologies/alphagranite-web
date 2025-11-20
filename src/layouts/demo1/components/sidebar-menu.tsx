'use client';

import { JSX, useCallback, useMemo } from 'react';
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

export function SidebarMenu() {
  const { pathname } = useLocation();
  const permissions = useAllPermissions();
  const isSuperAdmin = useIsSuperAdmin();

  // Memoize matchPath to prevent unnecessary re-renders
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  // Map menu paths to permission codes
  // Note: Dashboard and Settings are always visible to all users
  // Dashboard shows role-based widgets filtered by permissions
  // Settings shows only Profile for non-super admin users
  const getMenuCode = (path: string): string | null => {
    if (path === '/') return null; // Dashboard - always visible
    if (path.startsWith('/employees')) return 'employees';
    if (path.startsWith('/departments')) return 'department';
    if (path.startsWith('/job')) return 'jobs';
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/settings')) return null; // Settings - always visible
    return null;
  };

  // Filter menu items based on permissions
  const filterMenuByPermissions = useCallback((items: MenuConfig): MenuConfig => {
    return items.filter(item => {
      // Always show headings and separators
      if (item.heading || item.separator) return true;
      
      // Always show Dashboard and Settings for all users
      if (item.path === '/' || item.path?.startsWith('/settings')) return true;
      
      // Super admins see everything else
      if (isSuperAdmin) return true;
      
      // Check permission for this menu item
      if (item.path) {
        const menuCode = getMenuCode(item.path);
        if (menuCode && permissions[menuCode]) {
          // User has at least read permission
          return permissions[menuCode].can_read;
        }
      }
      
      // If item has children, check if any children are accessible
      if (item.children) {
        const filteredChildren = filterMenuByPermissions(item.children);
        return filteredChildren.length > 0;
      }
      
      // Default: hide if no permission found
      return false;
    }).map(item => {
      // If item has children, filter them too
      if (item.children) {
        return {
          ...item,
          children: filterMenuByPermissions(item.children)
        };
      }
      return item;
    });
  }, [permissions, isSuperAdmin]);

  // Memoize filtered menu
  const filteredMenu = useMemo(
    () => filterMenuByPermissions(MENU_SIDEBAR),
    [filterMenuByPermissions]
  );

  // Global classNames for consistent styling
  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-3',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 py-2.25 pb-px',
    separator: '',
    item: 'h-8 hover:bg-transparent text-white hover:text-white/50 data-[selected=true]:text-white data-[selected=true]:bg-[#667F01]! data-[selected=true]:py-6',
    sub: '',
    subTrigger:
      'h-8 hover:bg-transparent text-white hover:text-white/50 data-[selected=true]:text-primary data-[selected=true]:bg-[#667F01]! data-[selected=true]:font-medium',
    subContent: 'py-0',
    indicator: '',
  };

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
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger className="text-[18px] font-medium">
            {item.icon && <item.icon data-slot="accordion-menu-icon" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
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
          <Link
            to={item.path || '#'}
            // className="flex items-center justify-between grow gap-2"
          >
            {/* {item.icon && <item.icon data-slot="accordion-menu-icon" className='size-[20px]!'/>} */}
            {item.icon && <img src={`/images/icons/${item.icon}`} />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (
    item: MenuItem,
    index: number,
  ): JSX.Element => {
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

  const buildMenuItemChildren = (
    items: MenuConfig,
    level: number = 0,
  ): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
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
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[16px]"
        >
          <Link to={item.path || '#'}>{item.title}</Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
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

  return (
    <div className="kt-scrollable-y-hover flex grow shrink-0 py-5 px-5 lg:max-h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </div>
  );
}
