'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarGroup } from '@/partials/common/avatar-group';
import { Rating } from '@/partials/common/rating';
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
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
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
import { Link } from 'react-router';

interface IData {
  id: number;
  status: 'Standard' | 'FAB only';
  fabId: string;
  description: string;
  siteName: string;
  templater?: string;
  date: string;
  isNew: boolean;
  isAssigned: boolean;
  isCompleted: boolean;
  stage: 'Completed' | 'Drafting' | 'Programming';
}

const data: IData[] = [
  {
    id: 1,
    status: 'Standard',
    fabId: '13453',
    description: 'Preston Kitchen floor',
    siteName: '9999',
    date: 'Oct 06, 2025',
    templater:"Esther Howard",
    isNew: true,
    isAssigned: true,
    isCompleted: true,
    stage: 'Completed',
  },
  {
    id: 2,
    status: 'FAB only',
    fabId: '97346',
    description: 'Preston Kitchen floor',
    siteName: '8997',
    date: 'Oct 06, 2025',
    templater:"Esther Howard",
    isNew: false,
    isAssigned: true,
    isCompleted: true,
    stage: 'Drafting',
  },
  {
    id: 3,
    status: 'FAB only',
    fabId: '60015',
    description: 'Preston Kitchen floor',
    siteName: '9989',
    templater:"Esther Howard",
    date: 'Oct 06, 2025',
    isNew: true,
    isAssigned: false,
    isCompleted: true,
    stage: 'Drafting',
  },
  {
    id: 4,
    status: 'Standard',
    fabId: '80950',
    description: 'Preston Kitchen floor',
    siteName: '9089',
    date: 'Oct 06, 2025',
    templater:"Esther Howard",
    isNew: true,
    isAssigned: false,
    isCompleted: false,
    stage: 'Programming',
  },
  {
    id: 5,
    status: 'FAB only',
    fabId: '67900',
    description: 'Preston Kitchen floor',
    siteName: '9098',
    date: 'Oct 06, 2025',
    isNew: true,
    isAssigned: true,
    isCompleted: false,
    stage: 'Programming',
  },
];

const BooleanPill = ({ value }: { value: boolean }) => {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-semibold rounded-full 
        }`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
};

const StageBadge = ({ stage }: { stage: IData['stage'] }) => {
  const colors: Record<IData['stage'], string> = {
    Completed: 'bg-green-100 text-green-700',
    Drafting: 'bg-purple-100 text-purple-700',
    Programming: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[stage]}`}
    >
      {stage}
    </span>
  );
};

const Teams = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updated_at', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(
      (item) =>
        item.fabId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  const columns = useMemo<ColumnDef<IData>[]>(() => [
    // {
    //   accessorKey: 'id',
    //   accessorFn: (row) => row.id,
    //   header: () => <DataGridTableRowSelectAll />,
    //   cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    //   enableSorting: false,
    //   enableHiding: false,
    //   enableResizing: false,
    //   size: 48,
    //   meta: {
    //     cellClassName: '',
    //   },
    // },
    {
      id: 'status',
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader title="FAB TYPE" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">
          {row.original.status}
        </span>
      ),
      enableSorting: true,
      size: 120,
      meta: {
        skeleton: <Skeleton className="h-4 w-[80px]" />,
      },
    },
    {
      id: 'fabId',
      accessorFn: (row) => row.fabId,
      header: ({ column }) => (
        <DataGridColumnHeader title="FAB ID" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">
          {row.original.fabId}
        </span>
      ),
      enableSorting: true,
      size: 80,
      meta: {
        skeleton: <Skeleton className="h-4 w-[60px]" />,
      },
    },
    {
      id: 'description',
      accessorFn: (row) => row.description,
      header: ({ column }) => (
        <DataGridColumnHeader title="JOB NAME" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">
          {row.original.description}
        </span>
      ),
      enableSorting: true,
      size: 130,
      meta: {
        skeleton: <Skeleton className="h-4 w-[140px]" />,
      },
    },
    {
      id: 'siteName',
      accessorFn: (row) => row.siteName,
      header: ({ column }) => (
        <DataGridColumnHeader title="JOB NO" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">
          {row.original.siteName}
        </span>
      ),
      enableSorting: true,
      size: 90,
      meta: {
        skeleton: <Skeleton className="h-4 w-[90px]" />,
      },
    },
    {
      id: 'date',
      accessorFn: (row) => row.date,
      header: ({ column }) => (
        <DataGridColumnHeader title="TEMPLATE SCHEDULE" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">{row.original.date}</span>
      ),
      enableSorting: true,
      size: 150,
      meta: {
        skeleton: <Skeleton className="h-4 w-[70px]" />,
      },
    },
    {
      id: 'templater',
      accessorFn: (row) => row.date,
      header: ({ column }) => (
        <DataGridColumnHeader title="TEMPLATER" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-text">{row.original.templater}</span>
      ),
      enableSorting: true,
      size: 100,
      meta: {
        skeleton: <Skeleton className="h-4 w-[70px]" />,
      },
    },
    {
      id: 'isNew',
      accessorFn: (row) => row.isNew,
      header: ({ column }) => (
        <DataGridColumnHeader title="TEMPLATE RECEIVED" column={column} />
      ),
      cell: ({ row }) => (
        <BooleanPill value={row.original.isNew} />
      ),
      enableSorting: true,
      size: 130,
      meta: {
        skeleton: <Skeleton className="h-4 w-[40px]" />,
      },
    },
    
    {
      id: 'stage',
      accessorFn: (row) => row.stage,
      header: ({ column }) => (
        <DataGridColumnHeader title="STATUS" column={column} />
      ),
      cell: ({ row }) => (
        <StageBadge stage={row.original.stage} />
      ),
      enableSorting: true,
      size: 110,
      meta: {
        skeleton: <Skeleton className="h-5 w-[60px]" />,
      },
    },
  ], []);

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row: IData) => String(row.id),
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
        <CardHeader className="py-3.5">
          <CardTitle>Recent Jobs</CardTitle>
          <CardToolbar className="relative">
            {/* <Search className="size-4 text-text absolute start-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search Teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-40"
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
            )} */}
            <Link to="/">See all</Link>
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

export { Teams };
