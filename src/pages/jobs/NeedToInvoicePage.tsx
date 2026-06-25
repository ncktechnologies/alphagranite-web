import { useState, useMemo, useEffect } from 'react';
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
import { Search, X, Plus, Ellipsis, MessageSquare } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetJobsQuery, Job, ToggleInvoiceRequest } from '@/store/api/job';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import JobFormSheet from './components/JobFormSheet';
import { Link } from 'react-router';
import { useToggleNeedToInvoiceMutation, useMarkJobInvoicedMutation, useAddJobNotesMutation } from '@/store/api/job';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';

// Update the ExtendedJob interface to include API fields
interface ExtendedJob extends Omit<Job, 'project_value'> {
  sales_person_name?: string;
  status?: string;
  project_value?: string;
  account_name?: string;
  account_id?: number;
  need_to_invoice?: boolean;
  notes?: string | Array<{ note: string }>;
  invoiced_at?: string;
}

export const NeedToInvoicePage = () => {
  const isSuperAdmin = useIsSuperAdmin();
  const permissions = usePermission('Need to Invoice');
  const canManageInvoice = isSuperAdmin || permissions.can_create;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [invoicedPagination, setInvoicedPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [invoicedSorting, setInvoicedSorting] = useState<SortingState>([]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [invoicedRowSelection, setInvoicedRowSelection] = useState<RowSelectionState>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [invoicedSearchQuery, setInvoicedSearchQuery] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [invoicedSelectedStatus, setInvoicedSelectedStatus] = useState<string>('all');

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Note modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentJobForNote, setCurrentJobForNote] = useState<ExtendedJob | null>(null);
  const [noteText, setNoteText] = useState('');

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'unmark' | 'invoice' | null>(null);
  const [jobForAction, setJobForAction] = useState<ExtendedJob | null>(null);

  // API hooks
  const { data: jobsData, isLoading, refetch } = useGetJobsQuery({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    ...(searchQuery && { search: searchQuery }),
    ...(selectedStatus !== 'all' && { status_id: parseInt(selectedStatus) }),
    need_to_invoice: true,
    include_notes: true,
  });

  const { data: invoicedJobsData, isLoading: isInvoicedLoading, refetch: refetchInvoiced } = useGetJobsQuery({
    skip: invoicedPagination.pageIndex * invoicedPagination.pageSize,
    limit: invoicedPagination.pageSize,
    ...(invoicedSearchQuery && { search: invoicedSearchQuery }),
    ...(invoicedSelectedStatus !== 'all' && { status_id: parseInt(invoicedSelectedStatus) }),
    is_invoiced: true,
    include_notes: true,
  });

  const [toggleNeedToInvoice] = useToggleNeedToInvoiceMutation();
  const [markJobInvoiced] = useMarkJobInvoicedMutation();
  const [addJobNotes] = useAddJobNotesMutation();

  // Transform data
  const jobs = useMemo(() => {
    if (!jobsData) return [];
    return jobsData.data.map((job: any) => ({
      ...job,
      project_value: job.project_value || 'N/A',
      updated_at: job.updated_at || 'N/A',
      status: job.status_id === 1 ? 'Active' : job.status_id === 2 ? 'Inactive' : job.status_id === 3 ? 'Completed' : 'N/A',
      need_to_invoice: job.need_to_invoice,
      invoiced_at: job.invoiced_at || '',
    } as ExtendedJob));
  }, [jobsData]);

  const invoicedJobs = useMemo(() => {
    if (!invoicedJobsData) return [];
    return invoicedJobsData.data.map((job: any) => ({
      ...job,
      project_value: job.project_value || 'N/A',
      updated_at: job.updated_at || 'N/A',
      status: job.status_id === 1 ? 'Active' : job.status_id === 2 ? 'Inactive' : job.status_id === 3 ? 'Completed' : 'N/A',
      need_to_invoice: job.need_to_invoice,
      invoiced_at: job.invoiced_at || '',
    } as ExtendedJob));
  }, [invoicedJobsData]);

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

  const handleCreateNew = () => {
    setSelectedJob(null);
    setSheetMode('create');
    setIsSheetOpen(true);
  };

  // --- Invoice action handlers ---
  const handleOpenNoteModal = (job: ExtendedJob) => {
    setCurrentJobForNote(job);
    setNoteText('');
    setIsNoteModalOpen(true);
  };

  const handleAddNote = async (job: ExtendedJob, note: string) => {
    try {
      await addJobNotes({ job_id: job.id, note }).unwrap();
      toast.success('Note added successfully');
      refetch();
      refetchInvoiced();
      setIsNoteModalOpen(false);
      setNoteText('');
      setCurrentJobForNote(null);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleOpenConfirm = (job: ExtendedJob, action: 'unmark' | 'invoice') => {
    setJobForAction(job);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!jobForAction) return;
    try {
      if (confirmAction === 'unmark') {
        await toggleNeedToInvoice({ job_id: jobForAction.id }).unwrap();
        toast.success('Removed from Need to Invoice list');
        refetch();
        refetchInvoiced();
      } else if (confirmAction === 'invoice') {
        await markJobInvoiced({ job_id: jobForAction.id }).unwrap();
        toast.success('Job marked as invoiced');
        refetch();
        refetchInvoiced();
      }
      setIsConfirmDialogOpen(false);
      setJobForAction(null);
      setConfirmAction(null);
    } catch (error) {
      toast.error('Failed to perform action');
    }
  };

  // Reset pagination on filter change
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedStatus]);

  useEffect(() => {
    setInvoicedPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [invoicedSearchQuery, invoicedSelectedStatus]);

  // Common columns
  const commonColumns = useMemo<ColumnDef<ExtendedJob>[]>(() => [
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
      cell: ({ row }) => <span className="text-sm text-text">{row.original.name}</span>,
      enableSorting: true,
      size: 200,
    },
    {
      id: 'job_number',
      accessorFn: (row) => row.job_number,
      header: ({ column }) => <DataGridColumnHeader title="JOB NUMBER" column={column} />,
      cell: ({ row }) => (
        <Link
          to={`/job/details/${row.original.id}`}
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          {row.original.job_number}
        </Link>
      ),
      enableSorting: true,
      size: 150,
    },
    {
      id: 'project_value',
      accessorFn: (row) => row.project_value,
      header: ({ column }) => <DataGridColumnHeader title="PROJECT VALUE" column={column} />,
      cell: ({ row }) => (
        <span className="text-sm text-text">
          {row.original.project_value ? `$${row.original.project_value}` : 'N/A'}
        </span>
      ),
      enableSorting: true,
      size: 150,
    },
    {
      id: 'created_at',
      accessorFn: (row) => row.created_at,
      header: ({ column }) => <DataGridColumnHeader title="CREATED AT" column={column} />,
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
      header: ({ column }) => <DataGridColumnHeader title="SALES PERSON" column={column} />,
      cell: ({ row }) => <span className="text-sm text-text">{row.original.sales_person_name || 'N/A'}</span>,
      enableSorting: true,
      size: 150,
    },
    {
      id: 'account_name',
      accessorFn: (row) => row.account_name,
      header: ({ column }) => <DataGridColumnHeader title="ACCOUNT NAME" column={column} />,
      cell: ({ row }) => <span className="text-sm text-text">{row.original.account_name || 'N/A'}</span>,
      enableSorting: true,
      size: 150,
    },
    {
      id: 'notes',
      accessorKey: 'notes',
      accessorFn: (row) => {
        if (typeof row.notes === 'string') return row.notes;
        if (Array.isArray(row.notes) && row.notes.length > 0) {
          const firstNote = row.notes[0];
          return typeof firstNote === 'string' ? firstNote : firstNote?.note || '';
        }
        return '';
      },
      header: ({ column }) => <DataGridColumnHeader title="ACCOUNTING NOTE" column={column} />,
      cell: ({ row }) => {
        const notes = row.original.notes;
        if (typeof notes === 'string') return <span className="text-xs">{notes}</span>;
        if (Array.isArray(notes) && notes.length > 0) {
          const firstNote = notes[0];
          const noteText = typeof firstNote === 'string' ? firstNote : firstNote?.note;
          return <span className="text-xs">{noteText || '-'}</span>;
        }
        return <span className="text-xs">-</span>;
      },
      size: 150,
      enableSorting: true,
    },
  ], []);

  // Columns for the "Need to Invoice" table – NO toggle
  const needToInvoiceColumns = useMemo<ColumnDef<ExtendedJob>[]>(() => {
    const baseColumns: ColumnDef<ExtendedJob>[] = [...commonColumns];
    baseColumns.push({
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
            <DropdownMenuItem onClick={() => handleView(row.original)}>View</DropdownMenuItem>
            {canManageInvoice && (
              <>
                <DropdownMenuItem onClick={() => handleOpenNoteModal(row.original)}>
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleOpenConfirm(row.original, 'unmark')}>
                  Unmark Need to Invoice
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenConfirm(row.original, 'invoice')}>
                  Mark Invoiced
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      size: 60,
    });
    return baseColumns;
  }, [commonColumns, canManageInvoice, handleView, handleOpenNoteModal, handleOpenConfirm]);

  // Columns for the "Invoiced" table
  const invoicedColumns = useMemo<ColumnDef<ExtendedJob>[]>(() => [
    ...commonColumns,
    {
      id: 'invoiced_status',
      accessorFn: (row) => 'Invoiced',
      header: ({ column }) => <DataGridColumnHeader title="INVOICED STATUS" column={column} />,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Invoiced
          </span>
        </div>
      ),
      enableSorting: false,
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
            <DropdownMenuItem onClick={() => handleView(row.original)}>View</DropdownMenuItem>
            {canManageInvoice && (
              <DropdownMenuItem onClick={() => handleOpenNoteModal(row.original)}>
                Add Note
              </DropdownMenuItem>
            )}
            {/* Optionally allow Unmark? */}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      size: 60,
    },
  ], [commonColumns, canManageInvoice, handleView, handleOpenNoteModal]);

  // Tables
  const needToInvoiceTable = useReactTable({
    columns: needToInvoiceColumns,
    data: jobs,
    pageCount: jobsData ? Math.ceil(jobsData.total / pagination.pageSize) : -1,
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

  const invoicedTable = useReactTable({
    columns: invoicedColumns,
    data: invoicedJobs,
    pageCount: invoicedJobsData ? Math.ceil(invoicedJobsData.total / invoicedPagination.pageSize) : -1,
    getRowId: (row: ExtendedJob) => String(row.id),
    state: { pagination: invoicedPagination, sorting: invoicedSorting, rowSelection: invoicedRowSelection },
    columnResizeMode: 'onChange',
    onPaginationChange: setInvoicedPagination,
    onSortingChange: setInvoicedSorting,
    enableRowSelection: true,
    onRowSelectionChange: setInvoicedRowSelection,
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
        onSubmitSuccess={() => { refetch(); refetchInvoiced(); }}
      />

      {/* Note Modal */}
      <Dialog open={isNoteModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsNoteModalOpen(false);
          setCurrentJobForNote(null);
          setNoteText('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Accounting Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="note" className="block text-sm font-medium mb-2">
                Note for {currentJobForNote?.name || ''}
              </label>
              <Textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter any accounting notes..."
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNoteModalOpen(false);
                  setCurrentJobForNote(null);
                  setNoteText('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => currentJobForNote && handleAddNote(currentJobForNote, noteText)}
                disabled={!currentJobForNote}
              >
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'unmark' ? 'Remove from Need to Invoice' : 'Mark as Invoiced'}
            </DialogTitle>
          </DialogHeader>
          <p className="py-4">
            {confirmAction === 'unmark'
              ? 'Are you sure you want to remove this job from the "Need to Invoice" list?'
              : 'Are you sure you want to mark this job as invoiced? This action cannot be undone.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              No
            </Button>
            <Button onClick={handleConfirmAction}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="need-to-invoice" className="w-full">
        <CardHeader className="py-3.5 border-b flex flex-row items-center justify-between">
          <CardHeading>
            <TabsList>
              <TabsTrigger value="need-to-invoice">Need to Invoice</TabsTrigger>
              <TabsTrigger value="invoiced">Invoiced</TabsTrigger>
            </TabsList>
          </CardHeading>
        </CardHeader>

        <TabsContent value="need-to-invoice" className="mt-0 border-0 p-0">
          <DataGrid
            table={needToInvoiceTable}
            recordCount={jobsData?.total || 0}
            isLoading={isLoading}
            groupByDate
            dateKey="invoiced_at"
            dateGrouping="date"
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
                </CardHeader>
                <CardTable>
                  <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                    <DataGridTable />
                    <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                  </ScrollArea>
                </CardTable>
                <CardFooter>
                  <DataGridPagination />
                </CardFooter>
              </Card>
            </Container>
          </DataGrid>
        </TabsContent>

        <TabsContent value="invoiced" className="mt-0 border-0 p-0">
          <DataGrid
            table={invoicedTable}
            recordCount={invoicedJobsData?.total || 0}
            isLoading={isInvoicedLoading}
            groupByDate
            dateKey="invoiced_at"
            dateGrouping="date"
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
                          placeholder="Search Invoiced Jobs..."
                          value={invoicedSearchQuery}
                          onChange={(e) => setInvoicedSearchQuery(e.target.value)}
                          className="ps-9 w-[230px] h-[34px]"
                        />
                        {invoicedSearchQuery.length > 0 && (
                          <Button
                            mode="icon"
                            variant="ghost"
                            className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                            onClick={() => setInvoicedSearchQuery('')}
                          >
                            <X />
                          </Button>
                        )}
                      </div>
                      <Select value={invoicedSelectedStatus} onValueChange={setInvoicedSelectedStatus}>
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
        </TabsContent>
      </Tabs>
    </>
  );
};