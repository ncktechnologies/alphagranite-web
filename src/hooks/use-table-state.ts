import { useState, useEffect, useCallback } from 'react';
import { PaginationState, SortingState } from '@tanstack/react-table';
import { DateRange } from 'react-day-picker';

export interface TableState {
  pagination: PaginationState;
  sorting: SortingState;
  searchQuery: string;
  searchType?: 'fab_id' | 'job_number' | 'job_name' | 'account_name';
  dateFilter: string;
  fabTypeFilter: string;
  scheduleFilter?: string;
  salesPersonFilter?: string;
  currentStageFilter?: string;
  installStatusFilter?: string;
  dateRange?: DateRange;
}

export interface UseTableStateOptions {
  /** Unique identifier for this table instance (e.g., "final-programming-table", "job-table-sales") */
  tableId: string;
  /** Default pagination state */
  defaultPagination?: PaginationState;
  /** Default date filter */
  defaultDateFilter?: string;
  /** Default schedule filter */
  defaultScheduleFilter?: string;
  /** Enable localStorage persistence */
  persistState?: boolean;
  /** 'session' keeps state only for this browser tab, so Back restores it without it sticking forever */
  persistIn?: 'local' | 'session';
}

// Session-kept filters (persistIn: 'session') are for Back, not for a reload: a full page
// reload starts every such table fresh. This runs once per page load, so in-app navigation
// later in the session still restores them.
function clearSessionTableStatesOnReload() {
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.type !== 'reload') return;
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('table-state-'))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Storage unavailable (private mode etc.): nothing to clear
  }
}
if (typeof window !== 'undefined') clearSessionTableStatesOnReload();

const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 25,
};

/**
 * Custom hook for managing table state with localStorage persistence
 * Each table instance maintains its own independent state
 */
export function useTableState(options: UseTableStateOptions) {
  const {
    tableId,
    defaultPagination = DEFAULT_PAGINATION,
    defaultDateFilter = 'all',
    defaultScheduleFilter = 'all',
    persistState = true,
    persistIn = 'local',
  } = options;

  const STORAGE_KEY = `table-state-${tableId}`;
  const getStorage = () => (persistIn === 'session' ? sessionStorage : localStorage);

  // Load initial state from localStorage if persistence is enabled
  const getInitialState = (): TableState => {
    if (persistState && typeof window !== 'undefined') {
      try {
        const stored = getStorage().getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            // Parse dateRange if it exists
            dateRange: parsed.dateRange
              ? {
                  from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
                  to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
                }
              : undefined,
          };
        }
      } catch (error) {
        console.error(`Failed to load table state for ${tableId}:`, error);
      }
    }

    return {
      pagination: defaultPagination,
      sorting: [],
      searchQuery: '',
      searchType: 'fab_id' as const,
      dateFilter: defaultDateFilter,
      fabTypeFilter: 'all',
      scheduleFilter: defaultScheduleFilter,
      salesPersonFilter: 'all',
      currentStageFilter: 'all',
      installStatusFilter: 'all',
      dateRange: undefined,
    };
  };

  const [state, setState] = useState<TableState>(getInitialState);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      try {
        const stateToStore = {
          ...state,
          // Serialize dateRange for storage
          dateRange: state.dateRange
            ? {
                from: state.dateRange.from?.toISOString(),
                to: state.dateRange.to?.toISOString(),
              }
            : undefined,
        };
        getStorage().setItem(STORAGE_KEY, JSON.stringify(stateToStore));
      } catch (error) {
        console.error(`Failed to save table state for ${tableId}:`, error);
      }
    }
  }, [state, persistState, STORAGE_KEY, tableId]);

  // Individual setters for better TypeScript support
  const setPagination = useCallback((value: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    setState((prev) => ({
      ...prev,
      pagination: typeof value === 'function' ? value(prev.pagination) : value,
    }));
  }, []);

  const setSorting = useCallback((value: SortingState | ((prev: SortingState) => SortingState)) => {
    setState((prev) => ({
      ...prev,
      sorting: typeof value === 'function' ? value(prev.sorting) : value,
    }));
  }, []);

  const setSearchQuery = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: value,
      // Reset to first page when searching
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setSearchType = useCallback((value: 'fab_id' | 'job_number' | 'job_name') => {
    setState((prev) => ({
      ...prev,
      searchType: value,
    }));
  }, []);

  const setDateFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      dateFilter: value,
      // Reset to first page when changing filter
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setFabTypeFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      fabTypeFilter: value,
      // Reset to first page when changing filter
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setScheduleFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      scheduleFilter: value,
      // Reset to first page when changing filter
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setSalesPersonFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      salesPersonFilter: value,
      // Reset to first page when changing filter
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setCurrentStageFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      currentStageFilter: value,
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setInstallStatusFilter = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      installStatusFilter: value,
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  const setDateRange = useCallback((value: DateRange | undefined) => {
    setState((prev) => ({
      ...prev,
      dateRange: value,
      // Reset to first page when changing date range
      pagination: { ...prev.pagination, pageIndex: 0 },
    }));
  }, []);

  // Reset all state
  const resetState = useCallback(() => {
    const freshState: TableState = {
      pagination: defaultPagination,
      sorting: [],
      searchQuery: '',
      searchType: 'fab_id' as const,
      dateFilter: defaultDateFilter,
      fabTypeFilter: 'all',
      scheduleFilter: defaultScheduleFilter,
      currentStageFilter: 'all',
      installStatusFilter: 'all',
      dateRange: undefined,
    };
    setState(freshState);
  }, [defaultPagination, defaultDateFilter, defaultScheduleFilter]);

  // Clear stored state from localStorage
  const clearStoredState = useCallback(() => {
    if (typeof window !== 'undefined') {
      getStorage().removeItem(STORAGE_KEY);
    }
  }, [STORAGE_KEY, persistIn]);

  return {
    // State values
    pagination: state.pagination,
    sorting: state.sorting,
    searchQuery: state.searchQuery,
    searchType: state.searchType,
    dateFilter: state.dateFilter,
    fabTypeFilter: state.fabTypeFilter,
    scheduleFilter: state.scheduleFilter,
    salesPersonFilter: state.salesPersonFilter,
    currentStageFilter: state.currentStageFilter,
    installStatusFilter: state.installStatusFilter,
    dateRange: state.dateRange,

    // Setters
    setPagination,
    setSorting,
    setSearchQuery,
    setSearchType,
    setDateFilter,
    setFabTypeFilter,
    setScheduleFilter,
    setSalesPersonFilter,
    setCurrentStageFilter,
    setInstallStatusFilter,
    setDateRange,

    // Utility functions
    resetState,
    clearStoredState,
  };
}
