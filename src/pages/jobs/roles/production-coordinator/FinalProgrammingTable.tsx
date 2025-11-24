import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
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
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IJob } from '@/pages/jobs/components/job';
import { groupData } from '@/lib/groupData';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { useNavigate } from 'react-router';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

interface FinalProgrammingTableProps {
    jobs: IJob[];
    path: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
}

export const FinalProgrammingTable = ({ jobs, path, isSuperAdmin = false, isLoading, onRowClick }: FinalProgrammingTableProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('today');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>('scheduled'); // Change default to 'scheduled'
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // Get unique fab types for the filter
    const fabTypes = useMemo(() => {
        const types = Array.from(new Set(jobs.map(job => job.fab_type).filter(Boolean)));
        return types.sort();
    }, [jobs]);

    const filteredData = useMemo(() => {
        let result = jobs;

        // Text search across multiple fields
        if (searchQuery) {
            result = result.filter((job) =>
                job.job_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.job_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_type?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Date filter
        if (dateFilter !== 'all') {
            result = result.filter((job) => {
                // Handle "unscheduled" filter
                if (dateFilter === 'unscheduled') {
                    return !job.date || job.date === '';
                }
                
                // Handle "scheduled" filter
                if (dateFilter === 'scheduled') {
                    return job.date && job.date !== '';
                }
                
                if (!job.date) return false;

                const jobDate = new Date(job.date);
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                const startOfNextWeek = new Date(endOfWeek);
                startOfNextWeek.setDate(endOfWeek.getDate() + 1);
                const endOfNextWeek = new Date(startOfNextWeek);
                endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
                
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

                switch (dateFilter) {
                    case 'today':
                        return jobDate.toDateString() === today.toDateString();
                    case 'this_week':
                        return jobDate >= startOfWeek && jobDate <= endOfWeek;
                    case 'this_month':
                        return jobDate >= startOfMonth && jobDate <= endOfMonth;
                    case 'next_week':
                        return jobDate >= startOfNextWeek && jobDate <= endOfNextWeek;
                    case 'next_month':
                        return jobDate >= startOfNextMonth && jobDate <= endOfNextMonth;
                    case 'custom':
                        if (dateRange?.from && dateRange?.to) {
                            const start = new Date(dateRange.from);
                            const end = new Date(dateRange.to);
                            end.setHours(23, 59, 59, 999);
                            return jobDate >= start && jobDate <= end;
                        }
                        return true;
                    default:
                        return job.date?.includes(dateFilter);
                }
            });
        }

        // Fab Type filter
        if (fabTypeFilter !== 'all') {
            result = result.filter((job) => job.fab_type === fabTypeFilter);
        }

        // Schedule filter
        if (scheduleFilter !== 'all') {
            if (scheduleFilter === 'scheduled') {
                result = result.filter((job) => job.date && job.date !== '');
            } else if (scheduleFilter === 'unscheduled') {
                result = result.filter((job) => !job.date || job.date === '');
            }
        }

        return result;
    }, [searchQuery, dateFilter, fabTypeFilter, scheduleFilter, dateRange, jobs]);

    const navigate = useNavigate();

    // Function to handle row click
    const handleRowClickInternal = (job: IJob) => {
        if (onRowClick) {
            onRowClick(job.fab_id);
        }
    };

    // Function to handle stage filter change - navigate to the selected stage route
    const handleStageFilterChange = (stageValue: string) => {
        if (stageValue === 'all') {
            // Stay on current page or go to a default page
            return;
        }

        // Find the stage that matches the selected value
        const selectedStage = Object.values(JOB_STAGES).find(stage => stage.stage === stageValue);
        if (selectedStage) {
            navigate(selectedStage.route);
        }
    };

    // Function to check if a column has any data
    const columnHasData = (accessorKey: string) => {
        return filteredData.some(job => {
            const value = job[accessorKey as keyof IJob];
            return value !== null && value !== undefined && value !== '';
        });
    };

    const baseColumns = useMemo<ColumnDef<IJob>[]>(() => [
        {
            accessorKey: 'id',
            accessorFn: (row: IJob) => row.id,
            header: () => <DataGridTableRowSelectAll />,
            cell: ({ row }) => <DataGridTableRowSelect row={row} />,
            enableSorting: false,
            enableHiding: false,
            enableResizing: false,
            size: 48,
            meta: {
                cellClassName: '',
            },
        },
        {
            id: "fab_type",
            accessorKey: "fab_type",
            accessorFn: (row: IJob) => row.fab_type,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.fab_type}</span>,
        },
        {
            id: "fab_id",
            accessorKey: "fab_id",
            accessorFn: (row: IJob) => row.fab_id,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
        },
        {
            id: "job_name",
            accessorKey: "job_name",
            accessorFn: (row: IJob) => row.job_name,
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.job_name}
                </span>
            ),
        },
        {
            id: "job_no",
            accessorKey: "job_no",
            accessorFn: (row: IJob) => row.job_no,
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.job_no}</span>,
        },
        {
            id: "acct_name",
            accessorKey: "acct_name",
            accessorFn: (row: IJob) => row.acct_name,
            header: ({ column }) => (
                <DataGridColumnHeader title="ACCT NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.acct_name}
                </span>
            ),
        },
        {
            id: "no_of_pieces",
            accessorKey: "no_of_pieces",
            accessorFn: (row: IJob) => row.no_of_pieces,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="No. of pieces" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.no_of_pieces}
                </span>
            ),
        },
        {
            id: "total_sq_ft",
            accessorKey: "total_sq_ft",
            accessorFn: (row: IJob) => row.total_sq_ft,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Total Sq ft" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.total_sq_ft}
                </span>
            ),
        },
        {
            id: "programming_status",
            accessorKey: "current_stage",
            accessorFn: (row: IJob) => row.current_stage,
            header: ({ column }) => (
                <DataGridColumnHeader title="PROGRAMMING STATUS" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.current_stage}</span>,
        },
        {
            id: "files_attached",
            accessorKey: "template_needed",
            accessorFn: (row: IJob) => row.template_needed,
            header: ({ column }) => (
                <DataGridColumnHeader title="FILES ATTACHED" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.template_needed}</span>,
        },
        {
            id: "notes",
            accessorKey: "template_schedule",
            accessorFn: (row: IJob) => row.template_schedule,
            header: ({ column }) => (
                <DataGridColumnHeader title="NOTES" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.template_schedule}
                </span>
            ),
        },

    ], []);

    // Filter columns based on data availability
    const columns = useMemo<ColumnDef<IJob>[]>(() => {
        return baseColumns.filter(column => {
            // Always show these columns regardless of data
            if (column.id === 'id') {
                return true;
            }

            // For other columns, check if they have data
            // accessorKey may not exist on all ColumnDef variants, so read it via a safe cast
            const accessor = (column as any).accessorKey as string | undefined;
            if (accessor) {
                return columnHasData(accessor);
            }

            // Default to showing if we can't determine
            return true;
        });
    }, [baseColumns, filteredData]);

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil(filteredData.length / pagination.pageSize),
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (isLoading) {
        return (
            <Card className="border rounded-lg">
                <CardHeader className="border-b p-4">
                    <div>
                        <h3 className="text-lg font-semibold">Final Programming Jobs</h3>
                        <p className="text-sm text-muted-foreground">Jobs in final CNC programming stage</p>
                    </div>
                </CardHeader>
                <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, index) => (
                        <Skeleton key={index} className="h-12 w-full" />
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <DataGrid
            table={table}
            recordCount={filteredData.length}
            isLoading={isLoading}
            groupByDate
            dateKey="date"
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
            onRowClick={onRowClick ? (row) => handleRowClickInternal(row) : undefined}
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

                            {/* Enhanced Date Filter */}
                            <div className="flex items-center gap-2">
                                <Select value={dateFilter} onValueChange={(value) => {
                                    setDateFilter(value);
                                    if (value === 'custom') {
                                        setIsDatePickerOpen(true);
                                    } else {
                                        setIsDatePickerOpen(false);
                                    }
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Filter by date" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="next_week">Next Week</SelectItem>
                                        <SelectItem value="next_month">Next Month</SelectItem>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Picker */}
                                {dateFilter === 'custom' && (
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-[34px]">
                                                <CalendarDays className="h-4 w-4 mr-2" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, 'MMM dd, yyyy')
                                                    )
                                                ) : (
                                                    <span>Pick dates</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={tempDateRange?.from || new Date()}
                                                selected={tempDateRange}
                                                onSelect={setTempDateRange}
                                                numberOfMonths={2}
                                            />
                                            <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setTempDateRange(undefined);
                                                        setDateRange(undefined);
                                                    }}
                                                >
                                                    Reset
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setDateRange(tempDateRange);
                                                        setIsDatePickerOpen(false);
                                                    }}
                                                >
                                                    Apply
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>

                            {/* Schedule Filter */}
                            <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Schedule Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Stage filter - only visible to super admins */}
                            {isSuperAdmin && (
                                <Select onValueChange={handleStageFilterChange}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Go to stage" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All Stages</SelectItem>
                                        {Object.values(JOB_STAGES).map((stage) => (
                                            <SelectItem key={stage.stage} value={stage.stage}>
                                                {stage.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardHeading>

                    <CardToolbar>
                        <Button variant="outline" onClick={() => exportTableToCSV(table, "FabId")}>Export CSV</Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardTable>

                <CardFooter>
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );
};