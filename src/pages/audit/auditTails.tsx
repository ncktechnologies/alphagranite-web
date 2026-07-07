import { useState, useMemo, useEffect } from 'react';
import { useGetAuditTrailsQuery, useGetAuditSummaryQuery, useGetAuditByIdQuery } from '@/store/api/audit';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter, CardHeading } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Search, X, CalendarDays, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/common/BackButton';
import { PaginationState, useReactTable, getCoreRowModel, getPaginationRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetEmployeesQuery } from '@/store/api/employee';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ──────────────────────────────────────────────────────────────────
interface AuditTrail {
  audit_id: number;
  timestamp: string;
  operation: string | null;
  resource_type: string | null;
  table: string | null;
  message: string | null;
  request: {
    method: string | null;
    path: string | null;
    status_code: number | null;
    ip_address: string | null;
    browser: string | null;
  };
  actor: {
    id: number;
    username: string;
    full_name: string;
    email: string;
  };
  linked_job: {
    id: number;
    name: string;
    job_number: string;
  } | null;
  linked_fab: {
    id: number;
    fab_type: string;
    current_stage: string;
  } | null;
  summary: {
    performed_by: string;
    did_what: string;
    where: string | null;
  };
  manipulated_data: {
    record_id: number | null;
    old_values: any;
    new_values: any;
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
export function AuditTrails() {
  // ── Filter states ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // ✅ default 100
  const [userId, setUserId] = useState<string>('all');
  const [operation, setOperation] = useState<string>('all');
  const [resourceType, setResourceType] = useState<string>('all');
  const [jobId, setJobId] = useState<string>('');
  const [fabId, setFabId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [month, setMonth] = useState(new Date());

  // ── Summary state ──────────────────────────────────────────────────────
  const [summaryHours, setSummaryHours] = useState(24);
  const [showSummary, setShowSummary] = useState(true);

  // ── Detail sheet state ────────────────────────────────────────────────
  const [detailId, setDetailId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const params: any = { page, page_size: pageSize };
    if (search.trim()) params.search = search.trim();
    if (userId !== 'all') params.user_id = parseInt(userId);
    if (operation !== 'all') params.operation = operation;
    if (resourceType !== 'all') params.resource_type = resourceType;
    if (jobId.trim()) params.job_id = parseInt(jobId);
    if (fabId.trim()) params.fab_id = parseInt(fabId);
    if (dateRange?.from) {
      params.start_date = format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss");
      params.end_date = dateRange.to ? format(dateRange.to, "yyyy-MM-dd'T'HH:mm:ss") : format(dateRange.from, "yyyy-MM-dd'T'HH:mm:ss");
    }
    return params;
  }, [page, pageSize, search, userId, operation, resourceType, jobId, fabId, dateRange]);

  const { data: trailsData, isLoading, refetch } = useGetAuditTrailsQuery(queryParams);
  const { data: summaryData, isLoading: isSummaryLoading } = useGetAuditSummaryQuery({ last_hours: summaryHours });
  const { data: detailData, isLoading: isDetailLoading } = useGetAuditByIdQuery(
    { audit_id: detailId! },
    { skip: !detailId }
  );

  // ── Fetch employees for user filter ──────────────────────────────────
  const { data: employeesData } = useGetEmployeesQuery();

  // ── Extract unique values for filter options ─────────────────────────
  const operationOptions = useMemo(() => {
    if (!trailsData?.records) return [];
    const ops = new Set<string>();
    trailsData.records.forEach((item: AuditTrail) => {
      if (item.operation) ops.add(item.operation);
    });
    return Array.from(ops).sort();
  }, [trailsData]);

  const resourceTypeOptions = useMemo(() => {
    if (!trailsData?.records) return [];
    const types = new Set<string>();
    trailsData.records.forEach((item: AuditTrail) => {
      if (item.resource_type) types.add(item.resource_type);
    });
    return Array.from(types).sort();
  }, [trailsData]);

  const employeeOptions = useMemo(() => {
    if (!employeesData?.data) return [];
    return employeesData.data.map((emp: any) => ({
      value: String(emp.id),
      label: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || `Employee ${emp.id}`,
    }));
  }, [employeesData]);

  // ─── Reset page when filters change ──────────────────────────────────
  useEffect(() => {
    setPage(1);
  }, [search, userId, operation, resourceType, jobId, fabId, dateRange]);

  // ─── Columns ──────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<AuditTrail>[]>(() => {
    // Helper to format header: replace underscores with spaces
    const formatHeader = (key: string) => key.replace(/_/g, ' ').toUpperCase();

    return [
      // ID column removed
      {
        id: 'actor',
        accessorKey: 'actor.full_name',
        header: ({ column }) => <DataGridColumnHeader title="USER" column={column} />,
        cell: ({ row }) => <span>{row.original.actor?.full_name || row.original.actor?.username || `User ${row.original.actor?.id}`}</span>,
        size: 150,
      },
      {
        id: 'operation',
        accessorKey: 'operation',
        header: ({ column }) => <DataGridColumnHeader title="OPERATION" column={column} />,
        cell: ({ row }) => (
          <span className="uppercase px-2 py-0.5 rounded bg-gray-100 text-xs font-medium">
            {row.original.operation || '—'}
          </span>
        ),
        size: 120,
      },
      {
        id: 'resource_type',
        accessorKey: 'resource_type',
        header: ({ column }) => <DataGridColumnHeader title="RESOURCE" column={column} />,
        cell: ({ row }) => row.original.resource_type || '—',
        size: 120,
      },
      {
        id: 'linked_job',
        accessorKey: 'linked_job',
        header: ({ column }) => <DataGridColumnHeader title="JOB" column={column} />,
        cell: ({ row }) => {
          const job = row.original.linked_job;
          return job ? `${job.job_number || ''} - ${job.name}` : '—';
        },
        size: 150,
      },
      {
        id: 'linked_fab',
        accessorKey: 'linked_fab',
        header: ({ column }) => <DataGridColumnHeader title="FAB" column={column} />,
        cell: ({ row }) => {
          const fab = row.original.linked_fab;
          return fab ? `#${fab.id} (${fab.fab_type})` : '—';
        },
        size: 100,
      },
      {
        id: 'summary',
        accessorKey: 'summary.did_what',
        header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
        cell: ({ row }) => <span className="text-sm truncate max-w-[200px] inline-block">{row.original.summary?.did_what || row.original.message || '—'}</span>,
        size: 300,
      },
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: ({ column }) => <DataGridColumnHeader title="TIMESTAMP" column={column} />,
        cell: ({ row }) => format(new Date(row.original.timestamp), 'MMM dd, yyyy HH:mm:ss'),
        size: 180,
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setDetailId(row.original.audit_id); setIsDetailOpen(true); }}
          >
            View
          </Button>
        ),
        size: 80,
        enableSorting: false,
      },
    ];
  }, []);

  // ─── Table instance ──────────────────────────────────────────────────
  const table = useReactTable({
    columns,
    data: trailsData?.records || [],
    state: { pagination: { pageIndex: page - 1, pageSize } },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }) : updater;
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
    manualPagination: true,
    pageCount: Math.ceil((trailsData?.pagination?.total || 0) / pageSize),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // ─── Clear all filters ──────────────────────────────────────────────
  const clearAll = () => {
    setSearch('');
    setUserId('all');
    setOperation('all');
    setResourceType('all');
    setJobId('');
    setFabId('');
    setDateRange(undefined);
  };

  // ─── Render summary cards ────────────────────────────────────────────
const renderSummary = () => {
  if (isSummaryLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No summary data available.
      </Card>
    );
  }

  const {
    total_events,
    window,
    top_operations = [],
    top_resources = [],
    top_users = [],
  } = summaryData;

  // ✅ Filter out "login_success" from top operations
  const filteredTopOperations = top_operations.filter(op => op.operation !== 'login_success');

  const topOp = filteredTopOperations.length ? filteredTopOperations[0] : null;
  const topRes = top_resources.length ? top_resources[0] : null;
  const topUser = top_users.length ? top_users[0] : null;

  const renderBarList = (items: any[], labelKey: string, countKey: string, maxCount: number) => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">No data</p>;
    return (
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item) => {
          const label = item[labelKey] || 'Other';
          const count = item[countKey] || 0;
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="w-20 truncate font-medium">{label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const summaryCards = [
    {
      label: 'Total Events',
      value: total_events ?? 0,
    },
    {
      label: 'Time Window',
      value: window ? `Last ${window.last_hours}h` : '—',
      sub: window
        ? `${new Date(window.since).toLocaleDateString()} – ${new Date(window.until).toLocaleDateString()}`
        : undefined,
    },
    {
      label: 'Top Operation',
      value: topOp?.operation || '—',
      sub: topOp ? `${topOp.count} events` : undefined,
    },
    {
      label: 'Top Resource',
      value: topRes?.resource_type || '—',
      sub: topRes ? `${topRes.count} events` : undefined,
    },
    {
      label: 'Top User',
      value: topUser?.full_name || topUser?.username || '—',
      sub: topUser ? `${topUser.count} events` : undefined,
    },
  ];

  const maxOpCount = filteredTopOperations.length ? Math.max(...filteredTopOperations.map((o) => o.count)) : 1;
  const maxResCount = top_resources.length ? Math.max(...top_resources.map((r) => r.count)) : 1;
  const maxUserCount = top_users.length ? Math.max(...top_users.map((u) => u.count)) : 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-4 flex flex-col">
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="text-2xl font-semibold mt-1">{card.value}</div>
            {card.sub && <div className="text-xs text-muted-foreground mt-1">{card.sub}</div>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Top Operations</h4>
          {renderBarList(filteredTopOperations, 'operation', 'count', maxOpCount)}
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Top Resources</h4>
          {renderBarList(top_resources, 'resource_type', 'count', maxResCount)}
        </Card>
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Top Users</h4>
          {renderBarList(top_users, 'full_name', 'count', maxUserCount)}
        </Card>
      </div>

      
    </div>
  );
};

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#4b545d]">Audit Trails</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
            className="h-8 px-2 text-muted-foreground"
          >
            {showSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-sm">
              {showSummary ? 'Hide Summary' : 'Show Summary'}
            </span>
          </Button>
        </div>
        <BackButton />
      </div>

      {/* ─── Summary Time Filter ─────────────────────────────────────────── */}
      {showSummary && (
        <Card className="p-4">
          <CardHeader className="py-2 px-4 justify-end">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-sm font-medium text-muted-foreground">Summary Time Window</span>
              <Select value={String(summaryHours)} onValueChange={(v) => setSummaryHours(Number(v))}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="24 hours" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                  <SelectItem value="720">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

            {showSummary && renderSummary()}
        </Card>
      )}

      {/* Collapsible Summary */}
    

      {/* Filters */}
      
      <Card>
        <CardHeader className="py-3.5 border-b">
          <CardHeading>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search messages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 w-[220px] h-[34px]"
                />
                {search && (
                  <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-[150px] h-[34px]">
                  <SelectValue placeholder="User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {employeeOptions.map((emp) => (
                    <SelectItem key={emp.value} value={emp.value}>
                      {emp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={operation} onValueChange={setOperation}>
                <SelectTrigger className="w-[150px] h-[34px]">
                  <SelectValue placeholder="Operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  {operationOptions.map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-[150px] h-[34px]">
                  <SelectValue placeholder="Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Resources</SelectItem>
                  {resourceTypeOptions.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Job ID"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-[100px] h-[34px]"
              />
              <Input
                placeholder="FAB ID"
                value={fabId}
                onChange={(e) => setFabId(e.target.value)}
                className="w-[100px] h-[34px]"
              />

              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[200px] h-[34px] justify-start text-left',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                        : format(dateRange.from, 'MMM dd')
                      : 'Date range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    month={month}
                    onMonthChange={setMonth}
                    selected={tempDateRange}
                    onSelect={setTempDateRange}
                    numberOfMonths={2}
                  />
                  <div className="flex justify-end gap-2 p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTempDateRange(undefined);
                        setDateRange(undefined);
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setDateRange(tempDateRange);
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="sm" onClick={clearAll} className="h-[34px]">
                Clear All
              </Button>
            </div>
          </CardHeading>
          {/* <CardToolbar>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-[34px]">
              Refresh
            </Button>
          </CardToolbar> */}
        </CardHeader>
     

      {/* ─── Table (no sticky header, no ScrollArea) ──────────────────── */}
      <DataGrid table={table} recordCount={trailsData?.pagination?.total || 0} tableLayout={{ cellBorder: true }}>
        <Card>
          <CardTable>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-[#e2e4ed]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689]"
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
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 text-sm text-[#4b545d]"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(!trailsData?.records || trailsData.records.length === 0) && (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
                        No audit trails found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardTable>
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>
       </Card>

      {/* ── Detail Sheet ── */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="sm:w-[500px] rounded-lg p-4 h-[calc(100vh-2rem)] flex flex-col">
          <SheetHeader className="mb-3 border-b pb-3">
            <SheetTitle>Audit Trail Detail</SheetTitle>
          </SheetHeader>

          <SheetBody className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              {isDetailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : detailData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">ID</div>
                      <div className="text-sm">{detailData.audit_id}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">User</div>
                      <div className="text-sm">{detailData.actor?.full_name || detailData.actor?.username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Operation</div>
                      <div className="text-sm uppercase">{detailData.operation || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Resource</div>
                      <div className="text-sm">{detailData.resource_type || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Table</div>
                      <div className="text-sm">{detailData.table || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Timestamp</div>
                      <div className="text-sm">
                        {format(new Date(detailData.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                    </div>
                  </div>

                  {detailData.linked_job && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Job</div>
                      <div className="text-sm">
                        {detailData.linked_job.job_number} – {detailData.linked_job.name}
                      </div>
                    </div>
                  )}
                  {detailData.linked_fab && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">FAB</div>
                      <div className="text-sm">
                        #{detailData.linked_fab.id} ({detailData.linked_fab.fab_type})
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Message</div>
                    <div className="text-sm">{detailData.message || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Summary</div>
                    <div className="text-sm">{detailData.summary?.did_what || '—'}</div>
                  </div>

                  {detailData.request?.path && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Path</div>
                      <code className="text-xs bg-gray-100 p-1 rounded block break-all">
                        {detailData.request.path}
                      </code>
                    </div>
                  )}

                  {detailData.manipulated_data?.old_values && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Old Data</div>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(detailData.manipulated_data.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {detailData.manipulated_data?.new_values && (
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">New Data</div>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(detailData.manipulated_data.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-red-500">Failed to load audit detail.</div>
              )}
            </ScrollArea>
          </SheetBody>

          <SheetFooter className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDetailOpen(false)}
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}