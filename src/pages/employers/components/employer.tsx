import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    RowSelectionState,
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
    CardTitle,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Link } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';

export interface IEmployee {
    id: number;
    name: string;
    email: string;
    address: string;
    department: string;
    phone: string;
    role: string;
    status: 'Active' | 'Deactivated';
}

const employees: IEmployee[] = [
    {
        id: 1,
        name: 'Cameron Williamson',
        email: 'tim.jennings@example.com',
        address: '8502 Preston Rd. Inglewood, Maine 98380',
        department: 'Sales',
        phone: '(704) 555-0113',
        role: 'Sales',
        status: 'Active',
    },
    {
        id: 2,
        name: 'Esther Howard',
        email: 'willie.jennings@example.com',
        address: '2715 Ash Dr. San Jose, South Dakota 83475',
        department: 'Front office',
        phone: '(704) 555-0112',
        role: 'Front office',
        status: 'Deactivated',
    },
    {
        id: 3,
        name: 'Leslie Alexander',
        email: 'michelle.rivera@example.com',
        address: '4140 Parker Rd. Allentown, New Mexico 31134',
        department: 'CAD',
        phone: '(684) 555-0108',
        role: 'CAD',
        status: 'Deactivated',
    },
    {
        id: 4,
        name: 'Jenny Wilson',
        email: 'deanna.curtis@example.com',
        address: '4140 Parker Rd. Allentown, New Mexico 31134',
        department: 'Warehouse',
        phone: '(704) 555-0120',
        role: 'Warehouse',
        status: 'Active',
    },
    {
        id: 5,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 6,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 7,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 8,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 9,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 10,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 11,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },
    {
        id: 12,
        name: 'Darlene Robertson',
        email: 'felicia.reid@example.com',
        address: '2972 Westheimer Rd. Santa Ana, Illinois 85486',
        department: 'Production',
        phone: '(480) 555-0121',
        role: 'Production',
        status: 'Deactivated',
    },


];

const StatusBadge = ({ status }: { status: IEmployee['status'] }) => {
    const colors: Record<IEmployee['status'], string> = {
        Active: 'bg-green-100 text-green-700',
        Deactivated: 'bg-gray-100 text-gray-600',
    };

    return (
        <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status]}`}
        >
            {status}
        </span>
    );
};

const Employees = () => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = useMemo(() => {
        if (!searchQuery) return employees;
        return employees.filter(
            (item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.department.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [searchQuery]);

    const columns = useMemo<ColumnDef<IEmployee>[]>(
        () => [
            {
                accessorKey: 'id',
                accessorFn: (row) => row.id,
                header: () => <DataGridTableRowSelectAll />,
                cell: ({ row }) => <DataGridTableRowSelect row={row} />,
                enableSorting: false,
                enableHiding: false,
                enableResizing: false,
                size: 51,
                meta: {
                    cellClassName: '',
                },
            },
            // {
            //     id: 'name',
            //     accessorFn: (row) => row.name,
            //     header: ({ column }) => (
            //         <DataGridColumnHeader title="EMPLOYEE NAME" column={column} />
            //     ),
            //     cell: ({ row }) => (
            //         <div className="flex items-center truncate max-w-[200px]">
            //             <Avatar className="w-8 h-8 mr-3">
            //                 <AvatarFallback className="bg-gray-200 text-gray-600">
            //                     {row.original.name.split(' ').map(n => n[0]).join('')}
            //                 </AvatarFallback>
            //             </Avatar>
            //             <span className="text-sm  text-text">{row.original.name}</span>
            //         </div>
            //     ),
            //     enableSorting: true,
            //     size: 200,
            //     meta: {
            //         skeleton: <Skeleton className="h-5 w-[160px]" />,
            //     },
            // },
            {
                id: 'users',
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader title="Member" column={column} />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center gap-4">
                        <Avatar className="w-8 h-8 mr-3">
                            <AvatarFallback className="bg-gray-200 text-gray-600">
                                {row.original.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5">
                            <Link
                                to="#"
                                className="text-sm font-medium text-mono hover:text-primary-active mb-px"
                            >
                                {row.original.name}
                            </Link>
                            <Link
                                to="#"
                                className="text-sm text-secondary-foreground font-normal hover:text-primary-active"
                            >
                                {row.original.email}
                            </Link>
                        </div>
                    </div>
                ),
                enableSorting: true,
                size: 300,
                meta: {
                    headerClassName: '',
                },
            },
            {
                id: 'email',
                accessorFn: (row) => row.email,
                header: ({ column }) => (
                    <DataGridColumnHeader title="EMAIL" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[200px]">
                        {row.original.email}
                    </span>
                ),
                enableSorting: true,
                size: 200,
            },
            {
                id: 'address',
                accessorFn: (row) => row.address,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ADDRESS" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[280px]">
                        {row.original.address}
                    </span>
                ),
                enableSorting: false,
                size: 280,
            },
            {
                id: 'department',
                accessorFn: (row) => row.department,
                header: ({ column }) => (
                    <DataGridColumnHeader title="DEPARTMENT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[140px]">{row.original.department}</span>
                ),
                enableSorting: true,
                size: 140,
            },
            {
                id: 'phone',
                accessorFn: (row) => row.phone,
                header: ({ column }) => (
                    <DataGridColumnHeader title="PHONE NO" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[130px]">{row.original.phone}</span>
                ),
                enableSorting: false,
                size: 130,
            },
            {
                id: 'role',
                accessorFn: (row) => row.role,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ROLE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[120px]">{row.original.role}</span>
                ),
                enableSorting: true,
                size: 120,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status,
                header: ({ column }) => (
                    <DataGridColumnHeader title="STATUS" column={column} />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
                enableSorting: true,
                size: 110,
            },
        ],
        [],
    );

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
        getRowId: (row: IEmployee) => String(row.id),
        state: { pagination, sorting, rowSelection },
        columnResizeMode: 'onChange',
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <DataGrid
            table={table}
            recordCount={filteredData?.length || 0}
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
                                    placeholder="Search Users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
                                />
                                {searchQuery.length > 0 && (
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

                        <Button variant="outline" onClick={(() => exportTableToCSV(table, "employees"))}>
                            Export CSV
                        </Button>
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

export { Employees };
