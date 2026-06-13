import { useParams } from 'react-router';
import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';

import {
    useGetWeeklyInstallerLaborCostQuery,
    useGetOwnerOverviewQuery,
    useGetRedoAnalysisQuery,
    useGetShopStatusReportQuery,
    useGetInstallPerformanceQuery,
    useGetWeeklyTrendsQuery,
    useGetInstallationTemplateReportQuery,
    useGetMonthlyInstallCompletionQuery,
    useGetDailyInstallCompletionQuery,
    useGetMonthlyCutCompletionQuery,
    useGetTurnaroundTimesQuery,
    useGetServiceLevelQuery,
    useGetInstallerRatesQuery,
} from '@/store/api/report';

import {
    Card,
    CardFooter,
    CardHeader,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';

// ---------- Configuration (removed redos and weekly-fabrication-cost) ----------
const reportConfig: Record<string, { hook: any; title: string; groupBy?: string }> = {
    'service-level': { hook: useGetServiceLevelQuery, title: 'Service Level' },
    'installer-rates': { hook: useGetInstallerRatesQuery, title: 'Installer Rates' },
};

// ---------- Helpers (unchanged) ----------
const formatLabel = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[-_]/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const fabTypeColorMap: Record<string, string> = {
    standard: '#9eeb47',
    'fab only': '#5bd1d7',
    'cust redo': '#f0bf4c',
    resurface: '#d094ea',
    'fast track': '#f59794',
    'ag redo': '#f5cc94',
};

const getFabColor = (fabType: string | undefined): string => {
    if (!fabType) return 'transparent';
    return fabTypeColorMap[fabType.toLowerCase()] || 'transparent';
};

const parseFabInfo = (info: string) => {
    if (!info) return { leftLine1: [], leftLine2: [], right: [] };
    const parts = info.split(' - ').filter(p => p.trim());
    return {
        leftLine1: parts.slice(0, 3),
        leftLine2: parts.slice(3, 6),
        right: parts.slice(6),
    };
};

const formatDateValue = (value: any, key: string): string => {
    if (!value) return '-';
    const dateFieldNames = [
        'created_at', 'updated_at', 'date', 'activity_date', 'fab_created_date',
        'week_ending', 'shop_date_schedule', 'install_date', 'completion_date',
        'scheduled_start_date', 'scheduled_end_date', 'actual_start_date', 'actual_end_date',
        'template_completed_date', 'draft_completed_date', 'final_programming_completed_date'
    ];
    const looksLikeDate = dateFieldNames.includes(key) || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T| )/.test(value));
    if (looksLikeDate) {
        try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) return format(date, 'MMM dd, yyyy');
        } catch (e) {}
    }
    return String(value);
};

// ---------- InstallerCard & InstallerCards (unchanged) ----------
function InstallerCard({ installer, rows, columns, isExpanded, onToggle }: {
    installer: string;
    rows: any[];
    columns: ColumnDef<any>[];
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const table = useReactTable({
        columns,
        data: rows,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    const totalHours = useMemo(() => rows.reduce((s, r) => s + (r.installer_hours || 0), 0), [rows]);
    const totalInstalled = useMemo(() => rows.reduce((s, r) => s + (r.sq_ft_installed || 0), 0), [rows]);
    const totalIncomplete = useMemo(() => rows.reduce((s, r) => s + (r.sq_ft_incomplete || 0), 0), [rows]);

    return (
        <Card className="overflow-hidden border border-[#e2e4ed] rounded-[12px]">
            <div className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 flex justify-between items-center" onClick={onToggle}>
                <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    <span className="font-semibold text-lg">{installer}</span>
                    <div className="flex gap-4 text-sm text-gray-500">
                        <span>{rows.length} activities</span>
                        <span>Hours: {totalHours.toFixed(2)}</span>
                        <span>Installed: {totalInstalled.toFixed(0)} sqft</span>
                        <span>Incomplete: {totalIncomplete.toFixed(0)} sqft</span>
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className="p-3">
                    <DataGrid table={table} recordCount={rows.length} tableLayout={{ cellBorder: true }}>
                        <div className="border rounded overflow-hidden"><DataGridTable /></div>
                    </DataGrid>
                </div>
            )}
        </Card>
    );
}

function InstallerCards({ data, columns }: { data: any[]; columns: ColumnDef<any>[] }) {
    const [expandedInstallers, setExpandedInstallers] = useState<Set<string>>(new Set());
    const grouped = useMemo(() => {
        const map = new Map<string, any[]>();
        data.forEach(row => {
            const installer = row.installer || 'Unknown';
            if (!map.has(installer)) map.set(installer, []);
            map.get(installer)!.push(row);
        });
        return Array.from(map.entries()).map(([installer, rows]) => ({ installer, rows }));
    }, [data]);

    const toggleInstaller = (installer: string) => {
        setExpandedInstallers(prev => {
            const next = new Set(prev);
            if (next.has(installer)) next.delete(installer);
            else next.add(installer);
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {grouped.map(group => (
                <InstallerCard
                    key={group.installer}
                    installer={group.installer}
                    rows={group.rows}
                    columns={columns}
                    isExpanded={expandedInstallers.has(group.installer)}
                    onToggle={() => toggleInstaller(group.installer)}
                />
            ))}
        </div>
    );
}

// ---------- Main ReportRenderer ----------
function ReportRenderer({ useQueryHook, title, groupBy, reportId }: { useQueryHook: any; title: string; groupBy?: string; reportId?: string }) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState<Date>(new Date());

    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const isWeeklyReport = reportId === 'weekly-installer-cost'; // only weekly-installer-cost remains

    const queryParams = useMemo(() => {
        if (isWeeklyReport) return { year, month: selectedMonth };
        let params: any = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.year = dateRange.from.getFullYear();
            params.month = dateRange.from.getMonth() + 1;
        }
        if (dateRange?.to) params.end_date = format(dateRange.to, 'yyyy-MM-dd');
        return Object.keys(params).length ? params : undefined;
    }, [isWeeklyReport, year, selectedMonth, dateRange]);

    const { data: rawData, isLoading, isError, isFetching } = useQueryHook(queryParams);

    const { listData, widgetData, totals } = useMemo(() => {
        let listData: any[] = [], widgetData: any = null, totals: any = null;
        if (rawData) {
            const actualData = rawData.data ? rawData.data : rawData;
            if (actualData.monthly_report?.totals) totals = actualData.monthly_report.totals;
            else if (actualData.totals && typeof actualData.totals === 'object') totals = actualData.totals;
            else if (actualData.summary && typeof actualData.summary === 'object') totals = actualData.summary;

            if (Array.isArray(actualData)) listData = actualData;
            else if (typeof actualData === 'object' && actualData !== null) {
                let tempWidgetData: any = {};
                if (actualData.kpis) Object.assign(tempWidgetData, actualData.kpis);
                if (actualData.summary) Object.assign(tempWidgetData, actualData.summary);
                Object.entries(actualData).forEach(([key, val]) => {
                    if (val !== null && typeof val !== 'object' && !Array.isArray(val) && key !== 'title' && key !== 'message') {
                        tempWidgetData[key] = val;
                    }
                });
                if (Object.keys(tempWidgetData).length) widgetData = tempWidgetData;
                if (actualData.stage_breakdown) listData = actualData.stage_breakdown;
                else if (actualData.rows) listData = actualData.rows;
                else if (actualData.redo_by_stage) listData = actualData.redo_by_stage;
                else if (actualData.daily_totals) listData = actualData.daily_totals;
                else if (actualData.weekly_breakdown) listData = actualData.weekly_breakdown;
                else {
                    const arrayProp = Object.values(actualData).find(val => Array.isArray(val));
                    if (arrayProp) listData = arrayProp as any[];
                }
            }
        }
        return { listData, widgetData, totals };
    }, [rawData]);

    // Build columns dynamically
    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!listData.length) return [];
        const firstItem = listData[0];
        if (typeof firstItem !== 'object' || firstItem === null) return [];
        return Object.keys(firstItem).map(key => ({
            id: key,
            accessorKey: key,
            size: key === 'fab_info' ? 450 : 180,
            header: ({ column }) => <DataGridColumnHeader title={formatLabel(key).toUpperCase()} column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row, getValue }) => {
                let val = getValue();
                const isTotalRow = row.original?._isTotalRow;
                if (key === 'stage' || key === 'activity_type' || key === 'fab_type') val = formatLabel(val as string);
                if (key === 'fab_info' && typeof val === 'string') {
                    const { leftLine1, leftLine2, right } = parseFabInfo(val);
                    return (
                        <div className="flex gap-4 text-xs max-w-[500px]">
                            <div className="flex-1 min-w-0">
                                {leftLine1.length > 0 && <div className="truncate text-gray-600" title={leftLine1.join(' - ')}>{leftLine1.join(' - ')}</div>}
                                {leftLine2.length > 0 && <div className="truncate text-gray-600" title={leftLine2.join(' - ')}>{leftLine2.join(' - ')}</div>}
                                {!leftLine1.length && !leftLine2.length && <div className="truncate text-gray-400 italic">No details</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                {right.length ? <div className="truncate text-gray-600" title={right.join(' - ')}>{right.join(' - ')}</div> : <div className="truncate text-gray-400 italic">—</div>}
                            </div>
                        </div>
                    );
                }
                const formattedValue = formatDateValue(val, key);
                return <span className={cn('text-sm text-[#4b545d] truncate max-w-[200px] block', isTotalRow && 'font-semibold')}>{formattedValue}</span>;
            },
        }));
    }, [listData]);

    if (isLoading && !isFetching && listData.length === 0) return <div className="p-4 flex items-center text-[#7c8689]"><div className="animate-spin mr-2 border-2 border-primary border-t-transparent rounded-full h-4 w-4"></div> Loading report...</div>;
    if (isError) return <div className="p-4 text-red-500">Error loading report</div>;

    // ----- Installation Template (widgets + collapsible cards) -----
    if (groupBy === 'installer') {
        // Build widget data from summary totals
        const installerWidgets = totals ? {
            'Total Installer Hours': totals.total_installer_hours ?? totals.installer_hours ?? 0,
            'Total SQFT Installed': totals.total_sq_ft_installed ?? totals.sq_ft_installed ?? 0,
            'Total SQFT Incomplete': totals.total_sq_ft_incomplete ?? totals.sq_ft_incomplete ?? 0,
            'Row Count': totals.row_count ?? listData.length,
        } : null;

        return (
            <div className="flex flex-col gap-5 p-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h1 className="text-2xl font-semibold text-[#4b545d]">{title}</h1>
                    <div className="flex items-center gap-2">
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-[34px]">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date Range'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                                <div className="flex justify-end gap-2 p-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                    <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        {dateRange && <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>}
                        <Button variant="outline" onClick={() => exportTableToCSV(table, title)}>Export CSV</Button>
                    </div>
                </div>

                {/* Widget area */}
                {installerWidgets && Object.keys(installerWidgets).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-2">
                        {Object.entries(installerWidgets).map(([key, value]) => (
                            <Card key={key} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                                <h3 className="text-sm text-[#7c8689] font-medium uppercase tracking-wider">{formatLabel(key)}</h3>
                                <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{typeof value === 'number' ? value.toLocaleString() : value}</p>
                            </Card>
                        ))}
                    </div>
                )}

                {listData.length > 0 ? <InstallerCards data={listData} columns={columns} /> : (
                    <Card className="p-12 text-center border-dashed border-[#e2e4ed] bg-gray-50 rounded-[12px]"><p className="text-[#7c8689] text-lg">No data available.</p></Card>
                )}
            </div>
        );
    }

    // ----- Default: flat table with totals row (for all other reports) -----
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const dataWithTotal = useMemo(() => {
        if (!totals) return listData;
        if (pagination.pageIndex !== 0) return listData;
        if (!listData.length) return listData;
        const firstRow = listData[0];
        const totalRow: any = { _isTotalRow: true };
        Object.keys(firstRow).forEach(key => { totalRow[key] = totals[key] !== undefined ? totals[key] : null; });
        const firstKey = Object.keys(firstRow)[0];
        if (firstKey) totalRow[firstKey] = 'TOTAL';
        // special mapping for weekly totals
        if (totals.completed_sqft !== undefined && totalRow.completed_sqft === null) totalRow.completed_sqft = totals.completed_sqft;
        if (totals.gross_revenue !== undefined && totalRow.gross_revenue === null) totalRow.gross_revenue = totals.gross_revenue;
        if (totals.total_labor_cost !== undefined && totalRow.total_labor_cost === null) totalRow.total_labor_cost = totals.total_labor_cost;
        return [totalRow, ...listData];
    }, [totals, listData, pagination.pageIndex]);

    const table = useReactTable({
        columns,
        data: dataWithTotal,
        pageCount: Math.ceil((dataWithTotal?.length || 0) / pagination.pageSize),
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            getRowAttributes: (row: any) => {
                const fabType = row.original?.fab_type;
                if (row.original?._isTotalRow) return { className: 'bg-[#f0f7e0] [&>td]:border-0' };
                if (fabType) return { style: { backgroundColor: getFabColor(fabType) } };
                return {};
            },
        },
    });

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-[#4b545d]">{title}</h1>
                <div className="flex items-center gap-2">
                    {isWeeklyReport ? (
                        <div className="flex items-center gap-2">
                            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                                <SelectTrigger className="w-[100px] h-[34px]"><SelectValue placeholder="Year" /></SelectTrigger>
                                <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                                <SelectTrigger className="w-[130px] h-[34px]"><SelectValue placeholder="Month" /></SelectTrigger>
                                <SelectContent>{Array.from({length:12},(_,i)=>i+1).map(m => <SelectItem key={m} value={String(m)}>{new Date(2000,m-1,1).toLocaleString('default',{month:'long'})}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[260px] justify-start text-left font-normal h-[34px]">
                                    <CalendarDays className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : <span>Filter by Date Range</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                                <div className="flex justify-end gap-2 p-3 border-t">
                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                    <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    {!isWeeklyReport && dateRange && <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>}
                    <Button variant="outline" onClick={() => exportTableToCSV(table, title)}>Export CSV</Button>
                </div>
            </div>

            {widgetData && Object.keys(widgetData).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(widgetData).map(([k, v]) => typeof v !== 'object' && (
                        <Card key={k} className="p-4 shadow-sm border border-[#e2e4ed] rounded-[12px] bg-white">
                            <h3 className="text-sm text-[#7c8689] font-medium uppercase">{formatLabel(k)}</h3>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{String(v)}</p>
                        </Card>
                    ))}
                </div>
            )}

            {listData.length > 0 ? (
                <DataGrid table={table} recordCount={dataWithTotal.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, cellBorder: true, columnsResizable: true, width: 'fixed' }}>
                    <Card className="border border-[#e2e4ed] rounded-[12px] shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b bg-white" />
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-250px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter><DataGridPagination /></CardFooter>
                    </Card>
                </DataGrid>
            ) : (
                <Card className="p-12 text-center border-dashed border-[#e2e4ed] bg-gray-50 rounded-[12px]">
                    <p className="text-[#7c8689] text-lg">No data available for this report.</p>
                </Card>
            )}
        </div>
    );
}

export default function ReportPage() {
    const { reportId } = useParams();
    const config = reportConfig[reportId || ''] || reportConfig['owner-overview'];
    return <ReportRenderer key={reportId} useQueryHook={config.hook} title={config.title} groupBy={config.groupBy} reportId={reportId} />;
}