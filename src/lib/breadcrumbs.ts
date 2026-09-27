import { MENU_SIDEBAR, SETTINGS_NAV } from '@/config/menu.config';
import { MenuConfig, MenuItem } from '@/config/types';

export interface Crumb {
  title: string;
  path?: string;
}

const ACRONYMS: Record<string, string> = {
  fab: 'FAB',
  fabs: 'FABs',
  id: 'ID',
  cnc: 'CNC',
  sct: 'SCT',
  sla: 'SLA',
};

const isNumericId = (segment: string) => /^\d+$/.test(segment);
const isOpaqueId = (segment: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
  /^[0-9a-f]{16,}$/i.test(segment);

export function humanizeSegment(segment: string): string {
  const words = decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => ACRONYMS[w.toLowerCase()] ?? w.toLowerCase());
  if (!words.length) return segment;
  const [first, ...rest] = words;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}

/** Settings pages live outside the sidebar tree; graft them in so they resolve. */
const BREADCRUMB_MENU: MenuConfig = MENU_SIDEBAR.map((item) =>
  item.title === 'Settings'
    ? { ...item, path: '/settings', children: SETTINGS_NAV }
    : item,
);

const matchesPath = (pathname: string, itemPath?: string) =>
  !!itemPath &&
  itemPath !== '/' &&
  (pathname === itemPath || pathname.startsWith(`${itemPath}/`));

function findDeepestChain(pathname: string, items: MenuConfig, trail: MenuItem[] = []): MenuItem[] {
  let best: MenuItem[] = [];
  for (const item of items) {
    if (item.heading || item.separator) continue;
    const chain = [...trail, item];
    if (matchesPath(pathname, item.path)) {
      const bestLen = best.at(-1)?.path?.length ?? -1;
      if ((item.path?.length ?? 0) > bestLen) best = chain;
    }
    if (item.children?.length) {
      const childChain = findDeepestChain(pathname, item.children, chain);
      const childLen = childChain.at(-1)?.path?.length ?? -1;
      const bestLen = best.at(-1)?.path?.length ?? -1;
      if (childLen > bestLen || (childLen === bestLen && childChain.length > best.length)) {
        best = childChain;
      }
    }
  }
  return best;
}

function segmentsToCrumbs(segments: string[]): Crumb[] {
  return segments
    // Opaque IDs never help; numeric IDs only when they identify the final record.
    .filter((s, i) => !isOpaqueId(s) && (!isNumericId(s) || i === segments.length - 1))
    .map((s) => ({ title: isNumericId(s) ? `#${s}` : humanizeSegment(s) }));
}

/**
 * Builds a breadcrumb trail for any route: menu ancestry first, then a
 * humanised tail for detail/sub routes (e.g. `/sales/123` → View All FABs › #123).
 */
export function buildBreadcrumbs(pathname: string, menu: MenuConfig = BREADCRUMB_MENU): Crumb[] {
  if (pathname === '/' || pathname === '') return [{ title: 'Dashboard', path: '/' }];

  const chain = findDeepestChain(pathname, menu);

  if (!chain.length) {
    return segmentsToCrumbs(pathname.split('/').filter(Boolean));
  }

  const leafPath = chain.at(-1)?.path ?? '';
  const isExact = pathname === leafPath;

  // A child that merely repeats its parent's path (e.g. Jobs › View Job Widgets, both `/job`)
  // only makes sense on that exact page.
  let trimmed = chain;
  if (!isExact && chain.length > 1 && chain.at(-1)?.path === chain.at(-2)?.path) {
    trimmed = chain.slice(0, -1);
  }

  const crumbs: Crumb[] = trimmed.map((item) => ({
    title: item.title ?? '',
    // `/settings` has no page of its own; link the section to its first tab.
    path: item.path === '/settings' ? '/settings/profile' : item.path,
  }));
  const rest = pathname.slice(leafPath.length).split('/').filter(Boolean);
  return [...crumbs, ...segmentsToCrumbs(rest)];
}

/** Short label for a route, suitable for "recent pages" lists. */
export function titleForPath(pathname: string): string {
  const crumbs = buildBreadcrumbs(pathname);
  const last = crumbs.at(-1);
  if (!last) return '';
  if (last.title.startsWith('#') && crumbs.length > 1) {
    return `${crumbs.at(-2)?.title} ${last.title}`;
  }
  return last.title;
}
