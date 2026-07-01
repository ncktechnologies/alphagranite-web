import React, { useState, useMemo, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Permissions } from '@/config/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useGetAllActionMenusQuery } from '@/store/api/actionMenu';
import { Skeleton } from '@/components/ui/skeleton';
import { PERMISSION_GROUPS } from '@/config/permission.config';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PermissionsTableProps {
  permissions: Permissions;
  onPermissionChange: (module: string, action: string, checked: boolean) => void;
}

interface FlatItem {
  key: string;
  name: string;
  isParent: boolean;
  children?: FlatItem[];
  parentKey?: string;
}

export const PermissionsTable = ({
  permissions,
  onPermissionChange,
}: PermissionsTableProps) => {
  const { data: actionMenus, isLoading, isError } = useGetAllActionMenusQuery();

  // ─── Debug: log the action menus ──────────────────────────────────────
  useEffect(() => {
    if (actionMenus) {
      // console.log('[PermissionsTable] Action menus received:', actionMenus);
    }
  }, [actionMenus]);

  // ─── Build hierarchy ────────────────────────────────────────────────────
  const topLevelItems = useMemo(() => {
    if (!actionMenus) return [];

    const codeToName = new Map<string, string>();
    const nameToCode = new Map<string, string>();
    actionMenus.forEach((menu) => {
      codeToName.set(menu.code, menu.name);
      nameToCode.set(menu.name.toLowerCase(), menu.code);
    });

    const findCode = (key: string, fallbackTitle?: string): string | undefined => {
      if (codeToName.has(key)) return key;
      if (fallbackTitle && nameToCode.has(fallbackTitle.toLowerCase())) {
        return nameToCode.get(fallbackTitle.toLowerCase());
      }
      if (nameToCode.has(key.toLowerCase())) {
        return nameToCode.get(key.toLowerCase());
      }
      return undefined;
    };

    const parentMap = new Map<string, string[]>();

    PERMISSION_GROUPS.forEach((group) => {
      const parentKey = group.permissionKey || group.title;
      if (!parentKey) return;
      const parentCode = findCode(parentKey, group.title);
      if (!parentCode) {
        console.warn(`[PermissionsTable] Parent "${group.title}" not found in action menus.`);
        return;
      }

      const childKeys = (group.children || [])
        .map((child) => child.permissionKey || child.title)
        .filter(Boolean) as string[];

      const childCodes: string[] = [];
      childKeys.forEach((childKey) => {
        const childCode = findCode(childKey);
        if (childCode) {
          childCodes.push(childCode);
        } else {
          console.warn(`[PermissionsTable] Child "${childKey}" not found in action menus.`);
        }
      });

      if (childCodes.length > 0) {
        parentMap.set(parentCode, childCodes);
      }
    });

    const parentCodes = new Set(parentMap.keys());
    const childCodesSet = new Set<string>();
    parentMap.forEach((children) => children.forEach((c) => childCodesSet.add(c)));

    const parents: FlatItem[] = [];
    const standalone: FlatItem[] = [];

    actionMenus.forEach((menu) => {
      const code = menu.code;
      const name = menu.name;

      if (parentCodes.has(code)) {
        const childCodes = parentMap.get(code) || [];
        const children = childCodes.map((childCode) => ({
          key: childCode,
          name: codeToName.get(childCode) || childCode,
          isParent: false,
          parentKey: code,
        }));
        parents.push({
          key: code,
          name,
          isParent: true,
          children,
        });
      } else if (!childCodesSet.has(code)) {
        standalone.push({
          key: code,
          name,
          isParent: false,
        });
      }
    });

    const allTopLevel = [...parents, ...standalone];
    allTopLevel.sort((a, b) => a.name.localeCompare(b.name));
    // console.log('[PermissionsTable] Top-level items:', allTopLevel);
    return allTopLevel;
  }, [actionMenus]);

  // ─── All items for select-all ──────────────────────────────────────────
  const allItems = useMemo(() => {
    const items: FlatItem[] = [];
    topLevelItems.forEach((item) => {
      items.push(item);
      if (item.children) {
        item.children.forEach((child) => items.push(child));
      }
    });
    return items;
  }, [topLevelItems]);

  // ─── Select All state ──────────────────────────────────────────────────
  const allReadSelected = useMemo(() => {
    return allItems.every((item) => permissions[item.key]?.read === true);
  }, [allItems, permissions]);

  const allWriteSelected = useMemo(() => {
    return allItems.every((item) => permissions[item.key]?.create === true);
  }, [allItems, permissions]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleSelectAllRead = (checked: boolean) => {
    allItems.forEach((item) => {
      onPermissionChange(item.key, 'read', checked);
    });
  };

  const handleSelectAllWrite = (checked: boolean) => {
    allItems.forEach((item) => {
      onPermissionChange(item.key, 'create', checked);
      if (checked) {
        onPermissionChange(item.key, 'read', true);
      }
    });
  };

  // ✅ FIXED: Write ⇒ Read auto‑selection + parent grant
  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    // 1. Update the requested permission
    onPermissionChange(module, action, checked);

    // 2. If Write is enabled, also enable Read for the same module
    if (action === 'create' && checked) {
      onPermissionChange(module, 'read', true);
    }

    // 3. If any permission is enabled for a child, grant the same permission to its parent
    if (checked) {
      for (const parent of topLevelItems) {
        if (parent.children?.some((child) => child.key === module)) {
          onPermissionChange(parent.key, action, true);
          break;
        }
      }
    }
  };

  // ─── Accordion state ──────────────────────────────────────────────────
  const [openParents, setOpenParents] = useState<Set<string>>(() => {
    return new Set(topLevelItems.filter((item) => item.isParent).map((p) => p.key));
  });

  const toggleParent = (key: string) => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ─── Loading / Error ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="border-l-0">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !actionMenus) {
    return (
      <Card className="border-l-0">
        <CardContent className="p-6 text-red-500">
          Failed to load permissions data. Please try again.
        </CardContent>
      </Card>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  const renderRow = (item: FlatItem, depth: number = 0, isChild: boolean = false) => {
    const key = item.key;
    const hasRead = permissions[key]?.read || false;
    const hasWrite = permissions[key]?.create || false;
    const isParent = item.isParent;

    return (
      <TableRow key={key} className={cn(isChild && 'bg-muted/30')}>
        <TableCell className="py-2.5! flex items-center gap-2">
          {isParent && (
            <button
              onClick={() => toggleParent(key)}
              className="p-1 hover:bg-muted rounded"
            >
              {openParents.has(key) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          <span style={{ paddingLeft: depth * 24 }}>{item.name}</span>
        </TableCell>
        <TableCell className="py-2.5! text-center">
          <Checkbox
            checked={hasRead}
            onCheckedChange={(checked) =>
              handlePermissionChange(key, 'read', checked as boolean)
            }
          />
        </TableCell>
        <TableCell className="py-2.5! text-center">
          <Checkbox
            checked={hasWrite}
            onCheckedChange={(checked) =>
              handlePermissionChange(key, 'create', checked as boolean)
            }
          />
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="border-l-0">
      <CardContent className="kt-scrollable-x-auto p-0 w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-accent/60">
              <TableHead className="text-start text-secondary-foreground font-normal min-w-[300px] h-10">
                Module
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Read
              </TableHead>
              <TableHead className="min-w-24 text-secondary-foreground font-normal text-center h-10">
                Write
              </TableHead>
            </TableRow>
            <TableRow className="bg-accent/30">
              <TableHead className="text-start text-secondary-foreground font-normal h-10">
                Select All
              </TableHead>
              <TableHead className="text-center h-10">
                <Checkbox
                  checked={allReadSelected}
                  onCheckedChange={handleSelectAllRead}
                />
              </TableHead>
              <TableHead className="text-center h-10">
                <Checkbox
                  checked={allWriteSelected}
                  onCheckedChange={handleSelectAllWrite}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topLevelItems.map((item) => (
              <React.Fragment key={item.key}>
                {renderRow(item)}
                {item.isParent &&
                  openParents.has(item.key) &&
                  item.children?.map((child) => renderRow(child, 1, true))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};