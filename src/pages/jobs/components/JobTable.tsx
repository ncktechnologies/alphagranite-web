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
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IJob } from './job';
import { groupData } from '@/lib/groupData';
import { exportTableToCSV } from '@/lib/exportToCsv';
import ActionsCell from '../roles/sales/action';
import { useNavigate } from 'react-router';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { DateTimePicker } from '@/components/ui/date-time-picker';

interface JobTableProps {
    jobs: IJob[];
    path: string;
    isSuperAdmin?: boolean;
    onRowClick?: (fabId: string) => void; // Add row click handler
}

export const JobTable = ({ jobs, path, isSuperAdmin = false, onRowClick }: JobTableProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('all'); // For date filtering
    const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined); // For custom date range
    const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined); // For custom date range
    const [showCustomDate, setShowCustomDate] = useState(false); // To toggle custom date picker

    const filteredData = useMemo(() => {
        let result = jobs;
        
        // Text search across multiple fields
        if (searchQuery) {
            result = result.filter((job) => 
                job.job_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.job_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.template_schedule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.templater?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Date filter
        if (dateFilter !== 'all') {
            result = result.filter((job) => {
                if (!job.date) return false;
                
                const jobDate = new Date(job.date);
                const today = new Date();
                
                switch (dateFilter) {
                    case 'today':
                        return jobDate.toDateString() === today.toDateString();
                    case '7days':
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(today.getDate() - 7);
                        return jobDate >= sevenDaysAgo && jobDate <= today;
                    case '30days':
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(today.getDate() - 30);
                        return jobDate >= thirtyDaysAgo && jobDate <= today;
                    case 'custom':
                        if (customStartDate && customEndDate) {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            end.setHours(23, 59, 59, 999); // Include the entire end day
                            return jobDate >= start && jobDate <= end;
                        }
                        return true;
                    default:
                        // Year-based filtering (existing functionality)
                        return job.date?.includes(dateFilter);
                }
            });
        }
        
        return result;
    }, [searchQuery, dateFilter, customStartDate, customEndDate, jobs]);

    const navigate = useNavigate();

    const handleView = (department: string, id: string) => {
        navigate(`/job/${department}/${id}`);
    };

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
                <DataGridColumnHeader className='uppercase' title="Total Sq ft " column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.total_sq_ft}
                </span>
            ),
        },
        {
            id: "revenue",
            accessorKey: "revenue",
            accessorFn: (row: IJob) => row.revenue,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revenue" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.revenue}
                </span>
            ),
        },
        {
            id: "revised",
            accessorKey: "revised",
            accessorFn: (row: IJob) => row.revised,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revised" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.revised}
                </span>
            ),
        },
        {
            id: "sct_completed",
            accessorKey: "sct_completed",
            accessorFn: (row: IJob) => row.sct_completed,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Sct Completed" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.sct_completed}
                </span>
            ),
        },
        {
            id: "draft_completed",
            accessorKey: "draft_completed",
            accessorFn: (row: IJob) => row.draft_completed,
            header: ({ column }) => (
                <DataGridColumnHeader title="DRAFT COMPLETED" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[160px]">
                    {row.original.draft_completed}
                </span>
            ),
        },
        {
            id: "template_schedule",
            accessorKey: "template_schedule",
            accessorFn: (row: IJob) => row.template_schedule,
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATE SCHEDULE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.template_schedule}</span>
            ),
        },
         {
            id: "gp",
            accessorKey: "gp",
            accessorFn: (row: IJob) => row.gp,
            header: ({ column }) => (
                <DataGridColumnHeader title="GP" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.gp}</span>
            ),
        },
        {
            id: "template_received",
            accessorKey: "template_received",
            accessorFn: (row: IJob) => row.template_received,
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATE RECEIVED" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.template_received}</span>
            ),
        },
        {
            id: "templater",
            accessorKey: "templater",
            accessorFn: (row: IJob) => row.templater,
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATER" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.templater}</span>,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => <ActionsCell row={row} onView={() => handleView(path, row.original.fab_id)} />,
            enableSorting: false,
            size: 60,
        },
    ], [path]);

    // Filter columns based on data availability
    const columns = useMemo<ColumnDef<IJob>[]>(() => {
        return baseColumns.filter(column => {
            // Always show these columns regardless of data
            if (column.id === 'id' || column.id === 'actions') {
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

    return (
        <DataGrid
            table={table}
            recordCount={filteredData.length}
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
                            
                            {/* Enhanced Date Filter */}
                            <div className="flex items-center gap-2">
                                <Select value={dateFilter} onValueChange={(value) => {
                                    setDateFilter(value);
                                    if (value === 'custom') {
                                        setShowCustomDate(true);
                                    } else {
                                        setShowCustomDate(false);
                                    }
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Filter by date" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All Dates</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="7days">Last 7 Days</SelectItem>
                                        <SelectItem value="30days">Last 30 Days</SelectItem>
                                        <SelectItem value="custom">Custom Range</SelectItem>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2023">2023</SelectItem>
                                    </SelectContent>
                                </Select>
                                
                                {/* Custom Date Pickers - only shown when 'custom' is selected */}
                                {showCustomDate && (
                                    <div className="flex items-center gap-2">
                                        <DateTimePicker
                                            mode="date"
                                            value={customStartDate}
                                            onChange={setCustomStartDate}
                                            placeholder="Start date"
                                        />
                                        <span className="text-sm">to</span>
                                        <DateTimePicker
                                            mode="date"
                                            value={customEndDate}
                                            onChange={setCustomEndDate}
                                            placeholder="End date"
                                        />
                                    </div>
                                )}
                            </div>
                            
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