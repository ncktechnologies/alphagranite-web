import { describe, expect, it } from 'vitest';
import { isLoadingNewData } from './query-loading';

const api = (queries: Record<string, unknown>) => ({ queries, mutations: {}, provided: {}, subscriptions: {}, config: {} });

describe('isLoadingNewData', () => {
  it('is true while a query with no cached data is pending', () => {
    const state = { user: {}, reportApi: api({ 'report({"month":6})': { status: 'pending' } }) };
    expect(isLoadingNewData(state)).toBe(true);
  });

  it('ignores refetches and polls of data that is already cached', () => {
    const state = { reportApi: api({ 'report({"month":5})': { status: 'pending', data: { rows: [] } } }) };
    expect(isLoadingNewData(state)).toBe(false);
  });

  it('is false once every query has settled', () => {
    const state = {
      reportApi: api({ a: { status: 'fulfilled', data: {} }, b: { status: 'rejected' } }),
      jobApi: api({}),
    };
    expect(isLoadingNewData(state)).toBe(false);
  });

  it('only looks at RTK Query slices', () => {
    expect(isLoadingNewData({ user: { queries: { a: { status: 'pending' } } } })).toBe(false);
    expect(isLoadingNewData(null)).toBe(false);
  });
});
