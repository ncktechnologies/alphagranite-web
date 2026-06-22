// src/utils/permissions.ts
import { PermissionMap } from '@/config/types';


/**
 * Normalize a permission key to match the format used in the permissions object.
 * This removes special characters, replaces spaces with underscores, and lowercases.
 */
export const normalizePermissionKey = (key: string): string =>
  key
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

/**
 * Check if the user has read permission for a given permission key.
 * Super admins always have read access.
 */
export const hasReadPermissionForKey = (
  permissionKey: string | null | undefined,
  permissions: PermissionMap,
  isSuperAdmin: boolean
): boolean => {
  if (isSuperAdmin) return true;
  if (!permissionKey) return false;

  const keysToTry = [
    permissionKey,
    normalizePermissionKey(permissionKey),
    permissionKey.toLowerCase(),
    permissionKey.replace(/_/g, ' '),
    normalizePermissionKey(permissionKey.replace(/_/g, ' ')),
  ];

  for (const key of keysToTry) {
    const perm = permissions[key as keyof typeof permissions];
    if (perm?.can_read === true) {
      return true;
    }
  }

  return false;
};

/**
 * A more comprehensive check that can derive a permission key from a menu item
 * (title, path, or explicit permissionKey) and then check read access.
 * This is used by the sidebar.
 */
export const hasReadPermissionForMenuItem = (
  item: { permissionKey?: string; title?: string; path?: string },
  permissions: PermissionMap,
  isSuperAdmin: boolean
): boolean => {
  if (isSuperAdmin) return true;

  // Derive permission key if not explicitly set
  let permissionKey = item.permissionKey;
  if (!permissionKey && item.title) {
    permissionKey = item.title;
  } else if (!permissionKey && item.path) {
    const pathSegments = item.path.split('/').filter(Boolean);
    if (pathSegments.length) {
      permissionKey = pathSegments.join('_');
    }
  }
  if (!permissionKey) return false;

  return hasReadPermissionForKey(permissionKey, permissions, isSuperAdmin);
};