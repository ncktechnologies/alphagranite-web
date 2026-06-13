// pages/reports/WeeklyFabCost.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetWeeklyFabricationLaborCostQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

interface WeeklyData {
    week_ending: string;
    number_of_days: number;
    cut_sqft_saw: number;
    wj_sqft: number;
    completed_sqft: number;
    average_sqft_per_day: number;
    gross_revenue: number;
    gross_profit: number;
    total_labor_cost: number;
    total_hours: number;
    shop_labor_per_hour: number;
    labor_cost_per_sq_ft: number;
    gross_revenue_per_sqft_fabricated: number;
    shop_total_cost_per_sqft: number;
    overhead_per_week: number;
}

const $ = (v: number) => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const num = (v: number, d = 2) => v.toFixed(d);

export function WeeklyFabricationCostReport() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const { data, isLoading, isError } = useGetWeeklyFabricationLaborCostQuery({ year, month });

    const weeklyData: WeeklyData[] = useMemo(() => data?.data?.monthly_report?.weekly_breakdown ?? [], [data]);
    const totals = useMemo(() => data?.data?.monthly_report?.totals ?? null, [data]);

    const columns = useMemo<ColumnDef<WeeklyData>[]>(() => [
        { accessorKey: 'week_ending', header: ({ column }) => <DataGridColumnHeader title="WEEK ENDING" column={column} />, cell: ({ row }) => format(new Date(row.original.week_ending), 'MMM dd, yyyy'), size: 140 },
        { accessorKey: 'number_of_days', header: ({ column }) => <DataGridColumnHeader title="DAYS" column={column} />, size: 70 },
        { accessorKey: 'completed_sqft', header: ({ column }) => <DataGridColumnHeader title="COMPLETED SQFT" column={column} />, cell: ({ row }) => num(row.original.completed_sqft), size: 130 },
        { accessorKey: 'cut_sqft_saw', header: ({ column }) => <DataGridColumnHeader title="CUT SQFT (SAW)" column={column} />, cell: ({ row }) => num(row.original.cut_sqft_saw), size: 130 },
        { accessorKey: 'wj_sqft', header: ({ column }) => <DataGridColumnHeader title="WJ SQFT" column={column} />, cell: ({ row }) => num(row.original.wj_sqft), size: 100 },
        { accessorKey: 'gross_revenue', header: ({ column }) => <DataGridColumnHeader title="GROSS REVENUE" column={column} />, cell: ({ row }) => $(row.original.gross_revenue), size: 140 },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />, cell: ({ row }) => $(row.original.gross_profit), size: 130 },
        { accessorKey: 'total_labor_cost', header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />, cell: ({ row }) => $(row.original.total_labor_cost), size: 120 },
        { accessorKey: 'total_hours', header: ({ column }) => <DataGridColumnHeader title="TOTAL HOURS" column={column} />, cell: ({ row }) => num(row.original.total_hours), size: 110 },
        { accessorKey: 'labor_cost_per_sq_ft', header: ({ column }) => <DataGridColumnHeader title="LABOR $/SQFT" column={column} />, cell: ({ row }) => $(row.original.labor_cost_per_sq_ft), size: 120 },
        { accessorKey: 'gross_revenue_per_sqft_fabricated', header: ({ column }) => <DataGridColumnHeader title="REVENUE/SQFT" column={column} />, cell: ({ row }) => $(row.original.gross_revenue_per_sqft_fabricated), size: 140 },
        { accessorKey: 'shop_total_cost_per_sqft', header: ({ column }) => <DataGridColumnHeader title="TOTAL COST/SQFT" column={column} />, cell: ({ row }) => $(row.original.shop_total_cost_per_sqft), size: 140 },
    ], []);

    const table = useReactTable({
        columns,
        data: weeklyData,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    if (isLoading) return <div className="p-5">Loading fabrication cost report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Weekly Fabrication Labor Cost</h1>
                <div className="flex items-center gap-2">
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px] h-[34px] border-[#e2e4ed]"><SelectValue /></SelectTrigger>
                        <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                        <SelectTrigger className="w-[130px] h-[34px] border-[#e2e4ed]"><SelectValue /></SelectTrigger>
                        <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <SelectItem key={m} value={String(m)}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            <DataGrid table={table} recordCount={weeklyData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{monthName} {year} – Weekly Breakdown</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px] border-[#e2e4ed]" onClick={() => exportTableToCSV(table, `fabrication-cost-${year}-${month}`)}>Export CSV</Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[50vh] [&>[data-radix-scroll-area-viewport]]:pb-4 bg-white">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th key={header.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50" style={{ width: header.getSize() }}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody>
                                        {/* Totals row */}
                                        {totals && (
                                            <tr className="bg-[#f0f7e0] font-semibold border-b border-[#e2e4ed]">
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">MONTH TOTAL</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{totals.number_of_days}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.completed_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.cut_sqft_saw)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.wj_sqft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_profit)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.total_labor_cost)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{num(totals.total_hours)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.labor_cost_per_sq_ft)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.gross_revenue_per_sqft_fabricated)}</td>
                                                <td className="px-3 py-2 text-sm text-[#4b545d]">{$(totals.shop_total_cost_per_sqft)}</td>
                                            </tr>
                                        )}
                                        {/* Data rows */}
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0" style={{ width: cell.column.getSize() }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {weeklyData.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">No data available.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>
                    <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>
        </div>
    );
}