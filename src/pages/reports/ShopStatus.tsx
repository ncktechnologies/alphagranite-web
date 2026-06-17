// pages/reports/ShopStatus.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetShopStatusReportQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

interface StageRow {
    stage: string;
    fab_count: number;
    avg_age_days: number;
    max_age_days: number;
    stalled_over_14_days: number;
}

export function ShopStatusReport() {
    const { data, isLoading } = useGetShopStatusReportQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const stageData: StageRow[] = useMemo(() => data?.data?.stage_status ?? [], [data]);
    const period = useMemo(() => data?.data?.period ?? null, [data]);

    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        { accessorKey: 'stage', header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />, size: 200 },
        { accessorKey: 'fab_count', header: ({ column }) => <DataGridColumnHeader title="FAB COUNT" column={column} />, size: 100 },
        { accessorKey: 'avg_age_days', header: ({ column }) => <DataGridColumnHeader title="AVG AGE (DAYS)" column={column} />, cell: ({ row }) => row.original.avg_age_days.toFixed(1), size: 120 },
        { accessorKey: 'max_age_days', header: ({ column }) => <DataGridColumnHeader title="MAX AGE (DAYS)" column={column} />, cell: ({ row }) => row.original.max_age_days.toFixed(1), size: 120 },
        { accessorKey: 'stalled_over_14_days', header: ({ column }) => <DataGridColumnHeader title="STALLED >14 DAYS" column={column} />, size: 130 },
    ], []);

    const table = useReactTable({
        columns, data: stageData, state: { pagination }, onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(),
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading shop status report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#4b545d]">AG Completion Report</h1>
            </div>

            {period && period.start_date && period.end_date && (
                <div className="text-sm text-[#7c8689]">
                    Period: {format(new Date(period.start_date), 'MMM dd, yyyy')} – {format(new Date(period.end_date), 'MMM dd, yyyy')}
                </div>
            )}

            <DataGrid table={table} recordCount={stageData.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Stage Breakdown</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" onClick={() => exportTableToCSV(table, 'shop-status')}>Export CSV</Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] bg-white">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-10 bg-white">
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.map(h => (
                                                <th key={h.id} className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50" style={{ width: h.getSize() }}>
                                                    {flexRender(h.column.columnDef.header, h.getContext())}
                                                </th>
                                            ))}
                                        </tr> 
                                        
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                            {row.getVisibleCells().map(cell => (
                                                <td key={cell.id} className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>
                    <CardFooter><DataGridPagination /></CardFooter>
                </Card>
            </DataGrid>
        </div>
    );
}