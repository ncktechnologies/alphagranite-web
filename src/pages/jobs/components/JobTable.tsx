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

interface JobTableProps {
    jobs: IJob[];
    path:string
}

// const StatusBadge = ({ status }: { status: IJob['status'] }) => {
//   const colors: Record<IJob['status'], string> = {
//     Open: 'bg-green-100 text-green-700',
//     Closed: 'bg-gray-100 text-gray-600',
//     Paused: 'bg-yellow-100 text-yellow-700',
//   };

//   return (
//     <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}>
//       {status}
//     </span>
//   );
// };

export const JobTable = ({ jobs, path }: JobTableProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = useMemo(() => {
        if (!searchQuery) return jobs;
        return jobs.filter(
            (job) =>
                job.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.job_no.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, jobs]);
    const navigate = useNavigate();

    const handleView = (department: string) => {
        navigate(`/job/${department}/id`);
    };

    const columns = useMemo<ColumnDef<IJob>[]>(
        () => [
            {
                accessorKey: 'id',
                accessorFn: (row) => row.id,
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
                accessorFn: (row) => row.fab_type,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB TYPE" column={column} />
                ),
                cell: ({ row }) => <span className="text-sm">{row.original.fab_type}</span>,
            },
            {
                id: "fab_id",
                accessorFn: (row) => row.fab_id,
                header: ({ column }) => (
                    <DataGridColumnHeader title="FAB ID" column={column} />
                ),
                cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
            },
            {
                id: "job_name",
                accessorFn: (row) => row.job_name,
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
                accessorFn: (row) => row.job_no,
                header: ({ column }) => (
                    <DataGridColumnHeader title="JOB NO" column={column} />
                ),
                cell: ({ row }) => <span className="text-sm">{row.original.job_no}</span>,
            },
            {
                id: "acct_name",
                accessorFn: (row) => row.acct_name,
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
                id: "template_schedule",
                accessorFn: (row) => row.template_schedule,
                header: ({ column }) => (
                    <DataGridColumnHeader title="TEMPLATE SCHEDULE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm">{row.original.template_schedule}</span>
                ),
            },
            {
                id: "template_received",
                accessorFn: (row) => row.template_received,
                header: ({ column }) => (
                    <DataGridColumnHeader title="TEMPLATE RECEIVED" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm">{row.original.template_received}</span>
                ),
            },
            {
                id: "templater",
                accessorFn: (row) => row.templater,
                header: ({ column }) => (
                    <DataGridColumnHeader title="TEMPLATER" column={column} />
                ),
                cell: ({ row }) => <span className="text-sm">{row.original.templater}</span>,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => <ActionsCell row={row} onView={() => handleView(path)}/>,
                enableSorting: false,
                size: 60,
            },
        ],
        []
    );

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
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5">
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
                            <Select >
                                <SelectTrigger className="w-[170px] h-[34px]">
                                    <SelectValue placeholder="2 June - 9 June" />
                                </SelectTrigger>
                                <SelectContent className="w-32">
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select>
                                <SelectTrigger className="w-[100px] h-[34px]">
                                    <SelectValue placeholder="Gender" />
                                </SelectTrigger>
                                <SelectContent className="w-32">
                                    <SelectItem value="latest">Male</SelectItem>
                                    <SelectItem value="older">Female</SelectItem>
                                </SelectContent>
                            </Select>
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
