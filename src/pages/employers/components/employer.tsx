import { useMemo, useState, useEffect } from 'react';
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
import { Search, X, Ellipsis } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Link } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useGetEmployeesQuery, Employee, useDeleteEmployeeMutation } from '@/store/api/employee';
import { useGetDepartmentsQuery } from '@/store/api/department';
import { useGetRolesQuery } from '@/store/api/role';
import EmployeeFormSheet from './employeeSheet';
import { toast } from 'sonner';
import { EmployeeActions } from './employee-actions';
import { usePermission } from '@/hooks/use-permission';
import { Can } from '@/components/permission';

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-600',
        deleted: 'bg-red-100 text-red-600',
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
        pageSize: 25,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Fetch employees from API with proper server-side pagination
    const { data: employeesData, isLoading, refetch } = useGetEmployeesQuery({
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedDepartment !== 'all' && { department_id: parseInt(selectedDepartment) }),
        ...(selectedStatus !== 'all' && { status_id: parseInt(selectedStatus) }),
    });

    // Fetch departments for filter
    const { data: departmentsData } = useGetDepartmentsQuery();

    const [deleteEmployee] = useDeleteEmployeeMutation();

    // Transform API data to match table structure
    const employees = useMemo(() => {
        if (!employeesData?.data) return [];
        return employeesData.data.map((emp: Employee) => ({
            ...emp,
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            email: emp.email,
            home_address: emp.home_address || 'N/A',
            department_name: emp.department_name || 'N/A',
            phone: emp.phone || 'N/A',
            role_name: emp.role_name || 'N/A',
            status_name: emp.status_name || 'N/A',
        }));
    }, [employeesData]);

    // Reset to first page when filters change
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [searchQuery, selectedDepartment, selectedStatus]);

    const handleView = (employee: Employee) => {
        setSelectedEmployee(employee);
        setSheetMode('view');
        setIsSheetOpen(true);
    };

    const handleEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setSheetMode('edit');
        setIsSheetOpen(true);
    };

    const handleDelete = async (employee: Employee) => {
        if (window.confirm(`Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`)) {
            try {
                await deleteEmployee(employee.id).unwrap();
                toast.success('Employee deleted successfully');
                refetch();
            } catch (error) {
                toast.error('Failed to delete employee');
            }
        }
    };

    const handleCreateNew = () => {
        setSelectedEmployee(null);
        setSheetMode('create');
        setIsSheetOpen(true);
    };

    const getEmployeeData = (id: number): Employee | undefined => {
        return employeesData?.data?.find((e: Employee) => e.id === id);
    };

    const filteredData = useMemo(() => {
        return employees;
    }, [employees]);

    const columns = useMemo<ColumnDef<Employee>[]>(
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
            {
                id: 'name',
                accessorFn: (row) => row.name,
                header: ({ column }) => (
                    <DataGridColumnHeader title="EMPLOYEE NAME" column={column} />
                ),
                cell: ({ row }) => (
                    <div className="flex items-center truncate max-w-[200px]">
                        <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage src={toAbsoluteUrl(row.original.profile_image_url || '')} alt="" >
                            </AvatarImage>
                            <AvatarFallback className="bg-gray-200 text-gray-600">
                                {row.original.name && row.original.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm  text-text">{row.original.name}</span>
                    </div>
                ),
                enableSorting: true,
                size: 220,
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
                id: 'address',
                accessorFn: (row) => row.home_address,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ADDRESS" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[280px]">
                        {row.original.home_address || 'n/a'}
                    </span>
                ),
                enableSorting: false,
                size: 280,
            },
            {
                id: 'department',
                accessorFn: (row) => row.department_name,
                header: ({ column }) => (
                    <DataGridColumnHeader title="DEPARTMENT" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[140px]">{row.original.department_name}</span>
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
                accessorFn: (row) => row.role_name,
                header: ({ column }) => (
                    <DataGridColumnHeader title="ROLE" column={column} />
                ),
                cell: ({ row }) => (
                    <span className="text-sm text-text truncate block max-w-[120px]">{row.original.role_name ?? 'N/A'}</span>
                ),
                enableSorting: true,
                size: 120,
            },
            {
                id: 'status',
                accessorFn: (row) => row.status_name,
                header: ({ column }) => (
                    <DataGridColumnHeader title="STATUS" column={column} />
                ),
                cell: ({ row }) => <StatusBadge status={row.original.status_name ?? 'N/A'} />,
                enableSorting: true,
                size: 110,
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    return (
                        <EmployeeActions
                            employee={row.original}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    );
                },
                enableSorting: false,
                size: 60,
            },
        ],
        [],
    );

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: employeesData?.total ? Math.ceil(employeesData.total / pagination.pageSize) : -1,
        getRowId: (row: Employee) => String(row.id),
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
        manualPagination: true, // Enable server-side pagination
    });

    return (
        <>
            <EmployeeFormSheet
                trigger={<></>}
                employee={selectedEmployee || undefined}
                mode={sheetMode}
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                onSubmitSuccess={refetch}
            />
            <DataGrid
                table={table}
                recordCount={employeesData?.total || 0}
                isLoading={isLoading}
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
                                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent className="w-40">
                                        <SelectItem value="all">All Departments</SelectItem>
                                        {departmentsData?.items?.map((dept: any) => (
                                            <SelectItem key={dept.id} value={String(dept.id)}>
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="w-[120px] h-[34px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="w-32">
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="1">Active</SelectItem>
                                        <SelectItem value="2">Inactive</SelectItem>
                                        <SelectItem value="3">Deleted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeading>
                        <CardToolbar>
                            <Can action="read" on="employees">
                                <Button variant="outline" onClick={(() => exportTableToCSV(table, "employees"))}>
                                    Export CSV
                                </Button>
                            </Can>
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
        </>
    );
};

export { Employees };