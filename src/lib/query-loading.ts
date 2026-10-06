/**
 * App-wide "data is loading" signal for RTK Query, used by the top loading bar.
 *
 * A request counts only when it is loading data that isn't on screen yet: a
 * first load, or new arguments such as switching a report to another month.
 * Each argument set has its own cache entry, so that entry has no data until
 * its request finishes. Polls and refetches of data that is already cached
 * keep their data while pending and are left out, so they don't flash the bar.
 */

type QueryEntry = { status?: string; data?: unknown } | undefined;
type ApiSliceState = { queries: Record<string, QueryEntry>; config: unknown };

const isApiSlice = (value: unknown): value is ApiSliceState =>
  typeof value === 'object' && value !== null && 'queries' in value && 'config' in value;

/** True while any RTK Query API in the store is loading data it has no cached copy of. */
export function isLoadingNewData(state: unknown): boolean {
  if (typeof state !== 'object' || state === null) return false;
  return Object.values(state).some(
    (slice) =>
      isApiSlice(slice) &&
      Object.values(slice.queries).some((entry) => entry?.status === 'pending' && entry.data === undefined),
  );
}
