// pages/reports/WeeklyInstallerCost.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetWeeklyInstallerLaborCostQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

interface WeekRow {
    week_ending: string;
    number_of_days_per_week: number;
    install_sqft_per_week: number;
    completed_sqft_per_week: number;
    average_sqft_per_day: number;
    gross_revenue: number;
    gross_profit: number;
    total_labor_cost: number;
    total_hours: number;
    labor_cost_per_sq_ft: number;
    overhead_per_week: number;
    cost_to_install_per_sqft: number;
    gross_revenue_per_sq_ft: number;
    gross_profit_less_installer_total_cost_psf: number;
}

interface AnnualRow {
    month: string;
    number_of_weeks: number;
    completed_sqft: number;
    gross_revenue: number;
    gross_profit: number;
    total_labor_cost: number;
    total_hours: number;
    labor_cost_pct_per_dollar_sold: number;
    gross_profit_less_installer_total_cost_psf: number;
}

const $ = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const num = (v: number, d = 2) => v.toFixed(d);

export function WeeklyInstallerCostReport() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [annualPagination, setAnnualPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });

    const { data, isLoading, isError } = useGetWeeklyInstallerLaborCostQuery({ year, month });

    const weeklyData: WeekRow[] = useMemo(() => data?.data?.monthly_report?.weekly_breakdown ?? [], [data]);
    const totals = useMemo(() => data?.data?.monthly_report?.totals ?? null, [data]);
    const annualData: AnnualRow[] = useMemo(() => data?.data?.annual_monthly_summary ?? [], [data]);
    const display = useMemo(() => data?.data?.display ?? null, [data]);

    const weeklyColumns = useMemo<ColumnDef<WeekRow>[]>(() => [
        { accessorKey: 'week_ending', header: ({ column }) => <DataGridColumnHeader title="WEEK ENDING" column={column} />, cell: ({ row }) => format(new Date(row.original.week_ending), 'MMM dd, yyyy'), size: 140 },
        { accessorKey: 'number_of_days_per_week', header: ({ column }) => <DataGridColumnHeader title="DAYS" column={column} />, size: 70 },
        { accessorKey: 'completed_sqft_per_week', header: ({ column }) => <DataGridColumnHeader title="COMPLETED SQFT" column={column} />, cell: ({ row }) => num(row.original.completed_sqft_per_week), size: 140 },
        { accessorKey: 'install_sqft_per_week', header: ({ column }) => <DataGridColumnHeader title="INSTALL SQFT" column={column} />, cell: ({ row }) => num(row.original.install_sqft_per_week), size: 120 },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="GROSS REVENUE" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 140 },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 130 },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 120 },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="TOTAL HRS" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 100 },
        { accessorKey: 'overhead_per_week', header: ({ column }) => <DataGridColumnHeader title="OVERHEAD/WEEK" column={column} />, cell: ({ row }) => $(row.original.overhead_per_week), size: 140 },
        { accessorKey: 'cost_to_install_per_sqft', header: ({ column }) => <DataGridColumnHeader title="COST/SQFT" column={column} />, cell: ({ row }) => $(row.original.cost_to_install_per_sqft), size: 110 },
        { accessorKey: 'gross_revenue_per_sq_ft', header: ({ column }) => <DataGridColumnHeader title="REVENUE/SQFT" column={column} />, cell: ({ row }) => $(row.original.gross_revenue_per_sq_ft), size: 120 },
        { accessorKey: 'gross_profit_less_installer_total_cost_psf', header: ({ column }) => <DataGridColumnHeader title="GP LESS COST/SQFT" column={column} />, cell: ({ row }) => { const v = row.original.gross_profit_less_installer_total_cost_psf; return <span className={v < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{$(v)}</span>; }, size: 160 },
    ], []);

    const annualColumns = useMemo<ColumnDef<AnnualRow>[]>(() => [
        { accessorKey: 'month', header: ({ column }) => <DataGridColumnHeader title="MONTH" column={column} />, cell: ({ row }) => <span className="font-medium">{row.original.month}</span>, size: 120 },
        { accessorKey: 'number_of_weeks', header: ({ column }) => <DataGridColumnHeader title="WEEKS" column={column} />, size: 80 },
        { accessorKey: 'completed_sqft', header: ({ column }) => <DataGridColumnHeader title="SQFT" column={column} />, cell: ({ row }) => num(row.original.completed_sqft), size: 100 },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="GROSS REVENUE" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 140 },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 130 },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 120 },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="TOTAL HRS" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 100 },
        { accessorKey: 'gross_profit_less_installer_total_cost_psf', header: ({ column }) => <DataGridColumnHeader title="GP LESS COST/SQFT" column={column} />, cell: ({ row }) => { const v = row.original.gross_profit_less_installer_total_cost_psf; return <span className={v < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{$(v)}</span>; }, size: 160 },
    ], []);

    const weeklyTable = useReactTable({ columns: weeklyColumns, data: weeklyData, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
    const annualTable = useReactTable({ columns: annualColumns, data: annualData, state: { pagination: annualPagination }, onPaginationChange: setAnnualPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading weekly installer labor cost report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Weekly Installer Labor Cost</h1>
                <div className="flex items-center gap-2">
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px] h-[34px] border-[#e2e4ed]"><SelectValue /></SelectTrigger>
                        <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                        <SelectTrigger className="w-[130px] h-[34px] border-[#e2e4ed]"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {/* Display Widgets */}
            {display && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Total Employees</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{display.total_employee}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Default Overhead / Week</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{$(display.default_overhead_per_week)}</p>
                    </Card>
                </div>
            )}

            {/* Weekly Breakdown Table */}
            <DataGrid table={weeklyTable} recordCount={weeklyData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{monthName} {year} – Weekly Breakdown</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px] border-[#e2e4ed]" onClick={() => exportTableToCSV(weeklyTable, `installer-cost-weekly-${year}-${month}`)}>Export CSV</Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4 bg-white">

                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {weeklyTable.getHeaderGroups().map(hg => (
                                            <tr key={hg.id}>
                                                {hg.headers.map(h => (
                                                    <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50 whitespace-normal" style={{ width: h.getSize(), minWidth: h.getSize() }}>
                                                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {totals && (
                                            <tr className="bg-[#f0f7e0] font-semibold border-b border-[#e2e4ed]">
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">MONTH TOTAL</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{totals.number_of_days_per_week}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.completed_sqft_per_week)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.install_sqft_per_week)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_profit)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.total_labor_cost)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.total_hours)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.overhead_per_week)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.cost_to_install_per_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue_per_sq_ft)}</td>
                                                <td className={`px-3 py-2 text-sm font-semibold ${totals.gross_profit_less_installer_total_cost_psf < 0 ? 'text-red-600' : 'text-green-600'}`}>{$(totals.gross_profit_less_installer_total_cost_psf)}</td>
                                            </tr>
                                        )}
                                        {weeklyTable.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {weeklyData.length === 0 && (
                                            <tr><td colSpan={weeklyColumns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">No data available.</td></tr>
                                        )}
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

            {/* Annual Monthly Summary Table */}
            <DataGrid table={annualTable} recordCount={annualData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Annual Monthly Summary – {year}</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px] border-[#e2e4ed]" onClick={() => exportTableToCSV(annualTable, `installer-cost-annual-${year}`)}>Export CSV</Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[50vh] bg-white">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {annualTable.getHeaderGroups().map(hg => (
                                            <tr key={hg.id}>
                                                {hg.headers.map(h => (
                                                    <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50 whitespace-normal" style={{ width: h.getSize(), minWidth: h.getSize() }}>
                                                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {annualTable.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>
                </Card>
            </DataGrid>
        </div>
    );
}
