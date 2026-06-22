// pages/reports/RedosReport.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { useGetReportRedosQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { UpdateRedoModal } from './component/RedoModal';
import { getFabIdLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { FabInfoCell } from '@/components/common/fabInfo';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/common/BackButton';

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
    account_name?: string;
    job_name?: string;
    input_area?: string;
    stone_type_name?: string;
    stone_color_name?: string;
    stone_thickness_value?: string;
    edge_name?: string;
    cost_per_sqft?: number | null;
}

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

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
        return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
        return dateStr;
    }
};

export function RedosReport() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<RedoItem | null>(null);

    const queryParams = useMemo(() => {
        const params: { from_date?: string; to_date?: string } = {};
        if (dateRange?.from) {
            params.from_date = format(dateRange.from, 'yyyy-MM-dd');
            params.to_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        return Object.keys(params).length ? params : undefined;
    }, [dateRange]);

    const { data, isLoading } = useGetReportRedosQuery(queryParams);
    const rawData: RedoItem[] = useMemo(() => data?.data ?? [], [data]);

    const totals = useMemo(() => {
        if (!rawData.length) return null;
        return {
            sqft: rawData.reduce((sum, r) => sum + r.sqft, 0),
            total_cost: rawData.reduce((sum, r) => sum + (r.total_cost || 0), 0),
        };
    }, [rawData]);

    // Slice rawData for current page
    const slicedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        return rawData.slice(start, end);
    }, [rawData, pagination.pageIndex, pagination.pageSize]);

    // Prepend total row to slicedData
    const displayRows = useMemo(() => {
        if (!totals) return slicedData;
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
        return [totalRow, ...slicedData];
    }, [totals, slicedData]);

    const columns = useMemo<ColumnDef<RedoItem>[]>(() => [
        // {
        //     id: 'action',
        //     header: ({ column }) => <DataGridColumnHeader title="ACTION" column={column} />,
        //     cell: ({ row }) => {
        //         if (row.original._isTotalRow) return null;
        //         return (
        //             <Button size="sm" onClick={() => { setSelectedRow(row.original); setUpdateModalOpen(true); }}>
        //                 Edit
        //             </Button>
        //         );
        //     },
        //     size: 80,
        //     enableSorting: false,
        // },
        {
            accessorKey: 'fab_created_date',
            header: ({ column }) => <DataGridColumnHeader title="CREATED DATE" column={column} />,
            cell: ({ row }) => {
                const val = row.original.fab_created_date;
                if (val === 'TOTAL') return '—';
                return formatDate(val);
            },
            size: 110,
            enableSorting: true,
        },
        {
            accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="uppercase text-sm">{row.original.fab_type}</span>,
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => {
                const fabId = row.original.fab_id;
                if (!fabId) return <span className="text-sm">—</span>;
                const link = getFabIdLink(fabId);
                return renderLink(link);
            },
            size: 80,
            enableSorting: true,
        },
        {
            accessorKey: 'job_number',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => {
                const jobNumber = row.original.job_number;
                if (!jobNumber) return <span className="text-sm">—</span>;
                const link = getJobNumberLink(jobNumber);
                return renderLink(link);
            },
            size: 100,
            enableSorting: true,
        },
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                if (row.original._isTotalRow) return <span className="text-sm">—</span>;
                const hasFields = row.original.account_name || row.original.job_name || row.original.input_area || row.original.stone_type_name;
                if (hasFields) {
                    return <FabInfoCell data={row.original} />;
                }
                const info = row.original.fab_info || '';
                return <span className="text-sm">{info}</span>;
            },
            size: 350,
            enableSorting: false,
        },
        {
            accessorKey: 'no_of_pieces',
            header: ({ column }) => <DataGridColumnHeader title="NO OF PIECES" column={column} />,
            cell: ({ row }) => row.original.no_of_pieces?.toString() ?? '-',
            size: 80,
            enableSorting: true,
        },
        {
            accessorKey: 'sqft',
            header: ({ column }) => <DataGridColumnHeader title="SQFT" column={column} />,
            cell: ({ row }) => row.original.sqft.toFixed(2),
            size: 80,
            enableSorting: true,
        },
        {
            accessorKey: 'cost_per_sqft',
            header: ({ column }) => <DataGridColumnHeader title="COST PER SQFT" column={column} />,
            cell: ({ row }) => row.original.cost_per_sqft !== null && row.original.cost_per_sqft !== undefined
                ? `$${row.original.cost_per_sqft.toFixed(2)}`
                : '-',
            size: 120,
            enableSorting: true,
        },
        {
            accessorKey: 'total_cost',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL COST" column={column} />,
            cell: ({ row }) => row.original.total_cost !== null ? `$${row.original.total_cost.toFixed(2)}` : '-',
            size: 110,
            enableSorting: true,
        },
        {
            accessorKey: 'department',
            header: ({ column }) => <DataGridColumnHeader title="DEPARTMENT" column={column} />,
            cell: ({ row }) => row.original.department || '-',
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'person_name',
            header: ({ column }) => <DataGridColumnHeader title="PERSON NAME" column={column} />,
            cell: ({ row }) => row.original.person_name || '-',
            size: 150,
            enableSorting: true,
        },
        {
            accessorKey: 'reason',
            header: ({ column }) => <DataGridColumnHeader title="REASON" column={column} />,
            cell: ({ row }) => row.original.reason || '-',
            size: 150,
            enableSorting: true,
        },
    ], []);

    const table = useReactTable({
        columns,
        data: displayRows,
        getRowId: (row) => row.fab_id ? String(row.fab_id) : 'total',
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        pageCount: Math.ceil(rawData.length / pagination.pageSize),
        enableColumnResizing: true,
        columnResizeMode: 'onEnd',
        meta: {
            getRowAttributes: (row) => {
                if (row.original._isTotalRow) {
                    return { className: 'bg-[#f0f7e0] font-semibold [&>td]:border-0' };
                }
                const fabType = row.original.fab_type?.toLowerCase();
                const bgColor = getFabColor(fabType);
                if (bgColor !== 'transparent') {
                    return { style: { backgroundColor: bgColor } };
                }
                return {};
            },
        },
    });

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading redos report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Redos Report</h1>
                <div className="flex items-center gap-2 flex-wrap">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[260px] justify-start text-left font-normal h-[34px]', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date Range'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="range" month={month} onMonthChange={setMonth} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); setIsDatePickerOpen(false); }}>Reset</Button>
                                <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    {dateRange && <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>Clear</Button>}
                    <Button variant="outline" onClick={() => exportTableToCSV(table, 'redos-report')} className="h-[34px]">
                        Export CSV
                    </Button>
                <BackButton/>
                </div>
            </div>

            <DataGrid table={table} recordCount={rawData.length} tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}>
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b bg-white" />
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
                                        {table.getRowModel().rows.map(row => {
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
                                        {rawData.length === 0 && (
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
            />
        </div>
    );
}