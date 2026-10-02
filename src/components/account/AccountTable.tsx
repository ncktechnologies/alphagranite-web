import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { EllipsisVertical, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardHeading, CardTable, CardToolbar } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Can } from '@/components/permission';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Account, useGetAccountsAllQuery, useUpdateAccountStatusMutation } from '@/store/api/job';
import AccountModal from './AccountModal';

const isAccountActive = (account: Account) => account.is_active === true || account.is_active === 1;

const SEARCHABLE_FIELDS: (keyof Account)[] = [
  'name',
  'account_number',
  'contact_person',
  'email',
  'phone',
  'address',
];

export const AccountTable = () => {
  const { data: accounts = [], isLoading } = useGetAccountsAllQuery();
  const [updateStatus] = useUpdateAccountStatusMutation();
  const permissions = usePermission('account');
  const isSuperAdmin = useIsSuperAdmin();
  const canUpdate = isSuperAdmin || Boolean(permissions.can_update);

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selected, setSelected] = useState<Account | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accounts.filter((account) => {
      if (selectedStatus === 'active' && !isAccountActive(account)) return false;
      if (selectedStatus === 'inactive' && isAccountActive(account)) return false;
      if (!query) return true;
      return SEARCHABLE_FIELDS.some((field) => String(account[field] ?? '').toLowerCase().includes(query));
    });
  }, [accounts, searchQuery, selectedStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, selectedStatus]);

  const handleEdit = useCallback((account: Account) => {
    setSelected(account);
    setIsEditOpen(true);
  }, []);

  const handleToggleStatus = useCallback(async (account: Account, isActive: boolean) => {
    setUpdatingId(account.id);
    try {
      await updateStatus({ account_id: account.id, is_active: isActive }).unwrap();
      toast.success(`${account.name} ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update account status');
    } finally {
      setUpdatingId(null);
    }
  }, [updateStatus]);

  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => <DataGridColumnHeader title="ACCOUNT NAME" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-text font-medium truncate block max-w-[240px]" title={row.original.name}>
            {row.original.name}
          </span>
        ),
        enableSorting: true,
        size: 240,
        meta: { skeleton: <Skeleton className="h-5 w-[160px]" /> },
      },
      {
        id: 'account_number',
        accessorFn: (row) => row.account_number,
        header: ({ column }) => <DataGridColumnHeader title="ACCOUNT NO" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-text truncate block max-w-[140px]">{row.original.account_number || '-'}</span>
        ),
        enableSorting: true,
        size: 140,
      },
      {
        id: 'contact_person',
        accessorFn: (row) => row.contact_person,
        header: ({ column }) => <DataGridColumnHeader title="CONTACT PERSON" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-text truncate block max-w-[180px]">{row.original.contact_person || '-'}</span>
        ),
        enableSorting: true,
        size: 180,
      },
      {
        id: 'email',
        accessorFn: (row) => row.email,
        header: ({ column }) => <DataGridColumnHeader title="EMAIL" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-text truncate block max-w-[220px]" title={row.original.email}>
            {row.original.email || '-'}
          </span>
        ),
        enableSorting: true,
        size: 220,
      },
      {
        id: 'phone',
        accessorFn: (row) => row.phone,
        header: ({ column }) => <DataGridColumnHeader title="PHONE NO" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-text truncate block max-w-[140px]">{row.original.phone || '-'}</span>
        ),
        enableSorting: false,
        size: 140,
      },
      {
        id: 'status',
        accessorFn: (row) => (isAccountActive(row) ? 'Active' : 'Inactive'),
        header: ({ column }) => <DataGridColumnHeader title="ACTIVE" column={column} />,
        cell: ({ row }) => (
          <Switch
            checked={isAccountActive(row.original)}
            onCheckedChange={(value) => handleToggleStatus(row.original, !!value)}
            disabled={!canUpdate || updatingId === row.original.id}
            aria-label={`Toggle ${row.original.name} active`}
          />
        ),
        enableSorting: true,
        size: 100,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Can action="update" on="account">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Account actions">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[157px]" side="bottom" align="end">
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Can>
        ),
        enableSorting: false,
        size: 60,
        meta: { format: () => '' }, // no export
      },
    ],
    [canUpdate, updatingId, handleEdit, handleToggleStatus],
  );

  const table = useReactTable({
    columns,
    data: filteredAccounts,
    getRowId: (row: Account) => String(row.id),
    state: { pagination, sorting },
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const hasFilters = searchQuery.length > 0 || selectedStatus !== 'all';

  return (
    <>
      <DataGrid
        table={table}
        recordCount={filteredAccounts.length}
        isLoading={isLoading}
        emptyMessage={hasFilters ? 'No accounts match your filters' : 'No accounts yet'}
        tableLayout={{
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
          cellBorder: true,
          headerSticky: true,
        }}
        // Match the header padding so cell content isn't flush against the column borders
        tableClassNames={{ bodyRow: '[&>td]:px-4' }}
      >
        <Card>
          <CardHeader className="py-3.5 border-b">
            <CardHeading>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search Accounts..."
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
                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}>
                  <SelectTrigger className="w-[120px] h-[34px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="w-32">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeading>
            <CardToolbar>
              <Button variant="outline" onClick={() => exportTableToCSV(table, 'accounts')}>
                Export CSV
              </Button>
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
      </DataGrid>

      <AccountModal open={isEditOpen} onClose={() => setIsEditOpen(false)} account={selected} />
    </>
  );
};

export default AccountTable;
