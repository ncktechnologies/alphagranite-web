import { Download, Filter, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, formatDisplayValueForKey, formatFieldLabel, getColumnKeys, isPlainObject } from '@/lib/mcp';
import { cn } from '@/lib/utils';

const PAGE_SIZES = [10, 25, 50];

export function ResultTable({ rows, title, className }: { rows: Record<string, unknown>[]; title?: string; className?: string }) {
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [search, pageSize, rows]);

  const columns = useMemo(() => getColumnKeys(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const query = search.toLowerCase();
    return rows.filter((row) =>
      Object.entries(row).some(([, value]) => formatDisplayValueForKey(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentRows = filteredRows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title ?? 'Data'}</p>
          <p className="text-xs text-muted-foreground">
            {filteredRows.length} row{filteredRows.length === 1 ? '' : 's'} available
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter rows" className="pl-9 sm:w-[260px]" />
          </div>

          <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
            <SelectTrigger className="sm:w-[120px]">
              <Filter className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => downloadCsv(filteredRows, columns, title ? title.toLowerCase().replace(/\s+/g, '-') : 'mcp-data')}
            disabled={filteredRows.length === 0 || columns.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap">
                  {formatFieldLabel(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRows.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => {
                  const value = row[column];
                  const content = formatDisplayValueForKey(value, column);
                  return (
                    <TableCell key={column} className="max-w-[320px] align-top text-xs text-foreground/85">
                      <div className="line-clamp-3 break-words">{content}</div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {currentRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length || 1} className="py-10 text-center text-sm text-muted-foreground">
                  No rows match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredRows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => Math.max(0, current - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex >= pageCount - 1}
              onClick={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}