// components/ReportTableShell.tsx
import { useState, useMemo, ReactNode } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    RowSelectionState,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Card,
    CardFooter,
    CardHeader,
    CardHeading,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';
import { Can } from '@/components/permission';

interface ReportTableShellProps<TData> {
    title: string;
    data: TData[];
    columns: ColumnDef<TData, any>[];
    isLoading?: boolean;
    isError?: boolean;
    isFetching?: boolean;
    // Date range filtering (optional)
    dateRange?: DateRange;
    onDateRangeChange?: (range: DateRange | undefined) => void;
    // Search & filter toolbar (fully customisable)
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    // Additional toolbar components (e.g., status filter, date range picker)
    toolbarFilters?: ReactNode;
    // Row selection (optional)
    enableRowSelection?: boolean;
    onRowSelectionChange?: (selection: RowSelectionState) => void;
    // Export permission action
    exportPermission?: { action: string; on: string };
    exportFilename?: string;
}

export function ReportTableShell<TData>({
    title,
    data,
    columns,
    isLoading,
    isError,
    isFetching,
    dateRange,
    onDateRangeChange,
    searchPlaceholder = "Search...",
    searchValue = "",
    onSearchChange,
    toolbarFilters,
    enableRowSelection = false,
    onRowSelectionChange,
    exportPermission,
    exportFilename = title.toLowerCase().replace(/\s+/g, '-'),
}: ReportTableShellProps<TData>) {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 50,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    // Internal search state if not controlled externally
    const [internalSearch, setInternalSearch] = useState('');
    const activeSearch = searchValue !== undefined ? searchValue : internalSearch;
    const setActiveSearch = onSearchChange || setInternalSearch;

    // Filter data based on search (if not already filtered by the parent)
    const filteredData = useMemo(() => {
        if (!activeSearch) return data;
        const query = activeSearch.toLowerCase();
        // Simple default search across all string values – you can override by pre-filtering in the report component
        return data.filter((item) =>
            Object.values(item).some((val) =>
                val != null && String(val).toLowerCase().includes(query)
            )
        );
    }, [data, activeSearch]);

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
        state: {
            pagination,
            sorting,
            rowSelection: enableRowSelection ? rowSelection : {},
        },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableRowSelection,
        onRowSelectionChange: (updater) => {
            const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
            setRowSelection(newSelection);
            onRowSelectionChange?.(newSelection);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (isLoading && !filteredData.length) {
        return (
            <div className="p-4 flex items-center text-muted-foreground">
                <div className="animate-spin mr-2 border-2 border-primary border-t-transparent rounded-full h-4 w-4"></div>
                Loading report...
            </div>
        );
    }
    if (isError) return <div className="p-4 text-red-500">Error loading report</div>;

    return (
        <DataGrid
            table={table}
            recordCount={filteredData.length}
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
                columnsResizable: true,
                width: 'fixed',
            }}
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5">
                            {/* Search input */}
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={activeSearch}
                                    onChange={(e) => setActiveSearch(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
                                />
                                {activeSearch.length > 0 && (
                                    <Button
                                        mode="icon"
                                        variant="ghost"
                                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                        onClick={() => setActiveSearch('')}
                                    >
                                        <X />
                                    </Button>
                                )}
                            </div>

                            {/* Optional date range picker (if dateRange prop is provided) */}
                            {onDateRangeChange && (
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-[200px] justify-start text-left font-normal h-[34px]',
                                                !dateRange && 'text-muted-foreground'
                                            )}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                                                        {format(dateRange.to, 'MMM dd, yyyy')}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, 'MMM dd, yyyy')
                                                )
                                            ) : (
                                                <span>Filter by Date Range</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="range"
                                            month={month}
                                            onMonthChange={setMonth}
                                            selected={tempDateRange}
                                            onSelect={setTempDateRange}
                                            numberOfMonths={2}
                                        />
                                        <div className="flex items-center justify-end gap-2 border-t p-3">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setTempDateRange(undefined);
                                                    onDateRangeChange(undefined);
                                                    setIsDatePickerOpen(false);
                                                }}
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    onDateRangeChange(tempDateRange);
                                                    setIsDatePickerOpen(false);
                                                }}
                                            >
                                                Apply
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}

                            {/* Extra filters (e.g., status select) passed from report */}
                            {toolbarFilters}
                        </div>
                    </CardHeading>
                    <CardToolbar>
                        {/* <Can action={exportPermission?.action || 'read'} on={exportPermission?.on || 'report'}> */}
                            <Button
                                variant="outline"
                                onClick={() => exportTableToCSV(table, exportFilename)}
                            >
                                Export CSV
                            </Button>
                        {/* </Can> */}
                    </CardToolbar>
                </CardHeader>
                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                    </ScrollArea>
                </CardTable>
                <CardFooter>
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );
}