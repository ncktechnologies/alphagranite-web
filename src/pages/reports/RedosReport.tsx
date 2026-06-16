// pages/reports/RedosReport.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetReportRedosQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { UpdateRedoModal } from './component/RedoModal';
import { getFabIdLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';

interface RedoItem {
    fab_id: number;
    fab_created_date: string;
    fab_type: string;
    job_number: string;
    fab_info: string;
    sqft: number;
    total_cost: number | null;
    reason: string | null;
    person_name: string | null;
    department: string | null;
    no_of_pieces: number | null;
    department_options?: string[];
}

// Fab type color map (exactly as in original ReportRenderer)
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

// Parse fab_info into left (first 6 items in two lines) and right (rest)
const parseFabInfo = (info: string) => {
    if (!info) return { leftLine1: [], leftLine2: [], right: [] };
    const parts = info.split(' - ').filter(p => p.trim());
    return {
        leftLine1: parts.slice(0, 3),
        leftLine2: parts.slice(3, 6),
        right: parts.slice(6),
    };
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
        return dateStr;
    }
};

export function RedosReport() {
    const { data, isLoading } = useGetReportRedosQuery();
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const rawData: RedoItem[] = useMemo(() => data?.data ?? [], [data]);

    // Compute totals for the totals row (only numeric fields)
    const totals = useMemo(() => {
        if (!rawData.length) return null;
        return {
            fab_type: 'TOTAL',
            sqft: rawData.reduce((sum, r) => sum + r.sqft, 0),
            total_cost: rawData.reduce((sum, r) => sum + (r.total_cost || 0), 0),
        };
    }, [rawData]);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const columns = useMemo<ColumnDef<RedoItem>[]>(() => [
        {
            id: 'action',
            header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
            cell: ({ row }) => {
                // Do not show edit button on totals row
                if (row.original._isTotalRow) return null;
                return (
                    <Button size="sm" onClick={() => { setSelectedRow(row.original); setUpdateModalOpen(true); }}>
                        Edit
                    </Button>
                );
            },
            size: 80,
        },
        {
            accessorKey: 'fab_created_date',
            header: ({ column }) => <DataGridColumnHeader title="CREATED DATE" column={column} />,
            cell: ({ row }) => formatDate(row.original.fab_created_date),
            size: 110,
        },
        {
            accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="uppercase text-sm">{row.original.fab_type}</span>,
            size: 120,
        },
        {
            accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => {
                const fabId = row.original.fab_id;
                const link = getFabIdLink(fabId);
                return renderLink(link);
            },
            size: 80,
        },
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
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const hasFields = row.original.account_name || row.original.job_name || row.original.input_area || row.original.stone_type_name;
                if (hasFields) {
                    return <FabInfoCell data={row.original} />;
                }
                const info = row.original.fab_info || '';
                return <span className="text-sm">{info}</span>;
            },
            size: 350,
        },
        {
            accessorKey: 'no_of_pieces',
            header: ({ column }) => <DataGridColumnHeader title="NO OF PIECES" column={column} />,
            cell: ({ row }) => row.original.no_of_pieces?.toString() ?? '-',
            size: 80,
        },
        {
            accessorKey: 'sqft',
            header: ({ column }) => <DataGridColumnHeader title="SQFT" column={column} />,
            cell: ({ row }) => row.original.sqft.toFixed(2),
            size: 80,
        },
        {
            accessorKey: 'cost_per_sqft',
            header: ({ column }) => <DataGridColumnHeader title="COST PER SQFT" column={column} />,
            cell: ({ row }) => row.original.cost_per_sqft !== null && row.original.cost_per_sqft !== undefined
                ? `$${row.original.cost_per_sqft.toFixed(2)}`
                : '-',
            size: 120,
        },
        {
            accessorKey: 'total_cost',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL COST" column={column} />,
            cell: ({ row }) => row.original.total_cost !== null ? `$${row.original.total_cost.toFixed(2)}` : '-',
            size: 110,
        },
        {
            accessorKey: 'department',
            header: ({ column }) => <DataGridColumnHeader title="DEPARTMENT" column={column} />,
            cell: ({ row }) => row.original.department || '-',
            size: 150,
        },
        {
            accessorKey: 'person_name',
            header: ({ column }) => <DataGridColumnHeader title="PERSON NAME" column={column} />,
            cell: ({ row }) => row.original.person_name || '-',
            size: 150,
        },
        
        {
            accessorKey: 'reason',
            header: ({ column }) => <DataGridColumnHeader title="REASON" column={column} />,
            cell: ({ row }) => row.original.reason || '-',
            size: 150,
        },

    ], []);

    // Build data with totals row at the top (only on first page)
    const dataWithTotal = useMemo(() => {
        if (!totals) return rawData;
        if (pagination.pageIndex !== 0) return rawData;
        const totalRow: any = {
            fab_created_date: 'TOTAL',
            sqft: totals.sqft,
            total_cost: totals.total_cost,
            fab_id: '',
            job_number: '',
            fab_info: '',
            fab_type: '',
            reason: '',
            _isTotalRow: true,
        };
        return [totalRow, ...rawData];
    }, [totals, rawData, pagination.pageIndex]);

    const table = useReactTable({
        columns,
        data: dataWithTotal,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            getRowAttributes: (row) => {
                // Totals row styling
                if (row.original._isTotalRow) {
                    return { className: 'bg-[#f0f7e0] font-semibold [&>td]:border-0' };
                }
                // Apply background color based on fab_type (original pattern)
                const fabType = row.original.fab_type?.toLowerCase();
                const bgColor = getFabColor(fabType);
                if (bgColor !== 'transparent') {
                    return { style: { backgroundColor: bgColor } };
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5">Loading redos report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Redos Report</h1>
                <Button variant="outline" onClick={() => exportTableToCSV(table, 'redos-report')}>Export CSV</Button>
            </div>

            <DataGrid table={table} recordCount={dataWithTotal.length} tableLayout={{ columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b bg-white" />
                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-10px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
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
                                            // Apply row attributes from meta (background color, etc.)
                                            const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                            return (
                                                <tr
                                                    key={row.id}
                                                    className="border-b border-[#e2e4ed] hover:bg-gray-50/50"
                                                    {...rowAttrs}
                                                >
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
                                    </tbody>
                                </table>
                            </div>

                            <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />

                        </ScrollArea>
                    </CardTable>
                    <CardFooter><DataGridPagination /></CardFooter>
                </Card>
            </DataGrid>
            {/* Update Modal */}
            <UpdateRedoModal
                open={updateModalOpen}
                onClose={() => {
                    setUpdateModalOpen(false);
                    setSelectedRow(null);
                }}
                fabId={selectedRow?.fab_id ?? 0}
                initialData={selectedRow ? {
                    no_of_pieces: selectedRow.no_of_pieces ?? undefined,
                    sqft: selectedRow.sqft,
                    cost_per_sqft: selectedRow.cost_per_sqft ?? undefined,
                    department: selectedRow.department ?? undefined,
                    person_name: selectedRow.person_name ?? undefined,
                    reason: selectedRow.reason ?? undefined,
                    department_options: selectedRow.department_options ?? [],
                } : undefined}
            // onUpdateSuccess={() => {
            //     // Refetch data if needed – the mutation invalidates tags, so it should auto-refetch
            // }}
            />
        </div>
    );
}