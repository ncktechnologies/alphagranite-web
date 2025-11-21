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
import { Search, X, CalendarIcon, Filter, UserRoundPlusIcon } from 'lucide-react';
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
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Role, RoleMember } from '@/store/api/role';

interface UsersSectionProps {
  role: Role;
}

const StatusBadge = ({ status }: { status: number | undefined }) => {
  const getStatusInfo = (s: number | undefined) => {
    if (s === 1) return { label: 'Active', color: 'bg-green-100 text-green-700' };
    if (s === 2) return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-700' };
  };

  const statusInfo = getStatusInfo(status);

  return (
    <Badge variant="secondary" className={`${statusInfo.color} hover:${statusInfo.color}`}>
      {statusInfo.label}
    </Badge>
  );
};

const UsersSection = ({ role }: UsersSectionProps) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dateInvited', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined, to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [genderFilter, setGenderFilter] = useState('All');

  const members = role.members?.data || [];

  console.log(members, "dkc")

  const filteredData = useMemo(() => {
    if (!searchQuery) return members;
    return members.filter(
      (item) =>
        `${item.first_name} ${item.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, members]);

  const columns = useMemo<ColumnDef<RoleMember>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <DataGridTableRowSelectAll />
      ),
      cell: ({ row }) => (
        <DataGridTableRowSelect row={row} />
      ),
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
          <div className="flex items-center">
            <Avatar className="w-8 h-8 mr-3">
              {row.original.profile_image_url && (
                <AvatarImage src={row.original.profile_image_url} alt={fullName} />
              )}
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900">{fullName}</span>
          </div>
        );
      },
      enableSorting: true,
      size: 200,
      meta: {
        skeleton: <Skeleton className="h-4 w-[140px]" />,
      },
    },
    {
      id: 'dateInvited',
      accessorFn: (row) => row.invited_at,
      header: ({ column }) => (
        <DataGridColumnHeader title="DATE INVITED" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {row.original.invited_at ? format(new Date(row.original.invited_at), 'MMM dd, yyyy') : '-'}
        </span>
      ),
      enableSorting: true,
      size: 150,
      meta: {
        skeleton: <Skeleton className="h-4 w-[100px]" />,
      },
    },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader title="STATUS" column={column} />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} />
      ),
      enableSorting: true,
      size: 100,
      meta: {
        skeleton: <Skeleton className="h-5 w-[60px]" />,
      },
    },
  ], []);

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row: RoleMember) => String(row.id),
    state: {
      pagination,
      sorting,
      rowSelection,
    },
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
        <CardHeader className="py-3.5 ">
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

            <Button >
              <UserRoundPlusIcon />
              Assign Role
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

export { UsersSection };