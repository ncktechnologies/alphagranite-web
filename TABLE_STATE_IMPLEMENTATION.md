# Job Table Backend Pagination & Independent State Management

## Overview

This implementation provides backend pagination, filtering, and search capabilities for job tables with independent state management per table instance. Each table maintains its own state that persists across page refreshes using localStorage.

## Key Features

1. **Backend Pagination**: Tables fetch data from the backend with proper pagination support
2. **Independent State**: Each table instance has its own isolated state
3. **State Persistence**: Table state is automatically saved to localStorage and restored on page load
4. **Flexible Filtering**: Support for search, date filters, FAB type filters, and custom date ranges
5. **Type-Safe**: Full TypeScript support with proper typing

## How to Use

### 1. Create a Page Component

```tsx
import { useTableState } from '@/hooks/use-table-state';
import { useGetFabsByStageQuery } from '@/store/api/job';
import { useMemo } from 'react';

export function YourPage() {
  // Initialize table state with a unique ID
  const tableState = useTableState({
    tableId: 'your-unique-table-id', // MUST be unique per table instance
    defaultPagination: { pageIndex: 0, pageSize: 10 },
    defaultDateFilter: 'today',
    defaultScheduleFilter: 'all',
    persistState: true, // Enable localStorage persistence
  });

  // Calculate pagination skip value
  const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

  // Build query parameters for backend
  const queryParams = useMemo(() => {
    const params: any = {
      skip,
      limit: tableState.pagination.pageSize,
    };

    if (tableState.searchQuery) {
      params.search = tableState.searchQuery;
    }

    if (tableState.fabTypeFilter !== 'all') {
      params.fab_type = tableState.fabTypeFilter;
    }

    if (tableState.dateFilter !== 'all') {
      params.date_filter = tableState.dateFilter;
    }

    return params;
  }, [skip, tableState]);

  // Fetch data with backend pagination
  const { data, isLoading } = useGetFabsByStageQuery({
    stage_name: 'your_stage',
    params: queryParams,
  });

  return (
    <YourTable
      data={data?.data || []}
      totalRecords={data?.total || 0}
      isLoading={isLoading}
      tableState={tableState}
    />
  );
}
```

### 2. Update Your Table Component

```tsx
import { useTableState } from '@/hooks/use-table-state';

interface YourTableProps {
  data: Fab[];
  totalRecords: number;
  isLoading: boolean;
  tableState: ReturnType<typeof useTableState>;
}

export function YourTable({ data, totalRecords, isLoading, tableState }: YourTableProps) {
  const {
    pagination,
    sorting,
    searchQuery,
    dateFilter,
    fabTypeFilter,
    scheduleFilter,
    dateRange,
    setPagination,
    setSorting,
    setSearchQuery,
    setDateFilter,
    setFabTypeFilter,
    setScheduleFilter,
    setDateRange,
  } = tableState;

  // Use React Table with server-side pagination
  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true, // Important for backend pagination
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      {/* Search Input */}
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
      />

      {/* Date Filter */}
      <Select value={dateFilter} onValueChange={setDateFilter}>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="today">Today</SelectItem>
        <SelectItem value="this_week">This Week</SelectItem>
      </Select>

      {/* FAB Type Filter */}
      <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
        <SelectItem value="all">All Types</SelectItem>
        {/* Add your FAB types */}
      </Select>

      {/* Your table rendering */}
      <DataGridTable table={table} />

      {/* Pagination */}
      <DataGridPagination 
        table={table} 
        recordCount={totalRecords}
      />
    </div>
  );
}
```

## API Changes

### Updated `getFabs` Endpoint

Now returns paginated data:

```typescript
{
  data: Fab[],
  total: number
}
```

### Updated `getFabsByStage` Endpoint

Also returns paginated data with the same structure.

### New Query Parameters

The backend endpoints now support:
- `skip`: Number of records to skip (for pagination)
- `limit`: Number of records per page
- `search`: Search query string
- `fab_type`: Filter by FAB type
- `date_filter`: Filter by date ('today', 'this_week', etc.)
- `schedule_start_date`: Custom date range start
- `schedule_due_date`: Custom date range end

## Table State Hook API

### `useTableState(options)`

**Options:**
```typescript
{
  tableId: string;                    // Unique identifier (REQUIRED)
  defaultPagination?: PaginationState; // Default pagination
  defaultDateFilter?: string;          // Default date filter
  defaultScheduleFilter?: string;      // Default schedule filter
  persistState?: boolean;              // Enable localStorage (default: true)
}
```

**Returns:**
```typescript
{
  // State values
  pagination: PaginationState;
  sorting: SortingState;
  searchQuery: string;
  dateFilter: string;
  fabTypeFilter: string;
  scheduleFilter: string;
  dateRange?: DateRange;

  // Setters
  setPagination: (value) => void;
  setSorting: (value) => void;
  setSearchQuery: (value) => void;
  setDateFilter: (value) => void;
  setFabTypeFilter: (value) => void;
  setScheduleFilter: (value) => void;
  setDateRange: (value) => void;

  // Utilities
  resetState: () => void;
  clearStoredState: () => void;
}
```

## Example: Final Programming Table

See `FinalProgrammingPage.tsx` for a complete working example:

```tsx
const tableState = useTableState({
  tableId: 'final-programming-table',
  defaultPagination: { pageIndex: 0, pageSize: 10 },
  defaultDateFilter: 'today',
  defaultScheduleFilter: 'scheduled',
  persistState: true,
});
```

## Important Notes

1. **Unique Table IDs**: Each table instance MUST have a unique `tableId` to maintain separate state
2. **Backend Support**: Your backend must support the new query parameters
3. **Manual Pagination**: Use `manualPagination: true` in React Table config
4. **State Persistence**: State is saved to localStorage with key `table-state-{tableId}`
5. **Auto Reset**: Changing filters automatically resets pagination to page 0

## Benefits

✅ **Independent State**: Multiple tables on different pages don't interfere with each other  
✅ **Persistent State**: Users' filter/pagination preferences are remembered  
✅ **Backend Efficiency**: Only fetch data you need (proper pagination)  
✅ **Type Safety**: Full TypeScript support  
✅ **Easy to Use**: Simple hook-based API  
✅ **Flexible**: Works with any table component  

## Troubleshooting

**State not persisting?**
- Check that `persistState: true` is set
- Verify `tableId` is unique and consistent
- Check browser's localStorage is enabled

**Multiple tables sharing state?**
- Ensure each table has a unique `tableId`
- Check for duplicate `tableId` values

**Backend not filtering correctly?**
- Verify query parameters are being sent correctly
- Check backend API implementation
- Use browser devtools to inspect network requests
