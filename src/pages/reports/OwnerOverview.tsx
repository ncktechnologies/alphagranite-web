// pages/reports/OwnerOverview.tsx
import { useMemo } from 'react';
import { ColumnDef, getCoreRowModel, useReactTable, getPaginationRowModel, PaginationState } from '@tanstack/react-table';
import { useState } from 'react';
import { useGetOwnerOverviewQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { ReportTableShell } from './component/ReportTableShell';
import { Card } from '@/components/ui/card';

export const formatStage = (s: string) =>
    s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface KpiItem { label: string; value: string | number; }
interface StageRow { stage: string; count: number; }

export function OwnerOverview() {
    const { data, isLoading, isError, isFetching } = useGetOwnerOverviewQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

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

    const tableData: StageRow[] = useMemo(() => data?.data?.stage_breakdown ?? [], [data]);

    const columns = useMemo<ColumnDef<StageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 260,
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
        },
    ], []);

    const table = useReactTable({
        columns,
        data: tableData,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Owner Overview</h1>
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
            <ReportTableShell
                title="Stage Breakdown"
                data={tableData}
                columns={columns as any}
                isLoading={isLoading}
                isError={isError}
                exportFilename="owner-overview-stage-breakdown"
            />
        </div>
    );
}
