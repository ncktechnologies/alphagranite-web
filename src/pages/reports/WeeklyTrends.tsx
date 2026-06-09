// pages/reports/WeeklyTrends.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetWeeklyTrendsQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

interface TrendRow {
    week_start: string;
    fabs_created: number;
    installs_completed: number;
    revenue: number;
    gross_profit: number;
    sqft_installed: number;
}

export function WeeklyTrendsReport() {
    const { data, isLoading } = useGetWeeklyTrendsQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const trends: TrendRow[] = useMemo(() => data?.data?.weekly_trends ?? [], [data]);

    const columns = useMemo<ColumnDef<TrendRow>[]>(() => [
        { accessorKey: 'week_start', header: ({ column }) => <DataGridColumnHeader title="WEEK STARTING" column={column} />, cell: ({ row }) => format(new Date(row.original.week_start), 'MMM dd, yyyy'), size: 140 },
        { accessorKey: 'fabs_created', header: ({ column }) => <DataGridColumnHeader title="FABS CREATED" column={column} />, size: 120 },
        { accessorKey: 'installs_completed', header: ({ column }) => <DataGridColumnHeader title="INSTALLS COMPLETED" column={column} />, size: 150 },
        { accessorKey: 'revenue', header: ({ column }) => <DataGridColumnHeader title="REVENUE" column={column} />, cell: ({ row }) => `$${row.original.revenue.toFixed(2)}`, size: 130 },
        { accessorKey: 'gross_profit', header: ({ column }) => <DataGridColumnHeader title="GROSS PROFIT" column={column} />, cell: ({ row }) => `$${row.original.gross_profit.toFixed(2)}`, size: 130 },
        { accessorKey: 'sqft_installed', header: ({ column }) => <DataGridColumnHeader title="SQFT INSTALLED" column={column} />, cell: ({ row }) => row.original.sqft_installed.toFixed(0), size: 130 },
    ], []);

    const table = useReactTable({ columns, data: trends, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    if (isLoading) return <div className="p-5">Loading weekly trends...</div>;

    return (
        <div className="p-5">
            <h1 className="text-2xl font-semibold mb-4">Weekly Trends</h1>
            <DataGrid table={table} recordCount={trends.length} tableLayout={{ cellBorder: true, columnsResizable: true }}>
                <Card>
                    <CardHeader className="py-3 px-5 border-b flex justify-between"><span className="font-semibold">Last {data?.data?.weeks ?? 12} Weeks</span><CardToolbar><Button variant="outline" onClick={() => exportTableToCSV(table, 'weekly-trends')}>Export CSV</Button></CardToolbar></CardHeader>
                    <CardTable><ScrollArea className="h-[calc(100vh-200px)]"><table className="w-full border-collapse"><thead>{table.getHeaderGroups().map(hg => <tr key={hg.id}>{hg.headers.map(h => <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold border-b bg-gray-50">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(row => <tr key={row.id} className="border-b">{row.getVisibleCells().map(cell => <td key={cell.id} className="px-3 py-2 text-sm border-r last:border-r-0">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table><ScrollBar orientation="horizontal" /></ScrollArea></CardTable>
                    <CardFooter><DataGridPagination /></CardFooter>
                </Card>
            </DataGrid>
        </div>
    );
}