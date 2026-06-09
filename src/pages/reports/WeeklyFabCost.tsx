// pages/reports/WeeklyFabCost.tsx
import { useMemo, useState } from 'react';
import { flexRender } from '@tanstack/react-table';
import {
    ColumnDef,
    getCoreRowModel,
    getPaginationRowModel,
    PaginationState,
    useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetWeeklyFabricationLaborCostQuery } from '@/store/api/report';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

    const [year, setYear] = useState<number>(currentYear);
    const [month, setMonth] = useState<number>(currentMonth);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const { data, isLoading, isError } = useGetWeeklyFabricationLaborCostQuery({ year, month });

    const weeklyData = useMemo(() => {
        if (!data?.data) return [];
        return (data.data as any).monthly_report?.weekly_breakdown || [];
    }, [data]);

    const totals = useMemo(() => {
        if (!data?.data) return null;
        return (data.data as any).monthly_report?.totals || null;
    }, [data]);

    const columns = useMemo<ColumnDef<WeeklyData>[]>(() => [
        {
            accessorKey: 'week_ending',
            header: ({ column }) => <DataGridColumnHeader title="WEEK ENDING" column={column} />,
            cell: ({ row }) => format(new Date(row.original.week_ending), 'MMM dd, yyyy'),
            size: 140,
        },
        {
            accessorKey: 'number_of_days',
            header: ({ column }) => <DataGridColumnHeader title="DAYS" column={column} />,
            size: 70,
        },
        {
            accessorKey: 'completed_sqft',
            header: ({ column }) => <DataGridColumnHeader title="COMPLETED SQFT" column={column} />,
            cell: ({ row }) => num(row.original.completed_sqft),
            size: 120,
        },
        {
            accessorKey: 'cut_sqft_saw',
            header: ({ column }) => <DataGridColumnHeader title="CUT SQFT (SAW)" column={column} />,
            cell: ({ row }) => num(row.original.cut_sqft_saw),
            size: 120,
        },
        {
            accessorKey: 'wj_sqft',
            header: ({ column }) => <DataGridColumnHeader title="WJ SQFT" column={column} />,
            cell: ({ row }) => num(row.original.wj_sqft),
            size: 90,
        },
        {
            accessorKey: 'gross_revenue',
            header: ({ column }) => <DataGridColumnHeader title="GROSS REVENUE" column={column} />,
            cell: ({ row }) => $(row.original.gross_revenue),
            size: 130,
        },
        {
            accessorKey: 'gross_profit',
            header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />,
            cell: ({ row }) => $(row.original.gross_profit),
            size: 130,
        },
        {
            accessorKey: 'total_labor_cost',
            header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />,
            cell: ({ row }) => $(row.original.total_labor_cost),
            size: 110,
        },
        {
            accessorKey: 'total_hours',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL HOURS" column={column} />,
            cell: ({ row }) => num(row.original.total_hours),
            size: 100,
        },
        {
            accessorKey: 'labor_cost_per_sq_ft',
            header: ({ column }) => <DataGridColumnHeader title="LABOR $/SQFT" column={column} />,
            cell: ({ row }) => $(row.original.labor_cost_per_sq_ft),
            size: 110,
        },
        {
            accessorKey: 'gross_revenue_per_sqft_fabricated',
            header: ({ column }) => <DataGridColumnHeader title="REVENUE/SQFT" column={column} />,
            cell: ({ row }) => $(row.original.gross_revenue_per_sqft_fabricated),
            size: 120,
        },
        {
            accessorKey: 'shop_total_cost_per_sqft',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL COST/SQFT" column={column} />,
            cell: ({ row }) => $(row.original.shop_total_cost_per_sqft),
            size: 130,
        },
    ], []);

    // Build data with totals row only on first page
    const dataWithTotal = useMemo(() => {
        if (!totals) return weeklyData;
        if (pagination.pageIndex !== 0) return weeklyData;
        const totalRow: any = {
            week_ending: 'MONTH TOTAL',
            number_of_days: totals.number_of_days,
            completed_sqft: totals.completed_sqft,
            cut_sqft_saw: totals.cut_sqft_saw,
            wj_sqft: totals.wj_sqft,
            gross_revenue: totals.gross_revenue,
            gross_profit: totals.gross_profit,
            total_labor_cost: totals.total_labor_cost,
            total_hours: totals.total_hours,
            labor_cost_per_sq_ft: totals.labor_cost_per_sq_ft,
            gross_revenue_per_sqft_fabricated: totals.gross_revenue_per_sqft_fabricated,
            shop_total_cost_per_sqft: totals.shop_total_cost_per_sqft,
        };
        return [totalRow, ...weeklyData];
    }, [totals, weeklyData, pagination.pageIndex]);

    const table = useReactTable({
        columns,
        data: dataWithTotal,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            getRowAttributes: (row) => {
                if (row.original.week_ending === 'MONTH TOTAL') {
                    return { className: 'bg-[#f0f7e0] font-semibold [&>td]:border-0' };
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5">Loading fabrication cost report...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="p-5">
            <DataGrid
                table={table}
                recordCount={dataWithTotal.length}
                tableLayout={{
                    columnsPinnable: true,
                    columnsMovable: true,
                    columnsVisibility: true,
                    columnsResizable: true,
                    cellBorder: true,
                }}
            >
                <Card>
                    <CardHeader className="py-3.5 border-b flex flex-row items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            Weekly Fabrication Labor Cost – {monthName} {year}
                        </h2>
                        <CardToolbar>
                            <div className="flex items-center gap-2">
                                <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                                    <SelectTrigger className="w-[100px] h-[34px]">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026, 2027].map((y) => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                                    <SelectTrigger className="w-[130px] h-[34px]">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={String(m)}>
                                                {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={() => exportTableToCSV(table, 'weekly-fabrication-cost')}>
                                    Export CSV
                                </Button>
                            </div>
                        </CardToolbar>
                    </CardHeader>

                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 bg-gray-50 break-words whitespace-normal relative"
                                                        style={{ width: header.getSize(), minWidth: header.getSize(), maxWidth: header.getSize() }}
                                                    >
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                                        {table.getRowModel().rows.map((row) => {
                                            const isTotalRow = row.original.week_ending === 'MONTH TOTAL';
                                            return (
                                                <tr key={row.id} className={!isTotalRow ? 'border-b border-gray-200' : ''}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td
                                                            key={cell.id}
                                                            className={cn(
                                                                'px-2 py-1 text-xs text-gray-700 break-words whitespace-normal',
                                                                !isTotalRow && 'border-r border-gray-200'
                                                            )}
                                                            style={{ width: cell.column.getSize() }}
                                                        >
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                        {weeklyData.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                    No data available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>

                    <CardFooter>
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>
        </div>
    );
}