import { useMemo } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardHeading,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { Search, CalendarDays, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fab } from '@/store/api/job';
import { useTableState } from '@/hooks/use-table-state';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';

interface FinalProgrammingTableProps {
    data: Fab[];
    totalRecords: number;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
    tableState: ReturnType<typeof useTableState>;
}

export const FinalProgrammingTable = ({
    data,
    totalRecords,
    isLoading,
    onRowClick,
    tableState,
}: FinalProgrammingTableProps) => {
    const navigate = useNavigate();

    const {
        pagination,
        sorting,
        searchQuery,
        dateFilter,
        fabTypeFilter,
        dateRange,
        setPagination,
        setSorting,
        setSearchQuery,
        setDateFilter,
        setFabTypeFilter,
        setDateRange,
    } = tableState;

    // Get unique fab types for the filter
    const fabTypes = useMemo(() => {
        const types = Array.from(new Set(data.map(fab => fab.fab_type).filter(Boolean)));
        return types.sort();
    }, [data]);

    // Handle row click
    const handleRowClick = (fab: Fab) => {
        if (onRowClick) {
            onRowClick(String(fab.id));
        } else {
            navigate(`/job/final-programming/${fab.id}`);
        }
    };

    // Define columns based on Figma design
    const columns = useMemo<ColumnDef<Fab>[]>(() => [
        {
            accessorKey: 'id',
            header: () => <DataGridTableRowSelectAll />,
            cell: ({ row }) => <DataGridTableRowSelect row={row} />,
            enableSorting: false,
            enableHiding: false,
            enableResizing: false,
            size: 48,
        },
        {
            id: "fab_type",
            accessorKey: "fab_type",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.fab_type || '-'}</span>,
        },
        {
            id: "fab_id",
            accessorKey: "id",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm font-medium">{row.original.id}</span>,
        },
        {
            id: "job_name",
            accessorKey: "job_details.name",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.job_details?.name || '-'}
                </span>
            ),
        },
        {
            id: "job_no",
            accessorKey: "job_details.job_number",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.job_details?.job_number || '-'}</span>,
        },
        {
            id: "no_of_pieces",
            accessorKey: "no_of_pieces",
            header: ({ column }) => (
                <DataGridColumnHeader title="NO. OF PIECES" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm text-center block">{row.original.no_of_pieces || '-'}</span>,
        },
        {
            id: "total_sq_ft",
            accessorKey: "total_sqft",
            header: ({ column }) => (
                <DataGridColumnHeader title="TOTAL SQ FT" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.total_sqft || '-'}</span>,
        },
        {
            id: "time_minutes",
            accessorKey: "programming_time_minutes",
            header: ({ column }) => (
                <DataGridColumnHeader title="3/4 TIME (MINUTES)" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.programming_time_minutes || '-'}</span>,
        },
        {
            id: "clock",
            accessorKey: "clock_time",
            header: ({ column }) => (
                <DataGridColumnHeader title="CLOCK" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.clock_time || '-'}</span>,
        },
        {
            id: "final_programmer",
            accessorKey: "final_programmer_name",
            header: ({ column }) => (
                <DataGridColumnHeader title="FINAL PROGRAMMER" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.final_programmer_name || '-'}</span>,
        },
        {
            id: "programming_complete",
            accessorKey: "final_programming_complete",
            header: ({ column }) => (
                <DataGridColumnHeader title="FINAL PROGRAMMING COMPLETE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.final_programming_complete ? 'Yes' : 'No'}
                </span>
            ),
        },
    ], []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        manualPagination: true,
        manualSorting: false,
        pageCount: Math.ceil(totalRecords / pagination.pageSize),
        state: {
            pagination,
            sorting,
        },
    });

    return (
        <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
            onRowClick={(row) => handleRowClick(row)}
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Search Jobs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
                                />
                                {searchQuery && (
                                    <Button
                                        mode="icon"
                                        variant="ghost"
                                        className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        <X />
                                    </Button>
                                )}
                            </div>

                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {fabTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="w-[170px] h-[34px]">
                                    <SelectValue placeholder="Filter by date" />
                                </SelectTrigger>
                                <SelectContent className="w-48">
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="this_week">This Week</SelectItem>
                                    <SelectItem value="last_week">Last Week</SelectItem>
                                    <SelectItem value="this_month">This Month</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                    <SelectItem value="next_week">Next Week</SelectItem>
                                    <SelectItem value="next_month">Next Month</SelectItem>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeading>
                </CardHeader>

                <DataGridTable />

                <DataGridPagination />
            </Card>
        </DataGrid>
    );
};