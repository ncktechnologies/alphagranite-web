// pages/reports/MonthlyInstallCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetMonthlyInstallCompletionQuery } from '@/store/api/report';
import { useGetFabTypesQuery } from '@/store/api/job';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { UpdateMonthlyInstallModal } from './component/MonthlyInstallModal';
import { getFabIdLink, getJobNameLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';

const fabTypeColorMap: Record<string, string> = {
    standard: '#9eeb47',
    'fab only': '#5bd1d7',
    'cust redo': '#f0bf4c',
    resurface: '#d094ea',
    'fast track': '#f59794',
    'ag redo': '#f5cc94',
};

const getFabColor = (fabType: string | undefined): string => {
    if (!fabType) return 'transparent';
    return fabTypeColorMap[fabType.toLowerCase()] || 'transparent';
};

export function MonthlyInstallCompletionReport() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');

    // Fetch fab types for dropdown
    const { data: fabTypesData } = useGetFabTypesQuery();
    const fabTypes = useMemo(() => {
        if (!fabTypesData) return [];
        let rawData: any[] = [];
        if (Array.isArray(fabTypesData)) rawData = fabTypesData;
        else if (typeof fabTypesData === 'object' && 'data' in fabTypesData) rawData = (fabTypesData as any).data || [];
        const extractName = (item: { name: string } | string) =>
            typeof item === 'string' ? item : (typeof item === 'object' && item !== null ? item.name || String(item) : String(item));
        return rawData.map(extractName).sort();
    }, [fabTypesData]);

    // Build query params including fab_type if selected
    const queryParams = useMemo(() => {
        const params: { year: number; month: number; fab_type?: string } = { year, month };
        if (fabTypeFilter && fabTypeFilter !== 'all') {
            params.fab_type = fabTypeFilter;
        }
        return params;
    }, [year, month, fabTypeFilter]);

    const { data, isLoading, refetch } = useGetMonthlyInstallCompletionQuery(queryParams);
    const rows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        const keys = Object.keys(first);

        const compositeFabFields = [
            'acct_name', 'account_name', 'job_name', 'input_area',
            'stone_type_name', 'stone_color_name', 'stone_thickness_value', 'edge_name'
        ];
        const dataCols = keys
            .filter(key => !compositeFabFields.includes(key))
            .map(key => {
                let headerTitle = key.replace(/_/g, ' ').toUpperCase();
                if (key === 'pieces' || key === 'no_of_pieces') headerTitle = 'NO OF PIECES';
                return {
                    accessorKey: key,
                    header: ({ column }) => <DataGridColumnHeader title={headerTitle} column={column} />,
                    size: key === 'job_name' || key === 'fab_info' ? 250 : 130,
                    cell: ({ row }) => {
                        let val = row.original[key];
                        if (key.includes('date') && val) val = format(new Date(val), 'MMM dd, yyyy');
                        if (typeof val === 'number') val = val.toLocaleString();
                        if (val == null) return <span className="text-sm">-</span>;

                        if (key === 'fab_id') {
                            const link = getFabIdLink(Number(val));
                            return renderLink(link);
                        }
                        if (key === 'job_number') {
                            const link = getJobNumberLink(String(val));
                            return renderLink(link);
                        }
                        if (key === 'job_name') {
                            const jobId = row.original.job_id;
                            if (jobId) {
                                const link = getJobNameLink(String(val), jobId);
                                if (link) return renderLink(link);
                            }
                            return <span className="text-sm">{val}</span>;
                        }
                        return <span className="text-sm">{val}</span>;
                    },
                };
            });

        const fabInfoCol: ColumnDef<any> = {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => <FabInfoCell data={row.original} />,
            size: 400,
        };
  const actionCol: ColumnDef<any> = {
            id: 'actions',
            header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setSelectedRow(row.original);
                        setUpdateModalOpen(true);
                    }}
                >
                    Edit
                </Button>
            ),
            size: 80,
        };
        const jobNumberIndex = dataCols.findIndex(col => col.accessorKey === 'job_number');
        const insertIndex = jobNumberIndex !== -1 ? jobNumberIndex + 1 : 1;
        const finalCols = [actionCol];
        finalCols.push(...dataCols.slice(0, insertIndex));
        finalCols.push(fabInfoCol);
        finalCols.push(...dataCols.slice(insertIndex));
        return finalCols;
    }, [rows]);

    const table = useReactTable({
        columns,
        data: rows,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            getRowAttributes: (row) => {
                if (row.original.fab_type) {
                    const bgColor = getFabColor(row.original.fab_type);
                    if (bgColor !== 'transparent') {
                        return { style: { backgroundColor: bgColor } };
                    }
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading monthly install completion report...</div>;

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Monthly Install Completion</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Fab Type Filter Dropdown */}
                    <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                        <SelectTrigger className="w-[150px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Fab Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {fabTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[100px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[2024, 2025, 2026, 2027].map(y => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                        <SelectTrigger className="w-[130px] h-[34px] border-[#e2e4ed]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <SelectItem key={m} value={String(m)}>
                                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Widgets */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Pieces</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.pieces.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQ FT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sq_ft.toFixed(2)}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </Card>
                    <Card className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Revenue / SQFT</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">${summary.revenue_per_sq_ft?.toFixed(2) ?? '0.00'}</p>
                    </Card>
                </div>
            )}

            {/* Data Table */}
            <DataGrid table={table} recordCount={rows.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-[#e2e4ed] flex flex-row items-center justify-between bg-white">
                        <p className="text-base font-semibold text-[#4b545d]">{monthName} {year} – Install Details</p>
                        <CardToolbar>
                            <Button variant="outline" size="sm" className="h-[34px] border-[#e2e4ed]" onClick={() => exportTableToCSV(table, `monthly-install-${year}-${month}`)}>
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-300px)] bg-white">
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
                                        {table.getRowModel().rows.map(row => {
                                            const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                            return (
                                                <tr key={row.id} className="border-b border-[#e2e4ed] hover:bg-gray-50/50" {...rowAttrs}>
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
                                            );
                                        })}
                                        {rows.length === 0 && (
                                            <tr>
                                                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[#7c8689]">
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
                    <CardFooter className="bg-white border-t border-[#e2e4ed] px-4 py-2">
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>

            {/* Edit Modal */}
            <UpdateMonthlyInstallModal
                open={updateModalOpen}
                onClose={() => {
                    setUpdateModalOpen(false);
                    setSelectedRow(null);
                }}
                fabId={selectedRow?.fab_id ?? 0}
                initialData={selectedRow ? {
                    revenue: selectedRow.revenue,
                    sq_ft: selectedRow.sq_ft,
                    revenue_per_sq_ft: selectedRow.revenue_per_sq_ft,
                    installer_name: selectedRow.installer_name,
                } : undefined}
                onUpdateSuccess={() => {
                    refetch();
                }}
            />
        </div>
    );
}