import { useParams } from 'react-router';
import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    PaginationState,
    ExpandedState,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

import {
    useGetReportRedosQuery,
    useGetWeeklyFabricationLaborCostQuery,
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
    CardHeading,
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
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';

const reportConfig: Record<string, { hook: any, title: string, groupBy?: string }> = {
    'redos': { hook: useGetReportRedosQuery, title: 'Redos Report' },
    'weekly-fabrication-cost': { hook: useGetWeeklyFabricationLaborCostQuery, title: 'Weekly Fabrication Labor Cost' },
    'weekly-installer-cost': { hook: useGetWeeklyInstallerLaborCostQuery, title: 'Weekly Installer Labor Cost' },
    'owner-overview': { hook: useGetOwnerOverviewQuery, title: 'Owner Overview' },
    'redo-analysis': { hook: useGetRedoAnalysisQuery, title: 'Redo Analysis', groupBy: 'stage' },
    'shop-status': { hook: useGetShopStatusReportQuery, title: 'Shop Status' },
    'install-performance': { hook: useGetInstallPerformanceQuery, title: 'Install Performance' },
    'weekly-trends': { hook: useGetWeeklyTrendsQuery, title: 'Weekly Trends' },
    'installation-template': { hook: useGetInstallationTemplateReportQuery, title: 'Installation Template', groupBy: 'installer' },
    'monthly-install-completion': { hook: useGetMonthlyInstallCompletionQuery, title: 'Monthly Install Completion' },
    'daily-install-completion': { hook: useGetDailyInstallCompletionQuery, title: 'Daily Install Completion', groupBy: 'install_date' },
    'monthly-cut-completion': { hook: useGetMonthlyCutCompletionQuery, title: 'Monthly Cut Completion' },
    'turnaround-times': { hook: useGetTurnaroundTimesQuery, title: 'Turnaround Times' },
    'service-level': { hook: useGetServiceLevelQuery, title: 'Service Level' },
    'installer-rates': { hook: useGetInstallerRatesQuery, title: 'Installer Rates' },
};

const formatLabel = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
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

function ReportRenderer({ useQueryHook, title, groupBy }: { useQueryHook: any, title: string, groupBy?: string }) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState<Date>(new Date());

    const queryParams = useMemo(() => {
        let params: any = {};
        if (dateRange?.from) {
            params.start_date = format(dateRange.from, 'yyyy-MM-dd');
            params.year = dateRange.from.getFullYear();
            params.month = dateRange.from.getMonth() + 1;
        }
        if (dateRange?.to) {
            params.end_date = format(dateRange.to, 'yyyy-MM-dd');
        }
        return Object.keys(params).length > 0 ? params : undefined;
    }, [dateRange]);

    const { data: rawData, isLoading, isError, isFetching } = useQueryHook(queryParams);

    const { listData, widgetData } = useMemo(() => {
        let listData: any[] = [];
        let widgetData: any = null;

        if (rawData) {
            const actualData = rawData.data ? rawData.data : rawData;

            if (Array.isArray(actualData)) {
                listData = actualData;
            } else if (typeof actualData === 'object' && actualData !== null) {
                let tempWidgetData: any = {};
                
                if (actualData.kpis && typeof actualData.kpis === 'object') {
                    Object.assign(tempWidgetData, actualData.kpis);
                }
                if (actualData.summary && typeof actualData.summary === 'object') {
                    Object.assign(tempWidgetData, actualData.summary);
                }
                
                Object.entries(actualData).forEach(([key, val]) => {
                    if (val !== null && typeof val !== 'object' && !Array.isArray(val) && key !== 'title' && key !== 'message') {
                        tempWidgetData[key] = val;
                    }
                });

                if (Object.keys(tempWidgetData).length > 0) {
                    widgetData = tempWidgetData;
                }

                if (actualData.stage_breakdown) listData = actualData.stage_breakdown;
                else if (actualData.rows) listData = actualData.rows;
                else if (actualData.redo_by_stage) listData = actualData.redo_by_stage;
                else if (actualData.daily_totals) listData = actualData.daily_totals;
                else {
                    const arrayProp = Object.values(actualData).find(val => Array.isArray(val));
                    if (arrayProp) listData = arrayProp as any[];
                }
            }
        }
        return { listData, widgetData };
    }, [rawData]);

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 50,
    });
    
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!listData || listData.length === 0) return [];
        const firstItem = listData[0];
        if (typeof firstItem !== 'object' || firstItem === null) return [];

        return Object.keys(firstItem).map(key => ({
            id: key,
            accessorKey: key,
            size: 200, // Ensures columns are not cramped
            header: ({ column }) => (
                <DataGridColumnHeader title={formatLabel(key).toUpperCase()} column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row, getValue }) => {
                let val = getValue();
                
                if (key === 'stage' || key === 'activity_type' || key === 'fab_type') {
                    val = formatLabel(val as string);
                }

                // If this row is a grouping row and this is the column it is grouping by
                if (row.getIsGrouped() && row.groupingColumnId === key) {
                    return (
                        <button
                            onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                            className="flex items-center gap-2 font-semibold cursor-pointer text-[#4b545d] hover:text-black transition-colors"
                        >
                            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                            {val === null || val === undefined ? '-' : String(val)} 
                            <span className="text-xs text-[#7c8689] font-normal ml-1">({row.subRows.length})</span>
                        </button>
                    );
                }

                if (row.getIsGrouped()) return null;
                if (row.depth > 0 && groupBy === key) return null;

                return (
                    <span className="text-sm text-[#4b545d] truncate max-w-[200px] block">
                        {val === null || val === undefined ? '-' : String(val)}
                    </span>
                );
            },
        }));
    }, [listData, groupBy]);

    const groupingState = useMemo(() => groupBy ? [groupBy] : [], [groupBy]);

    const tableMeta = useMemo(() => ({
        getRowAttributes: (row: any) => {
            const fabType = row.original.fab_type;
            if (fabType && !row.getIsGrouped()) {
                return { style: { backgroundColor: getFabColor(fabType) } };
            }
            if (row.getIsGrouped()) {
                return { className: 'bg-[#f0f7e0]' }; 
            }
            return {};
        }
    }), []);

    const table = useReactTable({
        columns,
        data: listData,
        pageCount: Math.ceil((listData?.length || 0) / pagination.pageSize),
        state: { 
            pagination, 
            expanded,
            grouping: groupingState
        },
        onPaginationChange: setPagination,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        meta: tableMeta
    });

    if (isLoading && !isFetching && listData.length === 0) return <div className="p-4 flex items-center text-[#7c8689]"><div className="animate-spin mr-2 border-2 border-primary border-t-transparent rounded-full h-4 w-4"></div> Loading report...</div>;
    if (isError) return <div className="p-4 text-red-500">Error loading report</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold text-[#4b545d]">{title}</h1>
                    {isFetching && <span className="text-sm text-[#7c8689] animate-pulse">Updating...</span>}
                </div>
            </div>

            {/* Widget Area */}
            {widgetData && Object.keys(widgetData).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-2">
                    {Object.entries(widgetData).map(([key, value]) => {
                        if (typeof value === 'object' && value !== null) return null;
                        return (
                            <Card key={key} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                                <h3 className="text-sm text-[#7c8689] font-medium uppercase tracking-wider">{formatLabel(key)}</h3>
                                <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{String(value)}</p>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Table Area */}
            {listData.length > 0 ? (
                <DataGrid
                    table={table}
                    recordCount={listData.length}
                    tableLayout={{
                        columnsPinnable: true,
                        columnsMovable: true,
                        columnsVisibility: true,
                        cellBorder: true,
                        columnsResizable: true,
                        width: 'fixed'
                    }}
                >
                    <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                        <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row flex-wrap items-center justify-between gap-3 bg-white">
                            <div className="flex items-center gap-2">
                                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant="outline"
                                            className={cn(
                                                'w-[260px] justify-start text-left font-normal bg-white border-[#e2e4ed] shadow-sm h-[34px]',
                                                !dateRange && 'text-[#7c8689]'
                                            )}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4 text-[#7c8689]" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, 'MMM dd, yyyy')} - {' '}
                                                        {format(dateRange.to, 'MMM dd, yyyy')}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, 'MMM dd, yyyy')
                                                )
                                            ) : (
                                                <span>Filter by Date Range</span>
                                            )}
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
                                        <div className="flex items-center justify-end gap-2 border-t border-[#e2e4ed] p-3 bg-gray-50/50">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="border-[#e2e4ed]"
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
                                {dateRange && (
                                    <Button variant="ghost" size="sm" className="px-2 text-[#7c8689] h-[34px]" onClick={() => {
                                        setDateRange(undefined);
                                        setTempDateRange(undefined);
                                    }}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <CardToolbar>
                                <Button size="sm" variant="outline" className="h-[34px] border-[#e2e4ed] text-[#4b545d]" onClick={() => exportTableToCSV(table, title)}>
                                    Export CSV
                                </Button>
                            </CardToolbar>
                        </CardHeader>
                        <CardTable>
                            <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-250px)] [&>[data-radix-scroll-area-viewport]]:pb-4 bg-white">
                                <DataGridTable />
                                <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                            </ScrollArea>
                        </CardTable>
                        <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                            <DataGridPagination />
                        </CardFooter>
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

    return <ReportRenderer key={reportId} useQueryHook={config.hook} title={config.title} groupBy={config.groupBy} />;
}
