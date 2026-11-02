import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Link } from 'react-router-dom';
import { Container } from '@/components/common/container';
import { BackButton } from '@/components/common/BackButton';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useDrafterFilter } from '@/hooks/use-drafter-filter';
import { CompletedWorkReportParams, useGetCompletedWorkReportQuery } from '@/store/api/report';
import { ReportTableShell } from './component/ReportTableShell';

type Department = CompletedWorkReportParams['department'];
type SearchType = NonNullable<CompletedWorkReportParams['search_type']>;

interface CompletedWorkRow {
  completed_on: string | null;
  fab_id: number;
  fab_type: string | null;
  job_number: string | null;
  job_name: string | null;
  account_name: string | null;
  area: string | null;
  stone_type: string | null;
  stone_color: string | null;
  sqft: number | null;
  employee_name: string | null;
}

// Add a department here once the API supports it (see DEPARTMENTS in completed_work_report.py).
const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'cad', label: 'CAD - Drafting' },
  { value: 'cnc', label: 'CNC Programming' },
  { value: 'slabsmith', label: 'SlabSmith' },
  { value: 'final_programming', label: 'Final Programming' },
];

const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: 'fab_id', label: 'Fab ID' },
  { value: 'job_name', label: 'Job Name' },
  { value: 'job_number', label: 'Job Number' },
  { value: 'account_name', label: 'Account' },
];

const joinParts = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' - ');

export function CompletedWorkReport() {
  const [department, setDepartment] = useState<Department>('cad');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('fab_id');
  const { drafters, drafterFilter, setDrafterFilter, filterValue: employeeId } = useDrafterFilter();

  const params: CompletedWorkReportParams = {
    department,
    start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    // "No Drafter" isn't meaningful for completed work, so only a specific person filters.
    employee_id: employeeId ? employeeId : undefined,
    search: search.trim() || undefined,
    search_type: search.trim() ? searchType : undefined,
  };
  const { data, isLoading, isFetching, isError } = useGetCompletedWorkReportQuery(params);
  const report = data?.data;
  const rows: CompletedWorkRow[] = report?.items ?? [];
  const personLabel: string = report?.person_label ?? 'Drafter';
  const departmentLabel = DEPARTMENTS.find((d) => d.value === department)?.label ?? 'CAD';

  const columns = useMemo<ColumnDef<CompletedWorkRow>[]>(
    () => [
      {
        id: 'completed_on',
        accessorKey: 'completed_on',
        header: ({ column }) => <DataGridColumnHeader title="DATE COMPLETED" column={column} />,
        cell: ({ row }) => (row.original.completed_on ? format(new Date(row.original.completed_on), 'MM/dd/yyyy') : '-'),
        meta: { format: (value: string | null) => (value ? format(new Date(value), 'MM/dd/yyyy') : '') },
        size: 130,
      },
      {
        id: 'fab_type',
        accessorKey: 'fab_type',
        header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
        size: 120,
      },
      {
        id: 'fab_id',
        accessorKey: 'fab_id',
        header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
        cell: ({ row }) => (
          <Link to={`/sales/${row.original.fab_id}`} className="text-primary hover:underline">
            {row.original.fab_id}
          </Link>
        ),
        size: 90,
      },
      {
        id: 'job_info',
        accessorFn: (row) => joinParts(row.job_number, row.account_name, row.job_name, row.area),
        header: ({ column }) => <DataGridColumnHeader title="JOB # & FAB INFO" column={column} />,
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium">{row.original.job_number || '-'}</div>
            <div className="text-secondary-foreground">{joinParts(row.original.account_name, row.original.job_name)}</div>
            {row.original.area && <div className="text-muted-foreground">{row.original.area}</div>}
          </div>
        ),
        size: 320,
      },
      {
        id: 'stone',
        accessorFn: (row) => joinParts(row.stone_type, row.stone_color),
        header: ({ column }) => <DataGridColumnHeader title="STONE TYPE & COLOR" column={column} />,
        size: 200,
      },
      {
        id: 'sqft',
        accessorKey: 'sqft',
        header: ({ column }) => <DataGridColumnHeader title="SQ FT" column={column} />,
        cell: ({ row }) => (row.original.sqft != null ? row.original.sqft.toFixed(2) : '-'),
        meta: { format: (value: number | null) => (value != null ? Number(value).toFixed(2) : '') },
        size: 90,
      },
      {
        id: 'employee_name',
        accessorKey: 'employee_name',
        header: ({ column }) => <DataGridColumnHeader title={personLabel.toUpperCase()} column={column} />,
        size: 160,
      },
    ],
    [personLabel],
  );

  return (
    <Container className="border-t">
      <Toolbar>
        <ToolbarHeading
          title={`${departmentLabel} Completed`}
          description={
            report
              ? `${report.total} completed · ${Number(report.total_sqft).toFixed(2)} sq ft`
              : 'Work completed by each department'
          }
        />
        <BackButton />
      </Toolbar>
      <ReportTableShell<CompletedWorkRow>
        title={`${departmentLabel} Completed`}
        exportFilename={`${department}-completed`}
        data={rows}
        columns={columns}
        isLoading={isLoading || (isFetching && !data)}
        isError={isError}
        isFetching={isFetching}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchPlaceholder={`Search by ${SEARCH_TYPES.find((t) => t.value === searchType)?.label}`}
        searchValue={search}
        onSearchChange={setSearch}
        toolbarFilters={
          <>
            <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
              <SelectTrigger className="w-[140px] h-[34px]">
                <SelectValue placeholder="Search by" />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={(v) => setDepartment(v as Department)}>
              <SelectTrigger className="w-[190px] h-[34px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={drafterFilter === 'unassigned' ? 'all' : drafterFilter} onValueChange={setDrafterFilter}>
              <SelectTrigger className="w-[190px] h-[34px]">
                <SelectValue placeholder={personLabel} />
              </SelectTrigger>
              <SelectContent className="max-h-[240px]">
                <SelectItem value="all">All {personLabel}s</SelectItem>
                {drafters.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </Container>
  );
}
