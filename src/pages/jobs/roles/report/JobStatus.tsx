import React, { useMemo, useState } from 'react';
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
import { Search, CalendarDays, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetFabsQuery } from '@/store/api/job';

// ─────────────────────────────────────────────────────────
// Types (unchanged from original)
// ─────────────────────────────────────────────────────────
export interface JobStatusRow {
    fab_id: string;
    fab_type: string;
    job_no: string;
    acct_name: string;
    job_name: string;
    input_area: string;
    stone_type_name: string;
    stone_color_name: string;
    stone_thickness_value: string;
    edge_name: string;
    pieces: number;
    total_sq_ft: number;
    template_date:          string | null | undefined;
    template_needed:        boolean;
    pre_draft_review_date:  string | null | undefined;
    pre_draft_needed:       boolean;
    draft_date:             string | null | undefined;
    draft_needed:           boolean;
    sct_date:               string | null | undefined;
    sct_needed:             boolean;
    been_revised:           boolean;
    slabsmith_date:         string | null | undefined;
    slabsmith_needed:       boolean;
    final_programming_date: string | null | undefined;
    fp_needed:              boolean;
    shop_date:              string | null | undefined;
    est_completion_date:    string | null | undefined;
    percent_complete:       number;
    shop_completion_date:   string | null | undefined;
    install_date:           string | null | undefined;
    install_confirmed:      boolean;
    installed:              boolean;
}

// ─────────────────────────────────────────────────────────
// Cell helpers (unchanged from original)
// ─────────────────────────────────────────────────────────
const StageCell: React.FC<{ needed: boolean; date: string | null | undefined }> = ({ needed, date }) => {
    if (!needed) {
        return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-400 whitespace-nowrap">
                Not Needed
            </span>
        );
    }
    if (date) {
        return <span className="text-sm text-[#4b545d] whitespace-nowrap">{format(new Date(date), 'MM/dd/yyyy')}</span>;
    }
    return <span className="text-sm text-[#b0b7bc]">—</span>;
};

const YesNoBadge: React.FC<{ value: boolean }> = ({ value }) => (
    <span className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
        value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    )}>
        {value ? 'Yes' : 'No'}
    </span>
);

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
interface JobStatusTableProps {
    isLoading?: boolean;
}

const JobStatusTable: React.FC<JobStatusTableProps> = ({ isLoading: externalLoading }) => {

    // ── State ────────────────────────────────────────────
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    // ── API (kept exactly as original) ───────────────────
    const queryParams = useMemo(() => ({
        skip: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
    }), [searchQuery, fabTypeFilter, pagination.pageIndex, pagination.pageSize]);

    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);

    const fabs = useMemo(() => {
        if (!fabsData) return [];
        return Array.isArray(fabsData.data) ? fabsData.data : Array.isArray(fabsData) ? fabsData : [];
    }, [fabsData]);

    const totalRecords = fabsData?.total ?? fabs.length;

    // ── Transform (kept exactly as original) ─────────────
    const tableData: JobStatusRow[] = useMemo(() => {
        return fabs.map((fab: any): JobStatusRow => ({
            fab_id:     String(fab.id),
            fab_type:   fab.fab_type || 'N/A',
            job_no:     fab.job_details?.job_number || 'N/A',
            acct_name:  fab.account_name || '',
            job_name:   fab.job_details?.name || '',
            input_area: fab.input_area || '',
            stone_type_name:       fab.stone_type_name || '',
            stone_color_name:      fab.stone_color_name || '',
            stone_thickness_value: fab.stone_thickness_value || '',
            edge_name:             fab.edge_name || '',
            pieces:      fab.no_of_pieces ?? 0,
            total_sq_ft: fab.total_sqft   ?? 0,
            template_needed:        fab.template_needed !== false,
            template_date:          fab.template_completed_date ?? null,
            pre_draft_needed:       fab.drafting_needed !== false,
            pre_draft_review_date:  fab.predraft_completed_date ?? null,
            draft_needed:           fab.drafting_needed !== false,
            draft_date:             fab.draft_completed_date ?? null,
            sct_needed:             fab.sct_needed !== false,
            sct_date:               fab.sct_completed_date ?? null,
            been_revised:           fab.revised === true,
            slabsmith_needed:       fab.slab_smith_used === true || fab.slab_smith_ag_needed === true || fab.slab_smith_cust_needed === true,
            slabsmith_date:         fab.slabsmith_completed_date ?? null,
            fp_needed:              fab.final_programming_needed !== false,
            final_programming_date: fab.final_programming_completed_date ?? null,
            shop_date:              fab.shop_date_schedule ?? null,
            est_completion_date:    fab.estimated_completion_date ?? fab.shop_date_schedule ?? null,
            percent_complete:       fab.percentage_completion ?? fab.percent_complete ?? 0,
            shop_completion_date:   fab.shop_completion_date ?? null,
            install_date:           fab.installation_date ?? null,
            install_confirmed:      fab.install_confirmed === true,
            installed:              fab.is_complete === true,
        }));
    }, [fabs]);

    // ── Client-side filtering (kept exactly as original) ──
    const filteredData = useMemo(() => {
        let result = tableData;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => {
                if (searchType === 'fab_id')     return r.fab_id.toLowerCase().includes(q);
                if (searchType === 'job_number') return r.job_no.toLowerCase().includes(q);
                if (searchType === 'job_name')   return r.job_name.toLowerCase().includes(q);
                return false;
            });
        }

        if (fabTypeFilter !== 'all') {
            result = result.filter(r => r.fab_type.toLowerCase() === fabTypeFilter.toLowerCase());
        }

        if (dateRange?.from && dateRange?.to) {
            const start = startOfDay(dateRange.from);
            const end   = startOfDay(dateRange.to);
            end.setHours(23, 59, 59, 999);
            result = result.filter(r => {
                if (!r.install_date) return false;
                const d = new Date(r.install_date);
                return d >= start && d <= end;
            });
        }

        return result;
    }, [tableData, searchQuery, searchType, fabTypeFilter, dateRange]);

    // ── Fab types for filter dropdown ─────────────────────
    const fabTypes = useMemo(
        () => Array.from(new Set(tableData.map(r => r.fab_type).filter(t => t && t !== 'N/A'))).sort(),
        [tableData]
    );

    // ── Columns ──────────────────────────────────────────
    const columns = useMemo<ColumnDef<JobStatusRow>[]>(() => [
        {
            id: 'fab_type',
            accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="text-xs uppercase font-semibold">{row.original.fab_type}</span>,
            enableSorting: true,
            size: 110,
        },
        {
            id: 'fab_id',
            accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => <span className="text-xs font-medium hover:underline cursor-pointer">{row.original.fab_id}</span>,
            enableSorting: true,
            size: 80,
        },
        {
            id: 'job_no',
            accessorKey: 'job_no',
            header: ({ column }) => <DataGridColumnHeader title="JOB #" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.job_no}</span>,
            enableSorting: true,
            size: 80,
        },
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const r = row.original;
                const line1 = [r.acct_name, r.job_name, r.input_area].filter(Boolean).join(' - ');
                const line2 = [r.stone_type_name, r.stone_color_name, r.stone_thickness_value, r.edge_name].filter(Boolean).join(' - ');
                return (
                    <div className="flex flex-col gap-0.5 text-xs max-w-[280px]">
                        {line1 && <span className="truncate font-medium" title={line1}>{line1}</span>}
                        {line2 && <span className="truncate text-gray-500" title={line2}>{line2}</span>}
                    </div>
                );
            },
            size: 280,
        },
        {
            id: 'pieces',
            accessorKey: 'pieces',
            header: ({ column }) => <DataGridColumnHeader title="# OF PIECES" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.pieces || '—'}</span>,
            enableSorting: true,
            size: 90,
        },
        {
            id: 'total_sq_ft',
            accessorKey: 'total_sq_ft',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQ FT" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.total_sq_ft.toFixed(1)}</span>,
            enableSorting: true,
            size: 100,
        },
        {
            id: 'template',
            header: ({ column }) => <DataGridColumnHeader title="TEMPLATE" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.template_needed} date={row.original.template_date} />,
            size: 110,
        },
        {
            id: 'pre_draft_review',
            header: ({ column }) => <DataGridColumnHeader title="PRE-DRAFT REVIEW" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.pre_draft_needed} date={row.original.pre_draft_review_date} />,
            size: 140,
        },
        {
            id: 'draft',
            header: ({ column }) => <DataGridColumnHeader title="DRAFT" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.draft_needed} date={row.original.draft_date} />,
            size: 110,
        },
        {
            id: 'sct',
            header: ({ column }) => <DataGridColumnHeader title="SCT" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.sct_needed} date={row.original.sct_date} />,
            size: 110,
        },
        {
            id: 'been_revised',
            accessorKey: 'been_revised',
            header: ({ column }) => <DataGridColumnHeader title="BEEN REVISED" column={column} />,
            cell: ({ row }) => <YesNoBadge value={row.original.been_revised} />,
            size: 110,
        },
        {
            id: 'slabsmith',
            header: ({ column }) => <DataGridColumnHeader title="SLABSMITH COMPLETED" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.slabsmith_needed} date={row.original.slabsmith_date} />,
            size: 160,
        },
        {
            id: 'final_programming',
            header: ({ column }) => <DataGridColumnHeader title="FINAL PROGRAMMING" column={column} />,
            cell: ({ row }) => <StageCell needed={row.original.fp_needed} date={row.original.final_programming_date} />,
            size: 150,
        },
        {
            id: 'shop_date',
            accessorKey: 'shop_date',
            header: ({ column }) => <DataGridColumnHeader title="SHOP DATE" column={column} />,
            cell: ({ row }) => {
                const d = row.original.shop_date;
                return <span className="text-xs whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 110,
        },
        {
            id: 'est_completion_date',
            accessorKey: 'est_completion_date',
            header: ({ column }) => <DataGridColumnHeader title="EST. COMPLETION DATE" column={column} />,
            cell: ({ row }) => {
                const d = row.original.est_completion_date;
                return <span className="text-xs whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 160,
        },
        {
            id: 'percent_complete',
            accessorKey: 'percent_complete',
            header: ({ column }) => <DataGridColumnHeader title="% COMPLETE" column={column} />,
            cell: ({ row }) => {
                const pct = row.original.percent_complete ?? 0;
                return (
                    <div className="flex flex-col gap-1 min-w-[80px]">
                        <span className="text-xs">{pct.toFixed(2)}%</span>
                       
                    </div>
                );
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: 'shop_completion_date',
            accessorKey: 'shop_completion_date',
            header: ({ column }) => <DataGridColumnHeader title="SHOP COMPLETION DATE" column={column} />,
            cell: ({ row }) => {
                const d = row.original.shop_completion_date;
                return <span className="text-xs whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 160,
        },
        {
            id: 'install_date',
            accessorKey: 'install_date',
            header: ({ column }) => <DataGridColumnHeader title="INSTALL DATE" column={column} />,
            cell: ({ row }) => {
                const d = row.original.install_date;
                return <span className="text-xs whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: 'install_confirmed',
            accessorKey: 'install_confirmed',
            header: ({ column }) => <DataGridColumnHeader title="INSTALL CONFIRMED" column={column} />,
            cell: ({ row }) => <YesNoBadge value={row.original.install_confirmed} />,
            size: 140,
        },
        {
            id: 'installed',
            accessorKey: 'installed',
            header: ({ column }) => <DataGridColumnHeader title="INSTALLED" column={column} />,
            cell: ({ row }) => <YesNoBadge value={row.original.installed} />,
            size: 100,
        },
    ], []);

    // ── Table instance ────────────────────────────────────
    const table = useReactTable({
        data: filteredData,
        columns,
        pageCount: Math.ceil(totalRecords / pagination.pageSize) || 1,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel:       getCoreRowModel(),
        getFilteredRowModel:   getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel:     getSortedRowModel(),
        manualPagination: true,
        meta: {
            getRowAttributes: (row: any) => ({
                'data-fab-type': row.original.fab_type?.toLowerCase()
            })
        }
    });

    const isLoading = isApiLoading || externalLoading;

    return (
        <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            groupByDate={false}
            tableLayout={{
                columnsPinnable:   true,
                columnsMovable:    true,
                columnsVisibility: true,
                cellBorder:        true,
            }}
        >
            <Card>
                {/* ── Toolbar — same layout as JobTable ── */}
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">

                            {/* Search type selector + input (identical to JobTable) */}
                            <div className="relative flex items-center">
                                <Select
                                    value={searchType}
                                    onValueChange={v => {
                                        setSearchType(v as 'fab_id' | 'job_number' | 'job_name');
                                        setPagination(p => ({ ...p, pageIndex: 0 }));
                                    }}
                                >
                                    <SelectTrigger className="w-[140px] h-[34px] rounded-e-none border-r-0">
                                        <SelectValue placeholder="Search by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fab_id">Fab ID</SelectItem>
                                        <SelectItem value="job_number">Job Number</SelectItem>
                                        <SelectItem value="job_name">Job Name</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative">
                                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        placeholder={`Search by ${searchType.replace('_', ' ')}`}
                                        value={searchQuery}
                                        onChange={e => {
                                            setSearchQuery(e.target.value);
                                            setPagination(p => ({ ...p, pageIndex: 0 }));
                                        }}
                                        className="ps-9 w-[230px] h-[34px] rounded-s-none"
                                        disabled={isLoading}
                                    />
                                    {searchQuery && (
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
                            </div>

                            {/* Fab Type filter */}
                            <Select
                                value={fabTypeFilter}
                                onValueChange={v => {
                                    setFabTypeFilter(v);
                                    setPagination(p => ({ ...p, pageIndex: 0 }));
                                }}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {fabTypes.map(type => (
                                        <SelectItem key={type} value={type} className="uppercase">{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Install date range picker */}
                            <div className="flex items-center gap-2">
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                'w-[220px] h-[34px] justify-start text-left font-normal',
                                                !dateRange && 'text-muted-foreground'
                                            )}
                                            disabled={isLoading}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {dateRange?.from ? (
                                                dateRange.to
                                                    ? `${format(dateRange.from, 'MMM dd')} – ${format(dateRange.to, 'MMM dd, yyyy')}`
                                                    : format(dateRange.from, 'MMM dd, yyyy')
                                            ) : (
                                                <span>Filter by install date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from || new Date()}
                                            selected={tempDateRange}
                                            onSelect={setTempDateRange}
                                            numberOfMonths={2}
                                        />
                                        <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                                            <Button
                                                variant="outline" size="sm"
                                                onClick={() => { setTempDateRange(undefined); setDateRange(undefined); }}
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}
                                            >
                                                Apply
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                {dateRange && (
                                    <Button
                                        variant="ghost" size="sm" className="h-[34px] px-2 text-muted-foreground"
                                        onClick={() => { setDateRange(undefined); setTempDateRange(undefined); }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeading>

                    <CardToolbar>
                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(table, 'job-status')}
                            disabled={isLoading}
                        >
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                {/* ── Table body — uses DataGridTable just like JobTable ── */}
                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                    </ScrollArea>
                </CardTable>

                {/* ── Pagination — uses DataGridPagination just like JobTable ── */}
                <CardFooter>
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );
};

export { JobStatusTable };