// pages/reports/DailyInstallCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetDailyInstallCompletionQuery } from '@/store/api/report';
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
import { DataGridTable } from '@/components/ui/data-grid-table';
import { UpdateDailyInstallModal } from './component/DailyMonthlyInstall';

interface DailyInstallRow {
    fab_id: number;
    revenue?: number;
    sq_ft?: number;
    installer_name?: string;
    // other fields from API
    [key: string]: any;
}

export function DailyInstallCompletionReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<DailyInstallRow | null>(null);

    const queryParams = useMemo(() => {
        if (!dateRange?.from) return undefined;
        return {
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
        };
    }, [dateRange]);

    const { data, isLoading, refetch } = useGetDailyInstallCompletionQuery(queryParams);
    const rows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        const keys = Object.keys(first);
        
        // Define columns in desired order, with action first
        const actionCol: ColumnDef<any> = {
            id: 'actions',
            header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
            cell: ({ row }) => {
                // Only show edit button if we have a fab_id
                if (!row.original.fab_id) return null;
                return (
                    <Button size="sm" onClick={() => {
                        setSelectedRow(row.original);
                        setUpdateModalOpen(true);
                    }}>
                        Edit
                    </Button>
                );
            },
            size: 80,
        };
        
        const dataCols = keys.map(key => ({
            accessorKey: key,
            header: ({ column }) => <DataGridColumnHeader title={key.replace(/_/g, ' ').toUpperCase()} column={column} />,
            size: key === 'job_name' || key === 'fab_info' ? 250 : 130,
            cell: ({ row }) => {
                let val = row.original[key];
                if (key.includes('date') && val) val = format(new Date(val), 'MMM dd, yyyy');
                if (typeof val === 'number') val = val.toLocaleString();
                return <span className="text-sm">{val ?? '-'}</span>;
            },
        }));
        
        return [actionCol, ...dataCols];
    }, [rows]);

    const table = useReactTable({
        columns,
        data: rows,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (isLoading) return <div className="p-5">Loading daily install completion report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Daily Install Completion</h1>
                <div className="flex items-center gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
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
                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'daily-install-completion')}>Export CSV</Button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Pieces</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.pieces.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQ FT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sq_ft.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue / SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue_per_sq_ft?.toFixed(2) ?? '0.00'}</p>
                    </Card>
                </div>
            )}

            <DataGrid table={table} recordCount={rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b bg-white" />
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-300px)] bg-white">
                            <div className="relative">
                                <DataGridTable />
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>
                    <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>

            {/* Edit Modal */}
            <UpdateDailyInstallModal
                open={updateModalOpen}
                onClose={() => {
                    setUpdateModalOpen(false);
                    setSelectedRow(null);
                }}
                fabId={selectedRow?.fab_id ?? 0}
                initialData={selectedRow ? {
                    revenue: selectedRow.revenue,
                    sq_ft: selectedRow.sq_ft,
                    installer_name: selectedRow.installer_name,
                } : undefined}
                onUpdateSuccess={() => {
                    refetch(); // Refetch data after update
                }}
            />
        </div>
    );
}