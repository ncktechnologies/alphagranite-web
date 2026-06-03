import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router';
import { flexRender } from '@tanstack/react-table';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardFooter, CardHeader, CardTable } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useGetShopRevisionFabsQuery, type ShopRevisionFabSummary } from '@/store/api/shopRevision';
import { format } from 'date-fns';

export const ShopRevisionTable = () => {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');

  const { data, isLoading } = useGetShopRevisionFabsQuery();

  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();

    return list.filter((item) => {
      switch (searchType) {
        case 'fab_id':
          return String(item.fab_id).toLowerCase().includes(q);
        case 'job_number':
          return (item.job_number || '').toLowerCase().includes(q);
        case 'job_name':
          return (item.job_name || '').toLowerCase().includes(q);
        default:
          return false;
      }
    });
  }, [data, searchQuery, searchType]);

  const columns = useMemo<ColumnDef<ShopRevisionFabSummary>[]>(() => [
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/revision/${row.original.fab_id}`)}
        >
          View Details
        </Button>
      ),
      size: 120,
    },
    {
      id: 'fab_id',
      accessorFn: (r) => r.fab_id,
      header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
      cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
      size: 90,
    },
    {
      id: 'job_number',
      accessorFn: (r) => r.job_number,
      header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
      cell: ({ row }) => <span className="text-sm">{row.original.job_number || '—'}</span>,
      size: 120,
    },
    {
      id: 'job_name',
      accessorFn: (r) => r.job_name,
      header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
      cell: ({ row }) => <span className="text-sm">{row.original.job_name || '—'}</span>,
      size: 180,
    },
    {
      id: 'fab_type',
      accessorFn: (r) => r.fab_type,
      header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
      cell: ({ row }) => <span className="text-sm uppercase">{row.original.fab_type || '—'}</span>,
      size: 130,
    },
    {
      id: 'pending_revision_count',
      accessorFn: (r) => r.pending_revision_count,
      header: ({ column }) => <DataGridColumnHeader title="PENDING REVISIONS" column={column} />,
      cell: ({ row }) => <span className="text-sm">{row.original.pending_revision_count ?? 0}</span>,
      size: 160,
    },
    {
      id: 'has_pending_shop_revision',
      accessorFn: (r) => r.has_pending_shop_revision,
      header: ({ column }) => <DataGridColumnHeader title="HAS PENDING" column={column} />,
      cell: ({ row }) => (
        <span className={`text-sm font-medium ${row.original.has_pending_shop_revision ? 'text-orange-700' : 'text-green-700'}`}>
          {row.original.has_pending_shop_revision ? 'Yes' : 'No'}
        </span>
      ),
      size: 120,
    },
    {
      id: 'latest_pending_revision',
      accessorFn: (r) => r.latest_pending_revision?.revision_note,
      header: ({ column }) => <DataGridColumnHeader title="LATEST PENDING REVISION NOTE" column={column} />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.latest_pending_revision?.revision_note || row.original.latest_revision_note || '—'}</span>
      ),
      size: 260,
    },
    {
      id:'created_at',
      accessorFn: (r) => r.created_at,
      header: ({ column }) => <DataGridColumnHeader title="CREATED AT" column={column} />,
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.latest_pending_revision.created_at ? format(new Date(row.original.latest_pending_revision.created_at), 'MMM dd, yyyy h:mm a') : '—'}
        </span>
      ),
      size: 180,
    }
  ], [navigate]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: {
      getRowAttributes: (row: any) => ({
        'data-fab-type': row.original.fab_type?.toLowerCase()
      })
    }
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      isLoading={isLoading}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        columnsResizable: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={searchType}
              onValueChange={(value: 'fab_id' | 'job_number' | 'job_name') => setSearchType(value)}
            >
              <SelectTrigger className="w-[140px] h-[34px] border-[#e2e4ed] focus-visible:ring-0">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fab_id">FAB ID</SelectItem>
                <SelectItem value="job_number">Job Number</SelectItem>
                <SelectItem value="job_name">Job Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="size-4 text-[#7c8689] absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search by ${searchType.replace('_', ' ')}`}
                className="ps-9 w-[280px] h-[34px] border-[#e2e4ed] focus-visible:ring-0"
                disabled={isLoading}
              />
              {searchQuery && (
                <Button
                  mode="icon"
                  variant="ghost"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardTable>
          <ScrollArea className="max-h-[calc(100vh-280px)]">
            <table className="w-full border-collapse table-fixed">
              <thead className="sticky top-0 z-10 bg-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No revision records found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-border" data-fab-type={row.original.fab_type?.toLowerCase()}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2 text-sm border-r border-border last:border-r-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
