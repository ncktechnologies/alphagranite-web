// components/JobsSection.tsx
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
import { Container } from '@/components/common/container';
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
import { Search, X, Plus, Ellipsis } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetJobsQuery, useCreateJobMutation, useUpdateJobMutation, useDeleteJobMutation, Job, useGetJobByIdQuery, JobListParams } from '@/store/api/job';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import JobFormSheet from './components/JobFormSheet';

// Update the ExtendedJob interface to include API fields
interface ExtendedJob extends Job {
  sales_person_name?: string;
  status?: string;
  project_value?: string | number | null;
  account_name?: string;
  account_id?: number;
  // Add any other fields that come from API
}

export const JobsSection = () => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // API hooks
  const { data: jobsData, isLoading, refetch } = useGetJobsQuery({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    ...(searchQuery && { search: searchQuery }),
    ...(selectedStatus !== 'all' && { status_id: parseInt(selectedStatus) }),
  });

  const [deleteJob] = useDeleteJobMutation();

  // Transform API data to match table structure
  const jobs = useMemo(() => {
    if (!jobsData) return [];
    return jobsData.map((job: any) => ({
      ...job,
      // Only transform what's necessary
      project_value: job.project_value || 'N/A',
      updated_at: job.updated_at || 'N/A',
      status: job.status_id === 1 ? 'Active' : job.status_id === 2 ? 'Inactive' : job.status_id === 3 ? 'Completed' : 'N/A',
      // The API already provides sales_person_name, so don't override it
      // sales_person_name is already included from the spread operator
    } as ExtendedJob));
  }, [jobsData]);

  const handleView = (job: ExtendedJob) => {
    setSelectedJob(job as Job);
    setSheetMode('view');
    setIsSheetOpen(true);
  };

  const handleEdit = (job: ExtendedJob) => {
    setSelectedJob(job as Job);
    setSheetMode('edit');
    setIsSheetOpen(true);
  };

  const handleDelete = async (job: ExtendedJob) => {
    if (window.confirm(`Are you sure you want to delete job ${job.name}?`)) {
      try {
        await deleteJob(job.id).unwrap();
        toast.success('Job deleted successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to delete job');
      }
    }
  };

  const handleCreateNew = () => {
    setSelectedJob(null);
    setSheetMode('create');
    setIsSheetOpen(true);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedStatus]);

  const columns = useMemo<ColumnDef<ExtendedJob>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="JOB NAME" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">{row.original.name}</span>
        ),
        enableSorting: true,
        size: 200,
      },
      {
        id: 'job_number',
        accessorFn: (row) => row.job_number,
        header: ({ column }) => (
          <DataGridColumnHeader title="JOB NUMBER" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">{row.original.job_number}</span>
        ),
        enableSorting: true,
        size: 150,
      },
      {
        id: 'project_value',
        accessorFn: (row) => row.project_value,
        header: ({ column }) => (
          <DataGridColumnHeader title="PROJECT VALUE" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">
            {typeof row.original.project_value === 'number' 
              ? `$${row.original.project_value.toLocaleString()}` 
              : row.original.project_value}
          </span>
        ),
        enableSorting: true,
        size: 150,
      },
      {
        id: 'created_at',
        accessorFn: (row) => row.created_at,
        header: ({ column }) => (
          <DataGridColumnHeader title="CREATED AT" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
        enableSorting: true,
        size: 150,
      },
      {
        id: 'sales_person_name',
        accessorFn: (row) => row.sales_person_name,
        header: ({ column }) => (
          <DataGridColumnHeader title="SALES PERSON" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">
            {row.original.sales_person_name || 'N/A'}
          </span>
        ),
        enableSorting: true,
        size: 150,
      },
      {
        id: 'status',
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataGridColumnHeader title="STATUS" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-text">{row.original.status || 'N/A'}</span>
        ),
        enableSorting: true,
        size: 120,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(row.original)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        size: 60,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: jobs,
    pageCount: jobsData ? Math.ceil(jobsData.length / pagination.pageSize) : -1,
    getRowId: (row: ExtendedJob) => String(row.id),
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
    manualPagination: true,
  });

  return (
    <>
      <JobFormSheet
        trigger={<></>}
        job={selectedJob || undefined}
        mode={sheetMode}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSubmitSuccess={refetch}
      />
      <DataGrid
        table={table}
        recordCount={jobsData?.length || 0}
        isLoading={isLoading}
        tableLayout={{
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
          cellBorder: true,
        }}
      >
        <Container>
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
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[120px] h-[34px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="w-32">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="1">Active</SelectItem>
                      <SelectItem value="2">Inactive</SelectItem>
                      <SelectItem value="3">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeading>
              <CardToolbar>
                <Can action="create" on="jobs">
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Job
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
        </Container>
      </DataGrid>
    </>
  );
};