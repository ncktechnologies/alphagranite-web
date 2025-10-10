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

interface User {
  id: string;
  name: string;
  dateInvited: Date;
  status: 'Active' | 'Pending' | 'Inactive';
}

const data: User[] = [
  { id: '1', name: 'Cameron Williamson', dateInvited: new Date('2024-01-15'), status: 'Active' },
  { id: '2', name: 'Leslie Alexander', dateInvited: new Date('2024-01-16'), status: 'Pending' },
  { id: '3', name: 'Robert Fox', dateInvited: new Date('2024-01-17'), status: 'Active' },
  { id: '4', name: 'Jane Cooper', dateInvited: new Date('2024-01-18'), status: 'Inactive' },

];

const StatusBadge = ({ status }: { status: User['status'] }) => {
  const colors: Record<User['status'], string> = {
    Active: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Inactive: 'bg-gray-100 text-gray-700',
  };

  return (
    <Badge variant="secondary" className={`${colors[status]} hover:${colors[status]}`}>
      {status}
    </Badge>
  );
};

const UsersSection = () => {
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

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const columns = useMemo<ColumnDef<User>[]>(() => [
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
      accessorFn: (row) => row.name,
      header: ({ column }) => (
        <DataGridColumnHeader title="EMPLOYEE NAME" column={column} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Avatar className="w-8 h-8 mr-3">
            <AvatarFallback className="bg-gray-200 text-gray-600">
              {row.original.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-900">{row.original.name}</span>
        </div>
      ),
      enableSorting: true,
      size: 200,
      meta: {
        skeleton: <Skeleton className="h-4 w-[140px]" />,
      },
    },
    {
      id: 'dateInvited',
      accessorFn: (row) => row.dateInvited,
      header: ({ column }) => (
        <DataGridColumnHeader title="DATE INVITED" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {format(row.original.dateInvited, 'MMM dd, yyyy')}
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
    getRowId: (row: User) => row.id,
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