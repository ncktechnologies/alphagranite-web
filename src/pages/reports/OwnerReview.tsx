// pages/reports/OwnerOverview.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { useGetOwnerOverviewQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { formatStage } from './OwnerOverview';

interface StageRow {
    stage: string;
    count: number;
}

export function OwnerOverviewReport() {
    const { data, isLoading } = useGetOwnerOverviewQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const kpis = useMemo(() => data?.data?.kpis ?? null, [data]);
    const stageData: StageRow[] = useMemo(() => data?.data?.stage_breakdown ?? [], [data]);

    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 250,
        },
        {
            accessorKey: 'count',
            header: ({ column }) => <DataGridColumnHeader title="COUNT" column={column} />,
            size: 100,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: stageData,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading owner overview...</div>;

    const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    return (
        <div className="flex flex-col gap-5 p-5">
            <h1 className="text-2xl font-semibold text-[#4b545d]">Owner Overview</h1>

            {/* KPI Widgets */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Jobs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.total_jobs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.total_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Active Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.active_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Pending Installs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.pending_installs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Completed Installs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.completed_installs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Completion Rate</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.completion_rate_percent}%</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Revenue</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{formatCurrency(kpis.total_revenue)}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Gross Margin</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpis.gross_margin_percent}%</div>
                    </Card>
                </div>
            )}

            {/* Stage Breakdown Table */}
            <DataGrid table={table} recordCount={stageData.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Stage Breakdown</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, 'owner-overview')}>Export CSV</Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4 ">
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
                                    {table.getRowModel().rows.map(row => (
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
                            <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
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