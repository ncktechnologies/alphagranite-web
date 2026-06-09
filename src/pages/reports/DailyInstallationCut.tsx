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

export function DailyInstallCompletionReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const queryParams = useMemo(() => {
        if (!dateRange?.from) return undefined;
        return {
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
        };
    }, [dateRange]);

    const { data, isLoading } = useGetDailyInstallCompletionQuery(queryParams);
    const rows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        return Object.keys(first).map(key => ({
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
    }, [rows]);

    const table = useReactTable({ columns, data: rows, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    if (isLoading) return <div className="p-5">Loading...</div>;

    return (
        <div className="p-5">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Daily Install Completion</h1>
                <div className="flex gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start', !dateRange && 'text-muted-foreground')}>
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
                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'daily-install-completion')}>Export CSV</Button>
                </div>
            </div>
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4"><div className="text-sm">Pieces</div><div className="text-2xl font-bold">{summary.pieces}</div></Card>
                    <Card className="p-4"><div className="text-sm">SQ FT</div><div className="text-2xl font-bold">{summary.sq_ft.toFixed(2)}</div></Card>
                    <Card className="p-4"><div className="text-sm">Revenue</div><div className="text-2xl font-bold">${summary.revenue.toFixed(2)}</div></Card>
                    <Card className="p-4"><div className="text-sm">Revenue/SQFT</div><div className="text-2xl font-bold">${summary.revenue_per_sq_ft.toFixed(2)}</div></Card>
                </div>
            )}
            <DataGrid table={table} recordCount={rows.length} tableLayout={{ cellBorder: true }}>
                <Card><CardHeader className="py-3 border-b"><CardToolbar /></CardHeader><CardTable><ScrollArea className="h-[calc(100vh-300px)]"><DataGridTable /><ScrollBar orientation="horizontal" /></ScrollArea></CardTable><CardFooter><DataGridPagination /></CardFooter></Card>
            </DataGrid>
        </div>
    );
}