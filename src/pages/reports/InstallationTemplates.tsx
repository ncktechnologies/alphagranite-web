// pages/reports/InstallationTemplate.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { useGetInstallationTemplateReportQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { cn } from '@/lib/utils';

interface ActivityRow {
    activity_type: string;
    activity_date: string;
    installer: string;
    installer_hours: number;
    job_name: string;
    activity_complete: boolean;
    time_duration: string;
    sq_ft_installed: number;
    sq_ft_incomplete: number;
    reason_if_not_complete: string | null;
}

// Component for a single installer card with nested table
function InstallerCard({ installer, rows, isExpanded, onToggle }: { installer: string; rows: ActivityRow[]; isExpanded: boolean; onToggle: () => void }) {
    const columns = useMemo<ColumnDef<ActivityRow>[]>(() => [
        { accessorKey: 'activity_type', header: ({ column }) => <DataGridColumnHeader title="TYPE" column={column} />, size: 100 },
        { accessorKey: 'activity_date', header: ({ column }) => <DataGridColumnHeader title="DATE" column={column} />, cell: ({ row }) => format(new Date(row.original.activity_date), 'MMM dd, yyyy'), size: 110 },
        { accessorKey: 'job_name', header: ({ column }) => <DataGridColumnHeader title="JOB" column={column} />, size: 180 },
        { accessorKey: 'activity_complete', header: ({ column }) => <DataGridColumnHeader title="COMPLETE" column={column} />, cell: ({ row }) => row.original.activity_complete ? 'Yes' : 'No', size: 90 },
        { accessorKey: 'time_duration', header: ({ column }) => <DataGridColumnHeader title="DURATION" column={column} />, size: 90 },
        { accessorKey: 'sq_ft_installed', header: ({ column }) => <DataGridColumnHeader title="SQFT INSTALLED" column={column} />, cell: ({ row }) => row.original.sq_ft_installed.toFixed(0), size: 120 },
        { accessorKey: 'sq_ft_incomplete', header: ({ column }) => <DataGridColumnHeader title="SQFT INCOMPLETE" column={column} />, cell: ({ row }) => row.original.sq_ft_incomplete.toFixed(0), size: 120 },
        { accessorKey: 'reason_if_not_complete', header: ({ column }) => <DataGridColumnHeader title="REASON" column={column} />, size: 200 },
    ], []);

    const table = useReactTable({ columns, data: rows, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
    const totalHours = rows.reduce((s, r) => s + r.installer_hours, 0);
    const totalInstalled = rows.reduce((s, r) => s + r.sq_ft_installed, 0);
    const totalIncomplete = rows.reduce((s, r) => s + r.sq_ft_incomplete, 0);

    return (
        <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 flex justify-between items-center" onClick={onToggle}>
                <div className="flex items-center gap-4">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                <div className="p-3 border-t">
                    <DataGrid table={table} recordCount={rows.length} tableLayout={{ cellBorder: true }}>
                        <div className="rounded-md overflow-hidden">
                            <ScrollArea className="">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-gray-50">
                                        {table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold border-b border-[#e2e4ed]">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}
                                    </thead>
                                    <tbody>
                                        {table.getRowModel().rows.map(row => <tr key={row.id} className="border-b">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
                                    </tbody>
                                </table>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    </DataGrid>
                </div>
            )}
        </Card>
    );
}

export function InstallationTemplateReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());
    const [expandedInstallers, setExpandedInstallers] = useState<Set<string>>(new Set());

    const queryParams = useMemo(() => {
        if (!dateRange?.from) return undefined;
        return { start_date: format(dateRange.from, 'yyyy-MM-dd'), end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd') };
    }, [dateRange]);

    const { data, isLoading } = useGetInstallationTemplateReportQuery(queryParams);
    const rows: ActivityRow[] = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);

    // Group by installer
    const grouped = useMemo(() => {
        const map = new Map<string, ActivityRow[]>();
        rows.forEach(row => {
            const installer = row.installer || 'Unknown';
            if (!map.has(installer)) map.set(installer, []);
            map.get(installer)!.push(row);
        });
        return Array.from(map.entries()).map(([installer, installerRows]) => ({ installer, rows: installerRows }));
    }, [rows]);

    const toggleInstaller = (installer: string) => {
        setExpandedInstallers(prev => {
            const next = new Set(prev);
            if (next.has(installer)) next.delete(installer);
            else next.add(installer);
            return next;
        });
    };

    if (isLoading) return <div className="p-5">Loading...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Installation & Template Report</h1>
                <div className="flex gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date Range'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={() => exportTableToCSV({}, 'installation-template')}>Export CSV</Button>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4"><div className="text-sm">Row Count</div><div className="text-2xl font-semibold">{summary.row_count}</div></Card>
                    <Card className="p-4"><div className="text-sm">Total Installer Hours</div><div className="text-2xl font-semibold">{summary.total_installer_hours?.toFixed(2) ?? 0}</div></Card>
                    <Card className="p-4"><div className="text-sm">Total SQFT Installed</div><div className="text-2xl font-semibold">{summary.total_sq_ft_installed?.toFixed(0) ?? 0}</div></Card>
                    <Card className="p-4"><div className="text-sm">Total SQFT Incomplete</div><div className="text-2xl font-semibold">{summary.total_sq_ft_incomplete?.toFixed(0) ?? 0}</div></Card>
                </div>
            )}

            <div className="space-y-4">
                {grouped.map(group => (
                    <InstallerCard
                        key={group.installer}
                        installer={group.installer}
                        rows={group.rows}
                        isExpanded={expandedInstallers.has(group.installer)}
                        onToggle={() => toggleInstaller(group.installer)}
                    />
                ))}
            </div>
        </div>
    );
}