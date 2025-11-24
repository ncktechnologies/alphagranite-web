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

interface CutListTableProps {
    jobs: IJob[];
    path: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
}

export const CutListTable = ({ jobs, path, isSuperAdmin = false, isLoading, onRowClick }: CutListTableProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('today');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [scheduleFilter, setScheduleFilter] = useState<string>('all'); // Change default to 'all'
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
            id: "scheduled_date",
            accessorKey: "date",
            accessorFn: (row: IJob) => row.date,
            header: ({ column }) => (
                <DataGridColumnHeader title="SCHEDULED DATE" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.date}</span>,
        },
        {
            id: "notes",
            accessorKey: "template_needed",
            accessorFn: (row: IJob) => row.template_needed,
            header: ({ column }) => (
                <DataGridColumnHeader title="NOTES" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.template_needed}
                </span>
            ),
        },

    ], []);

    const table = useReactTable({
        data: filteredData,
        columns: baseColumns,
        state: {
            sorting,
            pagination,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: false,
        manualSorting: false,
    });

    if (isLoading) {
        return (
            <Card className="border rounded-lg">
                <CardHeader className="border-b p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Cut List Jobs</h3>
                            <p className="text-sm text-muted-foreground">Jobs scheduled for shop cut date</p>
                        </div>
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
        <Card className="border rounded-lg">
            <CardHeader className="border-b p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Cut List Jobs</h3>
                        <p className="text-sm text-muted-foreground">Jobs scheduled for shop cut date</p>
                    </div>
                    <CardToolbar className="flex items-center gap-2 mt-4">

                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search jobs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 h-9 text-sm"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </Button>
                            )}
                        </div>

                        <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                            <SelectTrigger className="w-[140px] h-[34px]">
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

                        {/* Schedule Filter */}
                        <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                            <SelectTrigger className="w-[150px] h-[34px]">
                                <SelectValue placeholder="Schedule Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="unscheduled">Unscheduled</SelectItem>
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
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="this_week">This Week</SelectItem>
                                    <SelectItem value="this_month">This Month</SelectItem>
                                    <SelectItem value="next_week">Next Week</SelectItem>
                                    <SelectItem value="next_month">Next Month</SelectItem>
                                    <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Custom Date Range Picker */}
                            {dateFilter === 'custom' && (
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-[34px]">
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
                                            mode="range"
                                            selected={tempDateRange}
                                            onSelect={(range) => {
                                                setTempDateRange(range);
                                                if (range?.from && range?.to) {
                                                    setDateRange(range);
                                                }
                                            }}
                                            numberOfMonths={2}
                                        />
                                        <div className="p-3 border-t flex justify-between">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setDateRange(undefined);
                                                    setTempDateRange(undefined);
                                                    setDateFilter('all');
                                                }}
                                            >
                                                Clear
                                            </Button>
                                            <Button
                                                onClick={() => {
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

                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(filteredData, 'cut_list_jobs')}
                            className="h-[34px]"
                        >
                            Export CSV
                        </Button>

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
                    </CardToolbar>
                </div>
            </CardHeader>

            <div className="overflow-hidden">
                <ScrollArea className="w-full">
                    <CardTable>
                        <DataGridTable
                            table={table}
                            onRowClick={handleRowClickInternal}
                            emptyState={{
                                title: "No cut list jobs found",
                                description: "There are no jobs currently in the cut list stage.",
                            }}
                        />
                    </CardTable>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            <CardFooter className="border-t p-4">
                <DataGridPagination table={table} />
            </CardFooter>
        </Card>
    );
};