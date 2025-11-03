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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import type { DepartmentUser } from '@/store/api/department';





const StatusBadge = ({ gender }: { gender?: string }) => {
    if (!gender) return <span className="text-xs text-muted-foreground">-</span>;
    
    const colors: Record<string, string> = {
        male: 'bg-blue-100 text-blue-700',
        female: 'bg-pink-100 text-pink-700',
        other: 'bg-gray-100 text-gray-600',
    };

    return (
        <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[gender.toLowerCase()] || colors.other}`}
        >
            {gender.charAt(0).toUpperCase() + gender.slice(1)}
        </span>
    );
};

interface employeeProps {
    employees: DepartmentUser[];
}
const DepartmentTable = ({employees}:employeeProps) => {
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = useMemo(() => {
        if (!searchQuery) return employees;
        const query = searchQuery.toLowerCase();
        return employees.filter(
            (item) =>
                `${item.first_name} ${item.last_name}`.toLowerCase().includes(query) ||
                item.email.toLowerCase().includes(query) ||
                (item.phone && item.phone.toLowerCase().includes(query))
        );
    }, [searchQuery, employees]);

    const columns = useMemo<ColumnDef<DepartmentUser>[]>(
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
                id: 'name',
                accessorFn: (row) => `${row.first_name} ${row.last_name}`,
                header: ({ column }) => (
                    <DataGridColumnHeader title="EMPLOYEE NAME" column={column} />
                ),
                cell: ({ row }) => {
                    const fullName = `${row.original.first_name} ${row.original.last_name}`;
                    const initials = `${row.original.first_name[0]}${row.original.last_name[0]}`;
                    
                    return (
                        <div className="flex items-center truncate max-w-[200px]">
                            <Avatar className="w-8 h-8 mr-3">
                                {row.original.profile_photo_url && (
                                    <AvatarImage src={row.original.profile_photo_url} alt={fullName} />
                                )}
                                <AvatarFallback className="bg-gray-200 text-gray-600">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-text">{fullName}</span>
                        </div>
                    );
                },
                enableSorting: true,
                size: 200,
                meta: {
                    skeleton: <Skeleton className="h-5 w-[160px]" />,
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
                id: 'phone',
                accessorFn: (row) => row.phone,
                header: ({ column }) => (
                    <DataGridColumnHeader title="PHONE NO" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[130px]">
                        {row.original.phone || '-'}
                    </span>
                ),
                enableSorting: false,
                size: 130,
            },
            {
                id: 'gender',
                accessorFn: (row) => row.gender,
                header: ({ column }) => (
                    <DataGridColumnHeader title="GENDER" column={column} />
                ),
                cell: ({ row }) => <StatusBadge gender={row.original.gender} />,
                enableSorting: true,
                size: 120,
            },
        ],
        [],
    );

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
        getRowId: (row: DepartmentUser) => String(row.id),
        state: { pagination, sorting, rowSelection },
        columnResizeMode: 'onChange',
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableRowSelection: false,
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
                                {searchQuery?.length > 0 && (
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

                        <Button variant="outline" onClick={() => exportTableToCSV(table, "dapartment-employees")}>
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

export { DepartmentTable };
