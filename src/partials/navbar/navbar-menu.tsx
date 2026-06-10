import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';
import { useIsSuperAdmin, useAllPermissions } from '@/hooks/use-permission';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';

const NavbarMenu = ({ items }: { items: MenuConfig }) => {
  const { pathname } = useLocation();
  const { isActive, hasActiveChild } = useMenu(pathname);
  const isSuperAdmin = useIsSuperAdmin();
  const permissions = useAllPermissions();

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

    // Special case: stone_types_colors requires EITHER stone_type OR stone_color permission
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

  const filterMenuByPermissions = (items: MenuConfig): MenuConfig => {
    return items.filter(item => {
      // If item has superAdminOnly, only show to super admins
      if (item.superAdminOnly && !isSuperAdmin) return false;
      
      // If item has permissionKey, check if user has permission
      if (item.permissionKey) {
        return hasReadPermission(item);
      }

      // If no permissionKey, show it
      return true;
    });
  };

  // Filter menu items based on super admin status and permissions
  const filteredItems = filterMenuByPermissions(items);

  const buildMenu = (items: MenuConfig) => {
    return items.map((item, index) => {
      if (item.children) {
        return (
          <MenubarMenu key={index}>
            <MenubarTrigger
              className={cn(
                'flex items-center gap-1.5 px-3 py-3.5 text-sm text-secondary-foreground',
                'rounded-none border-b-2 border-transparent bg-transparent!',
                'hover:text-primary hover:bg-transparent',
                'focus:text-primary focus:bg-transparent',
                'data-[state=open]:bg-transparent data-[state=open]:text-primary',
                'data-[here=true]:text-primary data-[here=true]:border-primary',
              )}
              data-active={isActive(item.path) || undefined}
              data-here={hasActiveChild(item.children) || undefined}
            >
              {item.title}
              <ChevronDown className="ms-auto size-3.5" />
            </MenubarTrigger>
            <MenubarContent className="min-w-[175px]">
              {buildSubMenu(item.children)}
            </MenubarContent>
          </MenubarMenu>
        );
      } else {
        return (
          <MenubarMenu key={index}>
            <MenubarTrigger
              asChild
              className={cn(
                'flex items-center px-2 py-3.5 text-sm text-text-foreground px-3',
                'rounded-none border-b-2 border-transparent bg-transparent!',
                'hover:text-text hover:bg-transparent',
                'focus:text-text focus:bg-transparent',
                'data-[active=true]:text-text data-[active=true]:font-semibold data-[active=true]:border-primary',
              )}
            >
              <Link
                to={item.path || ''}
                data-active={isActive(item.path) || undefined}
                data-here={hasActiveChild(item.children) || undefined}
              >
                {item.icon && <item.icon data-slot="accordion-menu-icon" className='mr-2 h-[12px] w-[13px]'/>}
                {item.title}
              </Link>
            </MenubarTrigger>
          </MenubarMenu>
        );
      }
    });
  };

  const buildSubMenu = (items: MenuConfig) => {
    const filteredSubItems = filterMenuByPermissions(items);
    return filteredSubItems.map((item, index) => {
      if (item.children) {
        return (
          <MenubarSub key={index}>
            <MenubarSubTrigger
              data-active={isActive(item.path) || undefined}
              data-here={hasActiveChild(item.children) || undefined}
            >
              <span>{item.title}</span>
            </MenubarSubTrigger>
            <MenubarSubContent className="min-w-[175px]">
              {buildSubMenu(item.children)}
            </MenubarSubContent>
          </MenubarSub>
        );
      } else {
        return (
          <MenubarItem
            key={index}
            asChild
            data-active={isActive(item.path) || undefined}
            data-here={hasActiveChild(item.children) || undefined}
          >
            <Link to={item.path || ''}>{item.title}</Link>
          </MenubarItem>
        );
      }
    });
  };

  return (
    <div className="grid">
      <div className="kt-scrollable-x-auto">
        <Menubar className="flex items-stretch gap-3 bg-transparent p-0 h-auto">
          {buildMenu(filteredItems)}
        </Menubar>
      </div>
    </div>
  );
};

export { NavbarMenu };
