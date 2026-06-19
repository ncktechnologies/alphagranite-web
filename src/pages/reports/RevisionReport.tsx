// pages/reports/RevisionReport.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetRevisionReportQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFabIdLink, getJobNumberLink, getJobNameLink, renderLink } from '@/lib/reportLinks';

// ─── Revision type display mapping ──────────────────────────────────────
const REVISION_TYPE_MAP: Record<string, string> = {
  'ag_redo': 'AG Redo',
  'shop': 'Shop',
  'sales': 'Sales CT',
  // add others as needed
};

// ─── Column definitions for Sales CT Revisions ─────────────────────────────
const SALES_COLUMNS = [
  { key: 'fab_id', label: 'FAB ID', isLink: true, linkType: 'fab' },
  { key: 'job_number', label: 'JOB #', isLink: true, linkType: 'jobNumber' },
  { key: 'job_name', label: 'JOB NAME', isLink: false, linkType: 'jobName' },
  { key: 'account_name', label: 'ACCOUNT' },
  { key: 'revision_type_label', label: 'TYPE', isType: true },
  { key: 'revision_notes', label: 'NOTES' },
  { key: 'requested_by_name', label: 'REQUESTED BY' },
  { key: 'assigned_to_name', label: 'ASSIGNED TO' },
  { key: 'created_at', label: 'CREATED AT', isDate: true },
];

// ─── Column definitions for Shop Revisions ────────────────────────────────
const SHOP_COLUMNS = [
  { key: 'fab_id', label: 'FAB ID', isLink: true, linkType: 'fab' },
  { key: 'job_number', label: 'JOB #', isLink: true, linkType: 'jobNumber' },
  { key: 'job_name', label: 'JOB NAME', isLink: false, linkType: 'jobName' },
  { key: 'account_name', label: 'ACCOUNT' },
  { key: 'revision_type_label', label: 'TYPE', isType: true },
  { key: 'revision_notes', label: 'NOTES' },
  { key: 'revision_feedback', label: 'FEEDBACK' },
  { key: 'requested_by_name', label: 'REQUESTED BY' },
  { key: 'assigned_to_name', label: 'ASSIGNED TO' },
  { key: 'created_at', label: 'CREATED AT', isDate: true },
  { key: 'revision_completed', label: 'COMPLETED', isBoolean: true },
  { key: 'completed_at', label: 'COMPLETED AT', isDate: true },
];

function buildColumns<T extends Record<string, any>>(
  data: T[],
  columnDefs: Array<{
    key: keyof T;
    label: string;
    isLink?: boolean;
    linkType?: 'fab' | 'jobNumber' | 'jobName';
    isDate?: boolean;
    isBoolean?: boolean;
    isType?: boolean;
  }>
): ColumnDef<T>[] {
  if (!data.length) return [];

  return columnDefs.map((def) => {
    const { key, label, isLink, linkType, isDate, isBoolean, isType } = def;

    return {
      accessorKey: key as string,
      header: ({ column }) => <DataGridColumnHeader title={label} column={column} />,
      size: key === 'revision_notes' || key === 'revision_feedback' ? 250 : 140,
      enableSorting: true,
      cell: ({ row }) => {
        const val = row.original[key];
        if (val == null) return <span className="text-sm">—</span>;

        // ── Type mapping ──
        if (isType && typeof val === 'string') {
          const display = REVISION_TYPE_MAP[val] || val;
          return <span className="text-sm">{display}</span>;
        }

        // ── Link handling ──
        if (isLink && linkType === 'fab') {
          const link = getFabIdLink(Number(val));
          return renderLink(link);
        }
        if (isLink && linkType === 'jobNumber') {
          const link = getJobNumberLink(String(val));
          return renderLink(link);
        }
        if (isLink && linkType === 'jobName') {
          const jobId = row.original.job_id;
          if (jobId) {
            const link = getJobNameLink(String(val), jobId);
            if (link) return renderLink(link);
          }
          return <span className="text-sm">{val}</span>;
        }

        // ── Date ──
        if (isDate && typeof val === 'string') {
          try { return <span className="text-sm">{format(new Date(val), 'MMM dd, yyyy h:mm a')}</span>; } catch {}
        }

        // ── Boolean ──
        if (isBoolean) {
          return <span className="text-sm">{val ? 'Yes' : 'No'}</span>;
        }

        // ── Default ──
        return <span className="text-sm">{val}</span>;
      },
    };
  });
}

export function RevisionReport() {
  // ─── Date mode ──────────────────────────────────────────────────────────
  const [dateMode, setDateMode] = useState<'monthly' | 'custom'>('monthly');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // ─── Pagination & sorting ──────────────────────────────────────────────
  const [salesPagination, setSalesPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [shopPagination, setShopPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [salesSorting, setSalesSorting] = useState<SortingState>([]);
  const [shopSorting, setShopSorting] = useState<SortingState>([]);

  // ─── Query params ──────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const params: any = {};
    if (dateMode === 'custom' && dateRange?.from) {
      params.start_date = format(dateRange.from, 'yyyy-MM-dd');
      params.end_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
    } else {
      params.year = year;
      params.month = month;
    }
    return params;
  }, [dateMode, dateRange, year, month]);

  const { data, isLoading, isError } = useGetRevisionReportQuery(queryParams);

  // ─── Extract data ──────────────────────────────────────────────────────
  const summary = useMemo(() => data?.data?.summary ?? null, [data]);
  const salesRevisions = useMemo(() => data?.data?.sales_ct_revisions ?? [], [data]);
  const shopRevisions = useMemo(() => data?.data?.shop_revisions ?? [], [data]);

  // ─── Build columns ─────────────────────────────────────────────────────
  const salesColumns = useMemo(() => buildColumns(salesRevisions, SALES_COLUMNS), [salesRevisions]);
  const shopColumns = useMemo(() => buildColumns(shopRevisions, SHOP_COLUMNS), [shopRevisions]);

  // ─── Tables ─────────────────────────────────────────────────────────────
  const salesTable = useReactTable({
    columns: salesColumns,
    data: salesRevisions,
    state: { pagination: salesPagination, sorting: salesSorting },
    onPaginationChange: setSalesPagination,
    onSortingChange: setSalesSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
  });

  const shopTable = useReactTable({
    columns: shopColumns,
    data: shopRevisions,
    state: { pagination: shopPagination, sorting: shopSorting },
    onPaginationChange: setShopPagination,
    onSortingChange: setShopSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onEnd',
  });

  // ─── Render helper ─────────────────────────────────────────────────────
  const renderTable = (table: any, title: string, exportName: string) => (
    <DataGrid table={table} recordCount={table.getCoreRowModel().rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
      <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
        <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
          <p className="text-base font-semibold text-[#4b545d]">{title}</p>
          <CardToolbar>
            <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, exportName)}>Export CSV</Button>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
            <div className="relative">
              <table className="w-full border-collapse table-fixed">
                <thead className="sticky top-0 z-10 bg-white">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50"
                          style={{ width: header.getSize() }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanResize() && (
                            <div
                              onDoubleClick={() => header.column.resetSize()}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-gray-300 before:-translate-x-px hover:before:bg-blue-500"
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
          </ScrollArea>
        </CardTable>
        <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );

  if (isLoading) return <div className="p-5 text-[#7c8689]">Loading revision report...</div>;
  if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

  const getTitle = () => {
    if (dateMode === 'custom' && dateRange?.from) {
      return dateRange.to
        ? `${format(dateRange.from, 'MMM dd, yyyy')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
        : format(dateRange.from, 'MMM dd, yyyy');
    }
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    return `${monthName} ${year}`;
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-[#4b545d]">Revision Report</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={dateMode} onValueChange={(v) => setDateMode(v as 'monthly' | 'custom')}>
            <SelectTrigger className="w-[120px] h-[34px] border-[#e2e4ed]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateMode === 'monthly' ? (
            <>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-[100px] h-[34px] border-[#e2e4ed]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-[130px] h-[34px] border-[#e2e4ed]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Select date range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" month={new Date()} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                <div className="flex justify-end gap-2 p-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                  <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* ─── Summary Widgets ────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Sales CT Revisions</p>
            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sales_ct_revision_count}</p>
          </Card>
          <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Shop Revisions</p>
            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.shop_revision_count}</p>
          </Card>
          <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Active Fabs with Sales CT Rev</p>
            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.active_fabs_with_sales_ct_revisions}</p>
          </Card>
          <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Active Fabs with Shop Rev</p>
            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.active_fabs_with_shop_revisions}</p>
          </Card>
        </div>
      )}

      {/* ─── Tables ──────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {salesRevisions.length > 0 && renderTable(salesTable, `Sales CT Revisions – ${getTitle()}`, 'sales-ct-revisions')}
        {shopRevisions.length > 0 && renderTable(shopTable, `Shop Revisions – ${getTitle()}`, 'shop-revisions')}
        {salesRevisions.length === 0 && shopRevisions.length === 0 && (
          <div className="text-center py-8 text-[#7c8689]">No revisions found for the selected period.</div>
        )}
      </div>
    </div>
  );
}