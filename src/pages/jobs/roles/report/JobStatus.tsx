import React, { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
// Types
// ─────────────────────────────────────────────────────────
export interface JobStatusRow {
    fab_id: string;
    fab_type: string;
    job_no: string;
    // Fab info fields
    acct_name: string;
    job_name: string;
    input_area: string;
    stone_type_name: string;
    stone_color_name: string;
    stone_thickness_value: string;
    edge_name: string;
    // Counts
    pieces: number;
    total_sq_ft: number;
    // Stage dates (null = "Not Needed", undefined = not set yet)
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
    // Dates
    shop_date:              string | null | undefined;
    est_completion_date:    string | null | undefined;
    percent_complete:       number;
    shop_completion_date:   string | null | undefined;
    install_date:           string | null | undefined;
    install_confirmed:      boolean;
    installed:              boolean;
}

// ─────────────────────────────────────────────────────────
// FAB type → row background color (matching screenshot)
// ─────────────────────────────────────────────────────────
const FAB_TYPE_ROW_BG: Record<string, string> = {
    'fab only':    'bg-[#b2eaf3]',   // cyan
    'standard':    'bg-[#c8f0c8]',   // green
    'ag redo':     'bg-[#f9c784]',   // orange
    'resurface':   'bg-[#f4b8d4]',   // pink / rose
    'resurfacing': 'bg-[#f4b8d4]',
    'fast track':  'bg-[#d5c5f0]',   // purple
    'cust redo':   'bg-[#fdeeba]',   // yellow
};

const getFabRowBg = (fabType: string) =>
    FAB_TYPE_ROW_BG[fabType?.toLowerCase()] ?? '';

// ─────────────────────────────────────────────────────────
// Helper: Stage cell — date string or "Not Needed" badge
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

// ─────────────────────────────────────────────────────────
// Helper: Yes / No badge
// ─────────────────────────────────────────────────────────
const YesNoBadge: React.FC<{ value: boolean }> = ({ value }) => (
    <span
        className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
            value
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-400'
        )}
    >
        {value ? 'Yes' : 'No'}
    </span>
);

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
interface JobStatusTableProps {
    isLoading?: boolean;
}

const JobStatusTable: React.FC<JobStatusTableProps> = ({ isLoading: externalLoading }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [itemsPerPage, setItemsPerPage] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const queryParams = useMemo(() => ({
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
    }), [searchQuery, fabTypeFilter, currentPage, itemsPerPage]);

    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);

    const fabs = useMemo(() => {
        if (!fabsData) return [];
        return Array.isArray(fabsData.data) ? fabsData.data : Array.isArray(fabsData) ? fabsData : [];
    }, [fabsData]);

    const totalRecords = fabsData?.total ?? fabs.length;

    // ─── Transform API → JobStatusRow ────────────────────
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
            // Template
            template_needed:        fab.template_needed !== false,
            template_date:          fab.template_completed_date ?? null,
            // Pre-draft review (predraft)
            pre_draft_needed:       fab.drafting_needed !== false,
            pre_draft_review_date:  fab.predraft_completed_date ?? null,
            // Draft
            draft_needed:  fab.drafting_needed !== false,
            draft_date:    fab.draft_completed_date ?? null,
            // SCT
            sct_needed: fab.sct_needed !== false,
            sct_date:   fab.sct_completed_date ?? null,
            // Revised
            been_revised: fab.revised === true,
            // SlabSmith
            slabsmith_needed: fab.slab_smith_used === true || fab.slab_smith_ag_needed === true || fab.slab_smith_cust_needed === true,
            slabsmith_date:   fab.slabsmith_completed_date ?? null,
            // Final Programming
            fp_needed:              fab.final_programming_needed !== false,
            final_programming_date: fab.final_programming_completed_date ?? null,
            // Dates
            shop_date:           fab.shop_date_schedule ?? null,
            est_completion_date: fab.estimated_completion_date ?? fab.shop_date_schedule ?? null,
            percent_complete:    fab.percentage_completion ?? fab.percent_complete ?? 0,
            shop_completion_date: fab.shop_completion_date ?? null,
            install_date:        fab.installation_date ?? null,
            install_confirmed:   fab.install_confirmed === true,
            installed:           fab.is_complete === true,
        }));
    }, [fabs]);

    // ─── Client-side filtering ───────────────────────────
    const filteredData = useMemo(() => {
        let result = tableData;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.fab_id.toLowerCase().includes(q) ||
                r.job_no.toLowerCase().includes(q) ||
                r.acct_name.toLowerCase().includes(q) ||
                r.job_name.toLowerCase().includes(q)
            );
        }

        if (fabTypeFilter !== 'all') {
            result = result.filter(r =>
                r.fab_type.toLowerCase() === fabTypeFilter.toLowerCase()
            );
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
    }, [tableData, searchQuery, fabTypeFilter, dateRange]);

    // ─── Overall totals ──────────────────────────────────
    const overallTotals = useMemo(() => {
        return filteredData.reduce(
            (acc, r) => ({
                pieces:  acc.pieces  + r.pieces,
                sq_ft:   acc.sq_ft   + r.total_sq_ft,
            }),
            { pieces: 0, sq_ft: 0 }
        );
    }, [filteredData]);

    // ─── Column Definitions ──────────────────────────────
    const columns = useMemo<ColumnDef<JobStatusRow>[]>(() => [
        {
            id: 'fab_type',
            accessorKey: 'fab_type',
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <span className="text-sm font-semibold text-[#4b545d] whitespace-nowrap uppercase">
                    {row.original.fab_type}
                </span>
            ),
            enableSorting: true,
            size: 110,
        },
        {
            id: 'fab_id',
            accessorKey: 'fab_id',
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-[#4b545d] font-medium hover:underline cursor-pointer">
                    {row.original.fab_id}
                </span>
            ),
            enableSorting: true,
            size: 80,
        },
        {
            id: 'job_no',
            accessorKey: 'job_no',
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB #" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-[#4b545d]">{row.original.job_no}</span>
            ),
            enableSorting: true,
            size: 80,
        },
        {
            id: 'fab_info',
            header: () => (
                <span className="text-[#7c8689] text-[11px] font-normal">FAB INFO</span>
            ),
            cell: ({ row }) => {
                const r = row.original;
                const line1 = [r.acct_name, r.job_name, r.input_area].filter(Boolean).join(' - ');
                const line2 = [r.stone_type_name, r.stone_color_name, r.stone_thickness_value, r.edge_name].filter(Boolean).join(' - ');
                return (
                    <div className="flex flex-col gap-0.5 text-xs max-w-[280px]">
                        {line1 && <span className="truncate text-[#4b545d] font-medium" title={line1}>{line1}</span>}
                        {line2 && <span className="truncate text-gray-500" title={line2}>{line2}</span>}
                    </div>
                );
            },
            size: 280,
        },
        {
            id: 'pieces',
            accessorKey: 'pieces',
            header: ({ column }) => (
                <DataGridColumnHeader title="# OF PIECES" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-[#4b545d]">{row.original.pieces || '—'}</span>
            ),
            enableSorting: true,
            size: 90,
        },
        {
            id: 'total_sq_ft',
            accessorKey: 'total_sq_ft',
            header: ({ column }) => (
                <DataGridColumnHeader title="TOTAL SQ FT" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-[#4b545d]">{row.original.total_sq_ft.toFixed(1)}</span>
            ),
            enableSorting: true,
            size: 100,
        },
        {
            id: 'template',
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.template_needed} date={row.original.template_date} />
            ),
            size: 110,
        },
        {
            id: 'pre_draft_review',
            header: ({ column }) => (
                <DataGridColumnHeader title="PRE-DRAFT REVIEW" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.pre_draft_needed} date={row.original.pre_draft_review_date} />
            ),
            size: 140,
        },
        {
            id: 'draft',
            header: ({ column }) => (
                <DataGridColumnHeader title="DRAFT" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.draft_needed} date={row.original.draft_date} />
            ),
            size: 110,
        },
        {
            id: 'sct',
            header: ({ column }) => (
                <DataGridColumnHeader title="SCT" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.sct_needed} date={row.original.sct_date} />
            ),
            size: 110,
        },
        {
            id: 'been_revised',
            accessorKey: 'been_revised',
            header: ({ column }) => (
                <DataGridColumnHeader title="BEEN REVISED" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <YesNoBadge value={row.original.been_revised} />
            ),
            size: 110,
        },
        {
            id: 'slabsmith',
            header: ({ column }) => (
                <DataGridColumnHeader title="SLABSMITH COMPLETED" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.slabsmith_needed} date={row.original.slabsmith_date} />
            ),
            size: 160,
        },
        {
            id: 'final_programming',
            header: ({ column }) => (
                <DataGridColumnHeader title="FINAL PROGRAMMING" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <StageCell needed={row.original.fp_needed} date={row.original.final_programming_date} />
            ),
            size: 150,
        },
        {
            id: 'shop_date',
            accessorKey: 'shop_date',
            header: ({ column }) => (
                <DataGridColumnHeader title="SHOP DATE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => {
                const d = row.original.shop_date;
                return <span className="text-sm text-[#4b545d] whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 110,
        },
        {
            id: 'est_completion_date',
            accessorKey: 'est_completion_date',
            header: ({ column }) => (
                <DataGridColumnHeader title="EST. COMPLETION DATE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => {
                const d = row.original.est_completion_date;
                return <span className="text-sm text-[#4b545d] whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 160,
        },
        {
            id: 'percent_complete',
            accessorKey: 'percent_complete',
            header: ({ column }) => (
                <DataGridColumnHeader title="% COMPLETE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => {
                const pct = row.original.percent_complete ?? 0;
                return (
                    <div className="flex flex-col gap-1 min-w-[80px]">
                        <span className="text-sm text-[#4b545d]">{pct.toFixed(2)}%</span>
                        <div className="w-full bg-[#e2e4ed] rounded-full h-[5px] overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: pct === 100 ? '#4caf50' : pct >= 75 ? '#2196f3' : pct >= 50 ? '#ff9800' : '#9e9e9e',
                                }}
                            />
                        </div>
                    </div>
                );
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: 'shop_completion_date',
            accessorKey: 'shop_completion_date',
            header: ({ column }) => (
                <DataGridColumnHeader title="SHOP COMPLETION DATE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => {
                const d = row.original.shop_completion_date;
                return <span className="text-sm text-[#4b545d] whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 160,
        },
        {
            id: 'install_date',
            accessorKey: 'install_date',
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALL DATE" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => {
                const d = row.original.install_date;
                return <span className="text-sm text-[#4b545d] whitespace-nowrap">{d ? format(new Date(d), 'MM/dd/yyyy') : '—'}</span>;
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: 'install_confirmed',
            accessorKey: 'install_confirmed',
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALL CONFIRMED" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <YesNoBadge value={row.original.install_confirmed} />
            ),
            size: 140,
        },
        {
            id: 'installed',
            accessorKey: 'installed',
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALLED" column={column} className="text-[#7c8689] text-[11px] font-normal" />
            ),
            cell: ({ row }) => (
                <YesNoBadge value={row.original.installed} />
            ),
            size: 100,
        },
    ], []);

    // ─── Table instance ──────────────────────────────────
    const table = useReactTable({
        data: filteredData,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel:       getCoreRowModel(),
        getFilteredRowModel:   getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel:     getSortedRowModel(),
        manualPagination: true,
    });

    // ─── Pagination ──────────────────────────────────────
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
    const startItem  = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem    = Math.min(currentPage * itemsPerPage, totalRecords);

    const pageNumbers = useMemo(() => {
        const half  = 2;
        let start   = Math.max(1, currentPage - half);
        let end     = Math.min(totalPages, currentPage + half);
        if (end - start < 4) {
            if (start === 1) end   = Math.min(totalPages, start + 4);
            else             start = Math.max(1, end - 4);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [currentPage, totalPages]);

    // ─── Totals row renderer ─────────────────────────────
    const renderTotalsRow = (label: string) => (
        <tr className="bg-[#eef0f6] font-medium border-b border-[#e2e4ed]">
            {table.getVisibleFlatColumns().map(col => {
                const id = col.id;
                const td = (content: React.ReactNode) => (
                    <td key={id} className="px-4 py-2 text-sm font-semibold text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0 whitespace-nowrap">
                        {content}
                    </td>
                );
                if (id === 'fab_type')     return td(label);
                if (id === 'pieces')       return td(overallTotals.pieces);
                if (id === 'total_sq_ft')  return td(`${overallTotals.sq_ft.toFixed(1)} SF`);
                return <td key={id} className="px-4 py-2 border-r border-[#e2e4ed] last:border-r-0" />;
            })}
        </tr>
    );

    const isLoading = isApiLoading || externalLoading;

    // ─── Render ──────────────────────────────────────────
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
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)]">

                {/* ── Toolbar ── */}
                <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-[#e2e4ed] px-5">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="size-4 text-[#7c8689] absolute start-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="Search by job #, FAB ID, account"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="ps-9 w-[300px] h-[34px] border-[#e2e4ed] focus-visible:ring-0"
                                disabled={isLoading}
                            />
                            {searchQuery && (
                                <Button
                                    size="icon" variant="ghost"
                                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Date Range (by install date) */}
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-[220px] h-[34px] justify-start text-left font-normal border-[#e2e4ed]',
                                        !dateRange && 'text-muted-foreground'
                                    )}
                                    disabled={isLoading}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4 text-[#7c8689]" />
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
                                <div className="flex items-center justify-end gap-1.5 border-t border-[#e2e4ed] p-3">
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

                        {/* FAB Type filter */}
                        <Select
                            value={fabTypeFilter}
                            onValueChange={v => { setFabTypeFilter(v); setCurrentPage(1); }}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                                <SelectValue placeholder="FAB type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="fab only">FAB Only</SelectItem>
                                <SelectItem value="ag redo">AG Redo</SelectItem>
                                <SelectItem value="cust redo">Cust Redo</SelectItem>
                                <SelectItem value="resurface">Resurface</SelectItem>
                                <SelectItem value="resurfacing">Resurfacing</SelectItem>
                                <SelectItem value="fast track">Fast Track</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <CardToolbar className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(table, 'job-status')}
                            disabled={isLoading}
                            className="h-[34px] border-[#e2e4ed] text-[#4b545d]"
                        >
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                {/* ── Table ── */}
                <CardTable>
                    <ScrollArea className="h-[calc(100vh-280px)]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-[#7c8689]">Loading…</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-10">
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className="px-4 py-3 text-left text-xs font-medium text-[#7c8689] bg-[#f9f9f9] border-b border-r border-[#e2e4ed] last:border-r-0 whitespace-nowrap"
                                                    style={{ width: header.getSize() }}
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>

                                <tbody>
                                    {/* Overall totals */}
                                    {renderTotalsRow('Overall Total')}

                                    {filteredData.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={table.getVisibleFlatColumns().length}
                                                className="px-4 py-12 text-center text-sm text-[#7c8689]"
                                            >
                                                No records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        table.getRowModel().rows.map(row => (
                                            <tr
                                                key={row.id}
                                                className={cn(
                                                    'border-b border-[#e2e4ed] transition-colors hover:brightness-95',
                                                    getFabRowBg(row.original.fab_type)
                                                )}
                                            >
                                                {row.getVisibleCells().map(cell => (
                                                    <td
                                                        key={cell.id}
                                                        className="px-4 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardTable>

                {/* ── Pagination ── */}
                <CardFooter className="flex items-center justify-between px-5 py-3 border-t border-[#e2e4ed]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-[#7c8689]">Show</span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-8 w-[70px] border-[#dbdfe9] bg-[#f9f9f9] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-[#7c8689]">per page</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[#7c8689]">
                            {startItem}–{endItem} of {totalRecords}
                        </span>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <ChevronLeft className="h-4 w-4 -ml-3" />
                            </Button>
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {pageNumbers.map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'ghost'}
                                    size="icon"
                                    className={cn(
                                        'h-8 w-8 text-sm',
                                        currentPage === page
                                            ? 'bg-[#e2e4ed] text-[#4b545d] hover:bg-[#e2e4ed]'
                                            : 'text-[#7c8689]'
                                    )}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Button>
                            ))}

                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                            >
                                <ChevronRight className="h-4 w-4" />
                                <ChevronRight className="h-4 w-4 -ml-3" />
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </DataGrid>
    );
};

export { JobStatusTable };