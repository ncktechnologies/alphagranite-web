// pages/reports/InstallerRates.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGetInstallerRatesQuery } from '@/store/api/report';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

interface InstallerRateRow {
    installer_id: number;
    installer_name: string;
    hourly_rate: number;
    effective_from: string;
    effective_to: string | null;
    is_active: boolean;
}

const formatHeader = (label: string) => (
    <div className="text-xs font-semibold text-[#7c8689] uppercase tracking-wider">{label}</div>
);

function SimplePagination({ table }: { table: any }) {
    const { pageIndex } = table.getState().pagination;
    const pageCount = table.getPageCount();
    if (pageCount <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-2 border-t">
            <div className="text-sm text-[#7c8689]">Page {pageIndex + 1} of {pageCount}</div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export function InstallerRatesReport() {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [installerFilter, setInstallerFilter] = useState<string>('all');

    const { data, isLoading } = useGetInstallerRatesQuery({ installer_id: installerFilter !== 'all' ? Number(installerFilter) : undefined });
    const rows: InstallerRateRow[] = useMemo(() => data?.data ?? [], [data]);

    const uniqueInstallers = useMemo(() => {
        const names = rows.map(r => ({ id: r.installer_id, name: r.installer_name }));
        return Array.from(new Map(names.map(n => [n.id, n])).values());
    }, [rows]);

    const columns = useMemo<ColumnDef<InstallerRateRow>[]>(() => [
        { accessorKey: 'installer_name', header: () => formatHeader('INSTALLER'), size: 180 },
        { accessorKey: 'hourly_rate', header: () => formatHeader('HOURLY RATE'), size: 120, cell: ({ row }) => `$${row.original.hourly_rate.toFixed(2)}` },
        { accessorKey: 'effective_from', header: () => formatHeader('EFFECTIVE FROM'), size: 130, cell: ({ row }) => format(new Date(row.original.effective_from), 'MMM dd, yyyy') },
        { accessorKey: 'effective_to', header: () => formatHeader('EFFECTIVE TO'), size: 130, cell: ({ row }) => row.original.effective_to ? format(new Date(row.original.effective_to), 'MMM dd, yyyy') : 'Current' },
        { accessorKey: 'is_active', header: () => formatHeader('ACTIVE'), size: 80, cell: ({ row }) => row.original.is_active ? 'Yes' : 'No' },
    ], []);

    const table = useReactTable({
        columns,
        data: rows,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (isLoading) return <div className="p-5">Loading installer rates...</div>;

    const hasData = rows.length > 0;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Installer Rates</h1>
                <div className="flex items-center gap-2">
                    <Select value={installerFilter} onValueChange={setInstallerFilter}>
                        <SelectTrigger className="w-[180px] h-[34px]">
                            <SelectValue placeholder="Filter by Installer" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Installers</SelectItem>
                            {uniqueInstallers.map(inst => (
                                <SelectItem key={inst.id} value={String(inst.id)}>{inst.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'installer-rates')}>Export CSV</Button>
                </div>
            </div>

            <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
                <CardHeader className="py-3 px-5 border-b bg-white" />
                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] bg-white">
                        {hasData ? (
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
                        ) : (
                            <div className="p-8 text-center text-[#7c8689]">No data available</div>
                        )}
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardTable>
                {hasData && (
                    <CardFooter className="bg-white border-t px-0 py-0">
                        <SimplePagination table={table} />
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}