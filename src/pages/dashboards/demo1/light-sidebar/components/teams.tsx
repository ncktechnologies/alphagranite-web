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

interface ITeamsProps {
  recentJobs?: any[]; // RecentJob[] from dashboard API
}



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

const Teams = ({ recentJobs }: ITeamsProps) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Map RecentJob data to table format
  const mapRecentJobsToTableData = (recentJobsData: any[]): IData[] => {
    return recentJobsData.map((job, index) => ({
      id: job.fab_id || index + 1,
      status: job.fab_type === 'Standard' ? 'Standard' : 'FAB only',
      fabId: job.fab_id?.toString() || '',
      description: job.job_name || '',
      siteName: job.job_number || '',
      templater: job.salesperson || '',
      date: new Date(job.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric' 
      }),
      isNew: true, // Assuming all recent jobs are new
      isAssigned: job.stage !== 'Drafting',
      isCompleted: job.status === 'Completed',
      stage: job.stage as 'Completed' | 'Drafting' | 'Programming' || 'Drafting',
    }));
  };



  const tableData = useMemo(() => {
    // Only use backend data - no fallback values
    const sourceData: IData[] = recentJobs && recentJobs.length > 0 
      ? mapRecentJobsToTableData(recentJobs)
      : [];
    
    if (!searchQuery) return sourceData;
    return sourceData.filter(
      (item) =>
        item.fabId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [recentJobs, searchQuery]);

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
    data: tableData,
    pageCount: Math.ceil((tableData?.length || 0) / pagination.pageSize),
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
      recordCount={tableData?.length || 0}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader className="py-3.5 border-b">
          <CardTitle>Recent Jobs</CardTitle>
          <CardToolbar className="flex items-center gap-3">
            <Link to="/create-jobs">
            <Button
              variant="inverse"
              size="lg"
              className="text-primary font-semibold text-[16px] font-[24px] underline ml-auto"
            >
              See all
            </Button>
            </Link>
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
