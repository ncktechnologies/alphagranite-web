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
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useGetJobsQuery, useDeleteJobMutation, Job, useGetAccountsQuery, ToggleInvoiceRequest } from '@/store/api/job';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import JobFormSheet from './components/JobFormSheet';
import { Link } from 'react-router';
import { useToggleNeedToInvoiceMutation, useMarkJobInvoicedMutation, useAddJobNotesMutation } from '@/store/api/job';

interface ExtendedJob extends Omit<Job, 'project_value'> {
  sales_person_name?: string;
  status?: string;
  project_value?: string;
  sq_ft?: string;
  account_name?: string;
  account_id?: number;
  need_to_invoice?: boolean;
  invoiced_at?: string;
  notes?: string | Array<{ note: string }>;
}

interface JobsSectionProps {
  canToggleInvoice?: boolean;
}

export const JobsSection = ({ canToggleInvoice = true }: JobsSectionProps) => {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Dialog states
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [currentJobForNote, setCurrentJobForNote] = useState<ExtendedJob | null>(null);
  const [noteText, setNoteText] = useState('');
  const [markAsNeedInvoice, setMarkAsNeedInvoice] = useState(true);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'unmark' | 'invoice' | null>(null);
  const [jobForAction, setJobForAction] = useState<ExtendedJob | null>(null);

  // API hooks
  const { data: jobsData, isLoading, refetch } = useGetJobsQuery({
    skip: pagination.pageIndex * pagination.pageSize,
    limit: pagination.pageSize,
    ...(searchQuery && { search: searchQuery }),
    ...(selectedStatus !== 'all' && { status_id: parseInt(selectedStatus) }),
    include_notes: true,
  });
  const { data: accountsData } = useGetAccountsQuery({ limit: 1000 });

  const [deleteJob] = useDeleteJobMutation();
  const [toggleNeedToInvoice] = useToggleNeedToInvoiceMutation();
  const [markJobInvoiced] = useMarkJobInvoicedMutation();
  const [addJobNotes] = useAddJobNotesMutation();

  const accountNameMap = useMemo(() => {
    if (!accountsData) return new Map<number, string>();
    return new Map(accountsData.map(account => [account.id, account.name]));
  }, [accountsData]);

  const jobs = useMemo(() => {
    if (!jobsData) return [];
    return jobsData.data.map((job: any) => ({
      ...job,
      project_value: job.project_value || 'N/A',
      sq_ft: job.sq_ft || 'N/A',
      updated_at: job.updated_at || 'N/A',
      status: job.status_id === 1 ? 'Active' : job.status_id === 2 ? 'Inactive' : job.status_id === 3 ? 'Completed' : 'N/A',
      need_to_invoice: job.need_to_invoice,
      invoiced_at: job.invoiced_at || '',
      account_name: job.account_id ? accountNameMap.get(job.account_id) || 'N/A' : 'N/A',
      notes: job.notes || [],
    } as ExtendedJob));
  }, [jobsData, accountNameMap]);

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

  // const handleDelete = async (job: ExtendedJob) => {
  //   if (window.confirm(`Are you sure you want to delete job ${job.name}?`)) {
  //     try {
  //       await deleteJob(job.id).unwrap();
  //       toast.success('Job deleted successfully');
  //       refetch();
  //     } catch (error) {
  //       toast.error('Failed to delete job');
  //     }
  //   }
  // };

  const handleCreateNew = () => {
    setSelectedJob(null);
    setSheetMode('create');
    setIsSheetOpen(true);
  };

  // --- Invoice action handlers ---
  const handleOpenNoteDialog = (job: ExtendedJob) => {
    setCurrentJobForNote(job);
    setNoteText('');
    setMarkAsNeedInvoice(true);
    setIsNoteDialogOpen(true);
  };

  const handleSaveNoteAndInvoiceFlag = async () => {
    if (!currentJobForNote) return;
    try {
      if (noteText.trim()) {
        await addJobNotes({ job_id: currentJobForNote.id, note: noteText.trim() }).unwrap();
      }
      if (markAsNeedInvoice) {
        await toggleNeedToInvoice({ job_id: currentJobForNote.id }).unwrap();
      }
      toast.success('Updated successfully');
      refetch();
      setIsNoteDialogOpen(false);
      setCurrentJobForNote(null);
      setNoteText('');
    } catch (error) {
      toast.error('Failed to update');
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
      } else if (confirmAction === 'invoice') {
        await markJobInvoiced({ job_id: jobForAction.id }).unwrap();
        toast.success('Job marked as invoiced');
      }
      refetch();
      setIsConfirmDialogOpen(false);
      setJobForAction(null);
      setConfirmAction(null);
    } catch (error) {
      toast.error('Failed to perform action');
    }
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedStatus]);

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<ExtendedJob>[]>(
    () => {
      const baseColumns: ColumnDef<ExtendedJob>[] = [
        {
          id: 'actions',
          header: '',
          cell: ({ row }) => {
            const job = row.original;
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleView(job)}>View</DropdownMenuItem>
                  <Can on="Manage Jobs" action="create">
                    <DropdownMenuItem onClick={() => handleEdit(job)}>Edit</DropdownMenuItem>
                  </Can>

                  {canToggleInvoice && (
                    <>
                      <DropdownMenuSeparator />
                      {/* Mark as Need to Invoice – only if not already marked */}
                      {!job.need_to_invoice && (
                        <DropdownMenuItem onClick={() => handleOpenNoteDialog(job)}>
                          Mark as Need to Invoice
                        </DropdownMenuItem>
                      )}
                      {/* Unmark – only if already marked */}
                      {job.need_to_invoice && (
                        <DropdownMenuItem onClick={() => handleOpenConfirm(job, 'unmark')}>
                          Unmark Need to Invoice
                        </DropdownMenuItem>
                      )}
                      {/* Mark as Invoiced – only if not already invoiced */}
                      {!job.invoiced_at && (
                        <DropdownMenuItem onClick={() => handleOpenConfirm(job, 'invoice')}>
                          Mark as Invoiced
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  <DropdownMenuSeparator />
                  {/* <Can on="Manage Jobs" action="delete">
                    <DropdownMenuItem onClick={() => handleDelete(job)}>Delete</DropdownMenuItem>
                  </Can> */}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
          enableSorting: false,
          size: 60,
        },
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
          id: 'sq_ft',
          accessorFn: (row) => row.sq_ft,
          header: ({ column }) => <DataGridColumnHeader title="SQUARE FOOT" column={column} />,
          cell: ({ row }) => <span className="text-sm text-text">{row.original.sq_ft || 'N/A'}</span>,
          enableSorting: true,
          size: 130,
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
          id: 'account_name',
          accessorFn: (row) => row.account_name,
          header: ({ column }) => <DataGridColumnHeader title="ACCOUNT NAME" column={column} />,
          cell: ({ row }) => <span className="text-sm text-text">{row.original.account_name || 'N/A'}</span>,
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
          id: 'status',
          accessorFn: (row) => row.status,
          header: ({ column }) => <DataGridColumnHeader title="STATUS" column={column} />,
          cell: ({ row }) => <span className="text-sm text-text">{row.original.status || 'N/A'}</span>,
          enableSorting: true,
          size: 120,
        },
        // ─── Invoice status columns ────────────────────────────────────────
        {
          id: 'need_to_invoice',
          accessorFn: (row) => row.need_to_invoice,
          header: ({ column }) => <DataGridColumnHeader title="NEED TO INVOICE" column={column} />,
          cell: ({ row }) =>
            row.original.need_to_invoice ? (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                Yes
              </Badge>
            ) : (
              <span className="text-muted-foreground">No</span>
            ),
          size: 130,
          enableSorting: true,
        },
        {
          id: 'invoiced_at',
          accessorFn: (row) => row.invoiced_at,
          header: ({ column }) => <DataGridColumnHeader title="INVOICED" column={column} />,
          cell: ({ row }) =>
            row.original.invoiced_at ? (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Invoiced
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            ),
          size: 130,
          enableSorting: true,
        },
        // ─── Accounting Notes ──────────────────────────────────────────────
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
      ];
      return baseColumns;
    },
    [canToggleInvoice, handleView, handleEdit, handleOpenNoteDialog, handleOpenConfirm]
  );

  const table = useReactTable({
    columns,
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

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Need to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="note">Accounting Note</Label>
              <Textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add any relevant accounting notes..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mark-invoice"
                checked={markAsNeedInvoice}
                onCheckedChange={(checked) => setMarkAsNeedInvoice(!!checked)}
              />
              <Label htmlFor="mark-invoice">Mark this job as needing invoice</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNoteAndInvoiceFlag}>Save</Button>
          </DialogFooter>
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

      <DataGrid
        table={table}
        recordCount={jobsData?.total || 0}
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
                <Can action="create" on="Manage Jobs">
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Job
                  </Button>
                </Can>
              </CardToolbar>
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
    </>
  );
};