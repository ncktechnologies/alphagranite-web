// pages/reports/RedoAnalysis.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { useGetRedoAnalysisQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { formatStage } from './OwnerOverview';
import { getJobNumberLink, renderLink } from '@/lib/reportLinks';

interface RedoStageRow {
    stage: string;
    redo_count: number;
}

interface AccountRow {
    account_name: string;
    redo_count: number;
    redo_revenue: number;
}

interface JobRow {
    job_number: string;
    job_name: string;
    redo_count: number;
}

export function RedoAnalysisReport() {
    const { data, isLoading } = useGetRedoAnalysisQuery();
    const [stagePagination, setStagePagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [accountPagination, setAccountPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [jobPagination, setJobPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const summary = useMemo(() => data?.data?.summary ?? null, [data]);
    const redoByStage: RedoStageRow[] = useMemo(() => data?.data?.redo_by_stage ?? [], [data]);
    const topAccounts: AccountRow[] = useMemo(() => data?.data?.top_accounts_with_redo ?? [], [data]);
    const topJobs: JobRow[] = useMemo(() => data?.data?.top_jobs_with_redo ?? [], [data]);

    const stageColumns = useMemo<ColumnDef<RedoStageRow>[]>(() => [
        {
            accessorKey: 'stage',
            header: ({ column }) => <DataGridColumnHeader title="STAGE" column={column} />,
            cell: ({ row }) => <span className="text-sm font-medium">{formatStage(row.original.stage)}</span>,
            size: 250,
        },
        { accessorKey: 'redo_count', header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />, size: 120 },
    ], []);

    const accountColumns = useMemo<ColumnDef<AccountRow>[]>(() => [
        { accessorKey: 'account_name', header: ({ column }) => <DataGridColumnHeader title="ACCOUNT" column={column} />, size: 250 },
        { accessorKey: 'redo_count', header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />, size: 120 },
        { accessorKey: 'redo_revenue', header: ({ column }) => <DataGridColumnHeader title="REDO REVENUE" column={column} />, cell: ({ row }) => `$${row.original.redo_revenue.toFixed(2)}`, size: 150 },
    ], []);

    const jobColumns = useMemo<ColumnDef<JobRow>[]>(() => [
        {
            accessorKey: 'job_number',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => {
                const jobNumber = row.original.job_number;
                const link = getJobNumberLink(jobNumber);
                return renderLink(link);
            },
            size: 100,
        },
        { accessorKey: 'job_name', header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />, size: 250 },
        { accessorKey: 'redo_count', header: ({ column }) => <DataGridColumnHeader title="REDO COUNT" column={column} />, size: 120 },
    ], []);

    const stageTable = useReactTable({ columns: stageColumns, data: redoByStage, state: { pagination: stagePagination }, onPaginationChange: setStagePagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
    const accountTable = useReactTable({ columns: accountColumns, data: topAccounts, state: { pagination: accountPagination }, onPaginationChange: setAccountPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });
    const jobTable = useReactTable({ columns: jobColumns, data: topJobs, state: { pagination: jobPagination }, onPaginationChange: setJobPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading redo analysis...</div>;

    // Helper to render a table inside a card
    const renderTable = (table: any, title: string, exportName: string) => (
        <DataGrid table={table} recordCount={table.getCoreRowModel().rows.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                    <p className="text-base font-semibold text-[#4b545d]">{title}</p>
                    <CardToolbar>
                        <Button variant="outline" size="sm" className="h-[34px]" onClick={() => exportTableToCSV(table, exportName)}>Export CSV</Button>
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
    );

    return (
        <div className="flex flex-col gap-5 p-5">
            <h1 className="text-2xl font-semibold text-[#4b545d]">Redo Analysis</h1>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Total Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Revised Fabs</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.revised_fabs}</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Redo Rate</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.redo_rate_percent}%</div>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <div className="text-sm text-[#7c8689] uppercase tracking-wider">Revision Events</div>
                        <div className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.revision_events}</div>
                    </Card>
                </div>
            )}

            {/* Three Tables */}
            <div className="space-y-6">
                {renderTable(stageTable, 'Redo by Stage', 'redo-by-stage')}
                {renderTable(accountTable, 'Top Accounts with Redo', 'top-accounts-redo')}
                {renderTable(jobTable, 'Top Jobs with Redo', 'top-jobs-redo')}
            </div>
        </div>
    );
}