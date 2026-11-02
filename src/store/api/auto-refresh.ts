/**
 * Tag for list, widget and dashboard queries that refresh themselves while on screen
 * (see hooks/use-auto-refresh.ts). Detail and form queries don't use it, so a refresh
 * never overwrites something being edited.
 */
export const AUTO_REFRESH = 'AutoRefresh' as const;

/**
 * For endpoints that double as form lookups: big requests (e.g. limit 1000 for a dropdown)
 * are left out, since they're expensive and don't need to be live.
 */
export const autoRefreshUnlessLookup = <T extends string>(tags: T[]) =>
    (_result: unknown, _error: unknown, arg: { limit?: number } | void) =>
        (arg && (arg.limit ?? 0) >= 1000 ? tags : [...tags, AUTO_REFRESH]);
