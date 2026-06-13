// pages/reports/InstallPerformance.tsx
import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { useGetInstallPerformanceQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { ReportTableShell } from './component/ReportTableShell';
import { Card } from '@/components/ui/card';

const fmtDate = (s: string | null) => {
    if (!s) return '-';
    try { const d = parseISO(s); return isValid(d) ? format(d, 'MMM dd, yyyy') : '-'; } catch { return '-'; }
};

interface InstallerRow {
    installer_id: number;
    installer_name: string;
    completed_installs: number;
    sqft_installed: number;
    work_hours: number;
    pause_hours: number;
    sqft_per_hour: number;
    hourly_rate: number;
    labor_cost: number;
    labor_cost_per_sqft: number;
    first_completion_at: string | null;
    last_completion_at: string | null;
}

export function InstallPerformance() {
    const { data, isLoading, isError, isFetching } = useGetInstallPerformanceQuery();
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const tableData: InstallerRow[] = useMemo(() => data?.data?.installer_breakdown ?? [], [data]);

    const columns = useMemo<ColumnDef<InstallerRow>[]>(() => [
        {
            accessorKey: 'installer_name',
            header: ({ column }) => <DataGridColumnHeader title="INSTALLER" column={column} />,
            cell: ({ row }) => <span className="font-medium text-sm">{row.original.installer_name}</span>,
            size: 200,
        },
        {
            accessorKey: 'completed_installs',
            header: ({ column }) => <DataGridColumnHeader title="COMPLETED" column={column} />,
            cell: ({ row }) => (
                <span className="inline-flex items-center justify-center rounded-full bg-[#eef0f6] text-[#4b545d] text-sm font-semibold px-3 py-0.5">
                    {row.original.completed_installs}
                </span>
            ),
            size: 120,
        },
        {
            accessorKey: 'sqft_installed',
            header: ({ column }) => <DataGridColumnHeader title="SQFT INSTALLED" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sqft_installed.toFixed(1)}</span>,
            size: 130,
        },
        {
            accessorKey: 'work_hours',
            header: ({ column }) => <DataGridColumnHeader title="WORK HRS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.work_hours.toFixed(2)}</span>,
            size: 110,
        },
        {
            accessorKey: 'pause_hours',
            header: ({ column }) => <DataGridColumnHeader title="PAUSE HRS" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.pause_hours.toFixed(2)}</span>,
            size: 110,
        },
        {
            accessorKey: 'sqft_per_hour',
            header: ({ column }) => <DataGridColumnHeader title="SQFT/HR" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sqft_per_hour.toFixed(2)}</span>,
            size: 100,
        },
        {
            accessorKey: 'labor_cost',
            header: ({ column }) => <DataGridColumnHeader title="LABOR COST" column={column} />,
            cell: ({ row }) => <span className="text-sm">${row.original.labor_cost.toFixed(2)}</span>,
            size: 120,
        },
        {
            accessorKey: 'labor_cost_per_sqft',
            header: ({ column }) => <DataGridColumnHeader title="COST/SQFT" column={column} />,
            cell: ({ row }) => <span className="text-sm">${row.original.labor_cost_per_sqft.toFixed(2)}</span>,
            size: 110,
        },
        {
            accessorKey: 'first_completion_at',
            header: ({ column }) => <DataGridColumnHeader title="FIRST COMPLETION" column={column} />,
            cell: ({ row }) => <span className="text-sm text-[#7c8689]">{fmtDate(row.original.first_completion_at)}</span>,
            size: 150,
        },
        {
            accessorKey: 'last_completion_at',
            header: ({ column }) => <DataGridColumnHeader title="LAST COMPLETION" column={column} />,
            cell: ({ row }) => <span className="text-sm text-[#7c8689]">{fmtDate(row.original.last_completion_at)}</span>,
            size: 150,
        },
    ], []);

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Install Performance</h1>
                {isFetching && <span className="text-sm text-[#7c8689] animate-pulse">Updating...</span>}
            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Installer Count', value: summary.installer_count },
                        { label: 'Total SQFT Installed', value: summary.total_sqft_installed.toFixed(1) },
                        { label: 'Total Work Hours', value: summary.total_work_hours.toFixed(2) },
                        { label: 'Total Labor Cost', value: `$${summary.total_labor_cost.toFixed(2)}` },
                        { label: 'Labor Cost/SQFT', value: `$${summary.portfolio_labor_cost_per_sqft.toFixed(2)}` },
                        { label: 'SQFT/Hour', value: summary.portfolio_sqft_per_hour.toFixed(2) },
                    ].map(kpi => (
                        <Card key={kpi.label} className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                            <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider leading-tight">{kpi.label}</p>
                            <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{kpi.value}</p>
                        </Card>
                    ))}
                </div>
            )}

            <ReportTableShell
                title="Installer Breakdown"
                data={tableData}
                columns={columns as any}
                isLoading={isLoading}
                isError={isError}
                searchPlaceholder="Search installer..."
                exportFilename="install-performance"
            />
        </div>
    );
}
