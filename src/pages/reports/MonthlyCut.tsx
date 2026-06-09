// pages/reports/MonthlyCutCompletion.tsx
import { useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getPaginationRowModel, PaginationState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { useGetMonthlyCutCompletionQuery } from '@/store/api/report';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { exportTableToCSV } from '@/lib/exportToCsv';

export function MonthlyCutCompletionReport() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

    const { data, isLoading } = useGetMonthlyCutCompletionQuery({ year, month });
    const rows = useMemo(() => data?.data?.rows ?? [], [data]);
    const summary = useMemo(() => data?.data?.summary ?? null, [data]);

    const columns = useMemo<ColumnDef<any>[]>(() => {
        if (!rows.length) return [];
        const first = rows[0];
        return Object.keys(first).map(key => ({
            accessorKey: key,
            header: ({ column }) => <DataGridColumnHeader title={key.replace(/_/g, ' ').toUpperCase()} column={column} />,
            cell: ({ row }) => {
                let val = row.original[key];
                if (key.includes('date') && val) val = format(new Date(val), 'MMM dd, yyyy');
                if (typeof val === 'number') val = val.toLocaleString();
                return <span className="text-sm">{val ?? '-'}</span>;
            },
        }));
    }, [rows]);

    const table = useReactTable({ columns, data: rows, state: { pagination }, onPaginationChange: setPagination, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel() });

    if (isLoading) return <div className="p-5">Loading...</div>;

    return (
        <div className="p-5">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold">Monthly Cut Completion</h1>
                <div className="flex gap-2">
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
                    <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=>i+1).map(m => <SelectItem key={m} value={String(m)}>{new Date(2000,m-1,1).toLocaleString('default',{month:'long'})}</SelectItem>)}</SelectContent></Select>
                    <Button variant="outline" onClick={() => exportTableToCSV(table, `monthly-cut-${year}-${month}`)}>Export CSV</Button>
                </div>
            </div>
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="p-4"><div className="text-sm">Pieces</div><div className="text-2xl font-bold">{summary.pieces}</div></Card>
                    <Card className="p-4"><div className="text-sm">SQ FT</div><div className="text-2xl font-bold">{summary.sq_ft.toFixed(2)}</div></Card>
                    <Card className="p-4"><div className="text-sm">Revenue</div><div className="text-2xl font-bold">${summary.revenue.toFixed(2)}</div></Card>
                    <Card className="p-4"><div className="text-sm">Revenue/SQFT</div><div className="text-2xl font-bold">${summary.revenue_per_sq_ft.toFixed(2)}</div></Card>
                </div>
            )}
            <DataGrid table={table} recordCount={rows.length} tableLayout={{ cellBorder: true }}>
                <Card><CardHeader className="py-3 border-b"><CardToolbar /></CardHeader><CardTable><ScrollArea className="h-[calc(100vh-300px)]"><DataGridTable /><ScrollBar orientation="horizontal" /></ScrollArea></CardTable><CardFooter><DataGridPagination /></CardFooter></Card>
            </DataGrid>
        </div>
    );
}