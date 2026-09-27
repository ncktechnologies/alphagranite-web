import { useCallback, useMemo } from 'react';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { useAllPermissions, useIsSuperAdmin } from '@/hooks/use-permission';

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

/**
 * Returns the sidebar menu filtered by the current user's read permissions.
 * Shared by the sidebar, command palette and breadcrumbs so they always agree.
 */
export function useFilteredMenu(menu: MenuConfig = MENU_SIDEBAR): MenuConfig {
  const permissions = useAllPermissions();
  const isSuperAdmin = useIsSuperAdmin();

  const hasStoneTypeOrColorRead = useCallback((): boolean => {
    const stoneTypeKeysToTry = ['stone_type', 'Stone Type', 'stone_types'];
    const stoneColorKeysToTry = ['stone_color', 'Stone Color', 'stone_colors'];

    const canRead = (keys: string[]) =>
      keys.some(
        (key) =>
          permissions[normalizePermissionKey(key) as keyof typeof permissions]
            ?.can_read === true,
      );

    return canRead(stoneTypeKeysToTry) || canRead(stoneColorKeysToTry);
  }, [permissions]);

  const hasReadPermission = useCallback(
    (item: MenuItem): boolean => {
      if (isSuperAdmin) return true;
      const permissionKey = getPermissionKey(item);
      if (!permissionKey) return false;

      if (permissionKey === 'stone_types_colors') {
        return hasStoneTypeOrColorRead();
      }

      const keysToTry = [
        permissionKey,
        normalizePermissionKey(permissionKey),
        permissionKey.toLowerCase(),
        permissionKey.replace(/_/g, ' '),
        normalizePermissionKey(permissionKey.replace(/_/g, ' ')),
      ];

      return keysToTry.some(
        (key) =>
          permissions[key as keyof typeof permissions]?.can_read === true,
      );
    },
    [permissions, isSuperAdmin, hasStoneTypeOrColorRead],
  );

  const filterMenuByPermissions = useCallback(
    (items: MenuConfig, parentPermissionKey?: string): MenuConfig => {
      return items.reduce<MenuConfig>((filtered, item) => {
        if (item.heading || item.separator) {
          filtered.push(item);
          return filtered;
        }

        if (item.path === '/') {
          filtered.push(item);
          return filtered;
        }

        if (item.superAdminOnly && !isSuperAdmin) {
          return filtered;
        }

        let children: MenuConfig | undefined;
        if (item.children) {
          const currentPermKey = getPermissionKey(item) ?? undefined;
          children = filterMenuByPermissions(item.children, currentPermKey);
        }

        const isSettings = item.title === 'Settings' || item.path === '/settings';
        let itemHasPermission: boolean;
        if (isSettings) {
          // Settings is always visible, regardless of permissions
          itemHasPermission = true;
        } else if (parentPermissionKey === 'stone_types_colors') {
          itemHasPermission = hasStoneTypeOrColorRead();
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
    },
    [isSuperAdmin, hasReadPermission, hasStoneTypeOrColorRead],
  );

  return useMemo(
    () => filterMenuByPermissions(menu),
    [filterMenuByPermissions, menu],
  );
}

export interface FlatMenuEntry {
  title: string;
  path: string;
  parent?: string;
  icon?: MenuItem['icon'];
}

/** Flattens a (filtered) menu into navigable leaf entries, de-duplicated by path. */
export function flattenMenu(items: MenuConfig, parent?: MenuItem): FlatMenuEntry[] {
  const seen = new Set<string>();
  const out: FlatMenuEntry[] = [];

  const walk = (nodes: MenuConfig, parentNode?: MenuItem) => {
    for (const node of nodes) {
      if (node.heading || node.separator || node.disabled) continue;
      if (node.children?.length) {
        walk(node.children, node);
        continue;
      }
      if (!node.path || !node.title || seen.has(node.path)) continue;
      seen.add(node.path);
      out.push({
        title: node.title,
        path: node.path,
        parent: parentNode?.title,
        icon: node.icon ?? parentNode?.icon,
      });
    }
  };

  walk(items, parent);
  return out;
}
