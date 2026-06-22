// pages/reports/OwnerOverview.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { useGetOwnerOverviewQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { BackButton } from '@/components/common/BackButton';

// ─── Stage order (matches DASHBOARD_WIDGETS) ─────────────────────────────
const STAGE_ORDER = [
    'templating',
    'pre_draft_review',
    'resurface_scheduling',
    'drafting',
    'slab_smith_request',
    'sales_ct',
    'revision',
    'cut_list',
    'final_programming',
    'install_scheduling',
    'install_completion',
    'cnc',
];

// ─── Normalize stage name for matching ────────────────────────────────────
const normalizeStage = (stage: string): string => {
    return stage.toLowerCase().replace(/[\s-]+/g, '_').trim();
};

export const formatStage = (s: string) =>
    s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface KpiItem { label: string; value: string | number; }
interface StageRow { stage: string; count: number; }

export function OwnerOverview() {
    const { data, isLoading, isError, isFetching } = useGetOwnerOverviewQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);

    const kpis: KpiItem[] = useMemo(() => {
        const k = data?.data?.kpis;
        if (!k) return [];
        return [
            { label: 'Total Jobs', value: k.total_jobs ?? '-' },
            { label: 'Total Fabs', value: k.total_fabs ?? '-' },
            { label: 'Active Fabs', value: k.active_fabs ?? '-' },
            { label: 'Pending Installs', value: k.pending_installs ?? '-' },
            { label: 'Completed Installs', value: k.completed_installs ?? '-' },
            { label: 'Completion Rate', value: k.completion_rate_percent != null ? `${k.completion_rate_percent.toFixed(1)}%` : '-' },
            { label: 'Total Revenue', value: k.total_revenue != null ? `$${k.total_revenue.toLocaleString()}` : '-' },
            { label: 'Gross Profit', value: k.gross_profit != null ? `$${k.gross_profit.toLocaleString()}` : '-' },
            { label: 'Gross Margin', value: k.gross_margin_percent != null ? `${k.gross_margin_percent.toFixed(2)}%` : '-' },
        ];
    }, [data]);

    const rawData: StageRow[] = useMemo(() => data?.data?.stage_breakdown ?? [], [data]);

    // ─── Sort stages by defined order ─────────────────────────────────────
    const tableData = useMemo(() => {
        if (!rawData || !rawData.length) return [];
        return [...rawData].sort((a, b) => {
            const normA = normalizeStage(a.stage);
            const normB = normalizeStage(b.stage);
            const indexA = STAGE_ORDER.indexOf(normA);
            const indexB = STAGE_ORDER.indexOf(normB);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [rawData]);

    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 260,
            enableSorting: true,
        },
        {
            accessorKey: 'count',
            header: ({ column }) => <DataGridColumnHeader title="COUNT" column={column} />,
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-center rounded-full bg-[#eef0f6] text-[#4b545d] text-sm font-semibold px-3 py-0.5 min-w-[36px]">
                    {row.original.count}
                </span>
            ),
            size: 120,
            enableSorting: true,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: tableData,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading owner overview...</div>;
    if (isError) return <div className="p-5 text-red-500">Error loading report.</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3 justify-between">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Owner Overview</h1>
                <BackButton/>
            </div>
            <div>
                {isFetching && <span className="text-sm text-[#7c8689] animate-pulse">Updating...</span>}
            </div>

            {/* KPI Widgets */}
            {kpis.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {kpis.map((kpi) => (
                        <Card key={kpi.label} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider leading-tight">{kpi.label}</p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpi.value}</p>
                        </Card>
                    ))}
                </div>
            )}

            {/* Stage Breakdown Table */}
            <DataGrid table={table} recordCount={tableData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">Stage Breakdown</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, 'owner-overview-stage-breakdown')}>
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-80px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <div className="relative">
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        {table.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50"
                                                        style={{ width: header.getSize() }}
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                                        {table.getRowModel().rows.map(row => (
                                            <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50">
                                                {row.getVisibleCells().map(cell => (
                                                    <td
                                                        key={cell.id}
                                                        className="px-3 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                        style={{ width: cell.column.getSize() }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {tableData.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
                                                    No data available.
                                                </td>
                                            </tr>
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
        </div>
    );
}