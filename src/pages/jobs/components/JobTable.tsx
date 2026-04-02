import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardFooter,
    CardHeader,
    CardHeading,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IJob } from './job';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { useToggleFabOnHoldMutation } from '@/store/api/job';
import { Switch } from '@/components/ui/switch';
import ActionsCell from '../roles/sales/action';
import { useNavigate, Link } from 'react-router-dom';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { formatForDisplay } from '@/utils/date-utils';
import { useTableState } from '@/hooks/use-table-state';

interface JobTableProps {
    jobs: IJob[];
    path: string;
    getPath?: (job: IJob) => string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
    showScheduleFilter?: boolean;
    showSalesPersonFilter?: boolean;
    salesPersons?: string[];
    salesPersonFilterLabel?: string;
    showTemplaterFilter?: boolean;
    templaters?: string[];
    templaterFilter?: string;
    setTemplaterFilter?: (value: string) => void;
    useBackendPagination?: boolean;
    totalRecords?: number;
    tableState?: ReturnType<typeof useTableState>;
    visibleColumns?: string[];
    enableMultiSelect?: boolean;
    selectedRows?: string[];
    setSelectedRows?: (rows: string[]) => void;
    showAssignDrafterButton?: boolean;
    onAssignDrafterClick?: () => void;
    onRescheduleClick?: (job: IJob) => void;
    onAssignClick?: (job: IJob) => void;
    /** When provided, a "Reassign" button appears next to the drafter name.
     *  The drafter column is hidden by default when every visible row has a
     *  drafter; clicking Reassign temporarily shows the column for that row. */
    onReassignDrafterClick?: (job: IJob) => void;
    /** 'templater' | 'installer' — when set, job number links to the role timer page */
    pageRole?: 'templater' | 'installer';
}

export const JobTable = ({
    jobs,
    path,
    getPath,
    isSuperAdmin = false,
    isLoading,
    onRowClick,
    showScheduleFilter = false,
    showSalesPersonFilter = false,
    salesPersons = [],
    salesPersonFilterLabel = "Sales Person",
    showTemplaterFilter = false,
    templaters = [],
    templaterFilter = "all",
    setTemplaterFilter = () => { },
    useBackendPagination = false,
    totalRecords = 0,
    tableState,
    visibleColumns,
    enableMultiSelect = false,
    selectedRows = [],
    setSelectedRows = () => { },
    showAssignDrafterButton = false,
    onAssignDrafterClick = () => { },
    onRescheduleClick,
    onAssignClick,
    onReassignDrafterClick,
    pageRole,
}: JobTableProps) => {
    const [localSelectedRows, setLocalSelectedRows] = useState<string[]>([]);
    const [localPagination, setLocalPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 25,
    });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [localDateFilter, setLocalDateFilter] = useState<string>('all');
    const [localFabTypeFilter, setLocalFabTypeFilter] = useState<string>('all');
    const [localSalesPersonFilter, setLocalSalesPersonFilter] = useState<string>('all');
    const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});
    const [suppressParentRefresh, setSuppressParentRefresh] = useState(false);

    // ── Drafter column visibility ────────────────────────────────────────────
    // The drafter column is hidden when all filtered rows have a drafter
    // assigned. A "Reassign" button per row temporarily re-shows the column.
    const [drafterColumnVisible, setDrafterColumnVisible] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const navigate = useNavigate();
    const [toggleFabOnHold] = useToggleFabOnHoldMutation();

    // Use backend state if available, otherwise use local state
    const pagination        = tableState?.pagination        ?? localPagination;
    const setPagination     = tableState?.setPagination     ?? setLocalPagination;
    const searchQuery       = tableState?.searchQuery       ?? localSearchQuery;
    const setSearchQuery    = tableState?.setSearchQuery    ?? setLocalSearchQuery;
    const effectiveSearchType    = (tableState as any)?.searchType    ?? searchType;
    const setEffectiveSearchType = (tableState as any)?.setSearchType ?? setSearchType;
    const dateFilter        = tableState?.dateFilter        ?? localDateFilter;
    const setDateFilter     = tableState?.setDateFilter     ?? setLocalDateFilter;
    const fabTypeFilter     = tableState?.fabTypeFilter     ?? localFabTypeFilter;
    const setFabTypeFilter  = tableState?.setFabTypeFilter  ?? setLocalFabTypeFilter;
    const salesPersonFilter = (tableState as any)?.salesPersonFilter ?? localSalesPersonFilter;
    const setSalesPersonFilter = (tableState as any)?.setSalesPersonFilter ?? setLocalSalesPersonFilter;
    const dateRange         = tableState?.dateRange         ?? localDateRange;
    const setDateRange      = tableState?.setDateRange      ?? setLocalDateRange;
    const scheduleFilter    = tableState?.scheduleFilter    ?? 'all';
    const setScheduleFilter = tableState?.setScheduleFilter ?? (() => { });

    const effectiveSelectedRows    = selectedRows ?? localSelectedRows;
    const setEffectiveSelectedRows = setSelectedRows ?? setLocalSelectedRows;

    const getViewPath = (job: IJob): string => {
        if (getPath) return getPath(job);
        return path;
    };

    const handleView = (job: IJob) => {
        const viewPath = getViewPath(job);
        navigate(`/job/${viewPath}/${job.fab_id}`);
    };

    const handleRowClickInternal = (job: IJob) => {
        if (onRowClick) onRowClick(job.fab_id);
    };

    const handleStageFilterChange = (stageValue: string) => {
        if (stageValue === 'all') return;
        const selectedStage = Object.values(JOB_STAGES).find(stage => stage.stage === stageValue);
        if (selectedStage) navigate(selectedStage.route);
    };

    const fabTypes = useMemo(() => {
        return Array.from(new Set(jobs.map(job => job.fab_type).filter(Boolean))).sort();
    }, [jobs]);

    const uniqueSalesPersons = useMemo(() => {
        return Array.from(new Set(jobs.map(job => job.sales_person_name).filter(Boolean))).sort();
    }, [jobs]);

    const filteredData = useMemo(() => {
        if (useBackendPagination) return jobs;

        let result = jobs;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((job) => {
                if (effectiveSearchType === 'fab_id')     return job.fab_id?.toLowerCase().includes(q);
                if (effectiveSearchType === 'job_number') return job.job_no?.toLowerCase().includes(q);
                if (effectiveSearchType === 'job_name')   return job.job_name?.toLowerCase().includes(q);
                return false;
            });
        }

        if (dateFilter !== 'all' && dateFilter !== 'custom') {
            result = result.filter((job) => {
                if (!job.date) return false;
                const jobDate = new Date(job.date);
                const today = new Date();
                const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                return true; // Keep your existing date range logic here
            });
        }

        if (dateFilter === 'custom' && dateRange?.from) {
            result = result.filter((job) => {
                if (!job.date) return false;
                const jobDate = new Date(job.date);
                const startDate = new Date(dateRange.from!);
                const endDate = dateRange.to ? new Date(dateRange.to) : startDate;
                endDate.setHours(23, 59, 59, 999);
                return jobDate >= startDate && jobDate <= endDate;
            });
        }

        if (fabTypeFilter !== 'all') {
            result = result.filter((job) => job.fab_type === fabTypeFilter);
        }

        if (scheduleFilter !== 'all') {
            if (scheduleFilter === 'scheduled') {
                result = result.filter((job) => job.date && job.date !== '');
            } else if (scheduleFilter === 'unscheduled') {
                result = result.filter((job) => !job.date || job.date === '');
            }
        }

        if (showSalesPersonFilter && salesPersonFilter !== 'all') {
            if (salesPersonFilter === 'no_sales_person') {
                result = result.filter((job) => !job.sales_person_name || job.sales_person_name === '');
            } else {
                result = result.filter((job) => job.sales_person_name === salesPersonFilter);
            }
        }

        return result;
    }, [
        jobs,
        useBackendPagination,
        searchQuery,
        effectiveSearchType,
        dateFilter,
        dateRange,
        fabTypeFilter,
        scheduleFilter,
        salesPersonFilter,
        showSalesPersonFilter,
    ]);

    // ── Drafter column auto-visibility ───────────────────────────────────────
    // Derive whether the drafter column should be visible:
    // Show it if any row in filteredData has NO drafter assigned, OR if the
    // user clicked Reassign (drafterColumnVisible override).
    // Show the drafter column when ANY row HAS a drafter assigned.
    // Column stays hidden when no row has a drafter yet (nothing to show).
    // Clicking Reassign does not need to toggle visibility — the column is
    // already visible because a drafter exists on that row.
    const anyRowWithDrafter = useMemo(
        () => filteredData.some(job => job.drafter && job.drafter !== '-'),
        [filteredData]
    );
    const showDrafterColumn = anyRowWithDrafter || drafterColumnVisible;

    const renderNotes = (row: any, stage: string | string[]) => {
        const fabNotes = Array.isArray(row.original.fab_notes)
            ? row.original.fab_notes
            : Array.isArray(row.original.notes)
                ? row.original.notes
                : [];
        const stages = Array.isArray(stage) ? stage : [stage];
        const notes = fabNotes.filter((note: any) => stages.includes(note.stage));
        if (notes.length === 0) return <span className="text-xs text-gray-500 italic">No notes</span>;
        const latest = notes[0];
        return (
            <div className="text-xs max-w-xs" title={latest.note}>
                <div className="font-medium truncate">{latest.note}</div>
                <div className="text-gray-500 text-xs">by {latest.created_by_name || 'Unknown'}</div>
            </div>
        );
    };

    const generateFabInfo = (job: IJob) => {
        const jobInfo = [];
        const materialInfo = [];
        const stoneInfo = [];
        if (job.acct_name || job.account_name) jobInfo.push(job.acct_name || job.account_name || '');
        if (job.job_name) jobInfo.push(job.job_name);
        if (job.input_area) materialInfo.push(`Area: ${job.input_area}`);
        if (job.stone_type_name) stoneInfo.push(job.stone_type_name);
        if (job.stone_color_name) stoneInfo.push(job.stone_color_name);
        if (job.stone_thickness_value) stoneInfo.push(job.stone_thickness_value);
        if (job.edge_name) materialInfo.push(job.edge_name);
        return { jobInfo, materialInfo, stoneInfo };
    };

    const toggleRowSelection = (fabId: string) => {
        if (setSelectedRows) {
            if (effectiveSelectedRows.includes(fabId)) {
                setSelectedRows(effectiveSelectedRows.filter(id => id !== fabId));
            } else {
                setSelectedRows([...effectiveSelectedRows, fabId]);
            }
        } else {
            setLocalSelectedRows(prev =>
                prev.includes(fabId) ? prev.filter(id => id !== fabId) : [...prev, fabId]
            );
        }
    };

    const baseColumns = useMemo<ColumnDef<IJob>[]>(() => [
        // ── Checkbox (multi-select) — excluded entirely when enableMultiSelect is false ──
        {
            id: 'select',           // explicit id so the columns memo can reliably filter it
            accessorKey: 'id',
            accessorFn: (row) => row.id,
            header: () => {
                if (!enableMultiSelect) return null;
                const selectableJobs = filteredData.filter(job => !job.drafter || job.drafter === '-');
                if (selectableJobs.length === 0) return null;
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <Checkbox
                            checked={selectableJobs.every(job => effectiveSelectedRows.includes(job.fab_id))}
                            onCheckedChange={() => {
                                const selectableFabIds = selectableJobs.map(job => job.fab_id);
                                const allSelected = selectableFabIds.every(id => effectiveSelectedRows.includes(id));
                                if (allSelected) {
                                    setSelectedRows(effectiveSelectedRows.filter(id => !selectableFabIds.includes(id)));
                                } else {
                                    setSelectedRows([...new Set([...effectiveSelectedRows, ...selectableFabIds])]);
                                }
                            }}
                            aria-label="Select all"
                        />
                    </div>
                );
            },
            cell: ({ row }) => {
                const hasDrafter = row.original.drafter && row.original.drafter !== '-';
                if (!enableMultiSelect || hasDrafter) return null;
                return (
                    <div className="w-full h-full flex items-center justify-center">
                        <Checkbox
                            checked={effectiveSelectedRows.includes(row.original.fab_id)}
                            onCheckedChange={() => toggleRowSelection(row.original.fab_id)}
                            aria-label="Select row"
                        />
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
            size: 48,
        },

        // ── Actions — always first visible column, no gap before it ──────────
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => <ActionsCell row={row} onView={() => handleView(row.original)} />,
            enableSorting: false,
            size: 60,
        },

        // ── Fab Type ─────────────────────────────────────────────────────────
        {
            id: "fab_type",
            accessorKey: "fab_type",
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="text-xs uppercase">{row.original.fab_type}</span>,
            size: 100,
            enableSorting: true,
        },

        // ── Fab ID ───────────────────────────────────────────────────────────
        {
            id: "fab_id",
            accessorKey: "fab_id",
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => (
                <Link to={`/sales/${row.original.fab_id}`} className="text-xs hover:underline">
                    {row.original.fab_id}
                </Link>
            ),
            size: 80,
            enableSorting: true,
        },

        // ── Job Name ─────────────────────────────────────────────────────────
        {
            id: "job_name",
            accessorKey: "job_name",
            header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[180px]">{row.original.job_name}</span>,
            size: 160,
            enableSorting: true,
        },

        // ── Job No ───────────────────────────────────────────────────────────
        {
            id: "job_no",
            accessorKey: "job_no",
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => {
                const { job_id, job_no, fab_id } = row.original;
                if (pageRole === 'templater' && job_id) {
                    return (
                        <Link to={`/jobs/${job_id}/templater/timer`} className="text-xs text-blue-600 hover:underline">
                            {job_no}
                        </Link>
                    );
                }
                if (pageRole === 'installer' && job_id) {
                    return (
                        <Link to={`/jobs/${job_id}/installer/timer`} className="text-xs text-blue-600 hover:underline">
                            {job_no}
                        </Link>
                    );
                }
                if (job_id) {
                    return (
                        <Link to={`/job/details/${job_id}`} className="text-xs text-blue-600 hover:underline">
                            {job_no}
                        </Link>
                    );
                }
                return <span className="text-xs">{job_no}</span>;
            },
            size: 100,
            enableSorting: true,
        },

        // ── Fab Info ─────────────────────────────────────────────────────────
        {
            id: "fab_info",
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const { jobInfo, materialInfo, stoneInfo } = generateFabInfo(row.original);
                return (
                    <div className="flex gap-4 text-xs max-w-[400px]">
                        {jobInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-gray-600" title={jobInfo.join(' - ')}>
                                    {jobInfo.join(' - ')}
                                </div>
                                {stoneInfo.length > 0 && (
                                    <div className="truncate text-gray-600" title={stoneInfo.join(' - ')}>
                                        {stoneInfo.join(' - ')}
                                    </div>
                                )}
                            </div>
                        )}
                        {materialInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                {materialInfo.map((info, idx) => (
                                    <div key={idx} className="truncate text-gray-600">{info}</div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            },
            size: 400,
            enableSorting: false,
        },

        // ── Template Needed ───────────────────────────────────────────────────
        {
            id: "template_needed",
            accessorKey: "template_needed",
            header: ({ column }) => <DataGridColumnHeader title="Template not needed" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.template_needed}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Acct Name ────────────────────────────────────────────────────────
        {
            id: "acct_name",
            accessorKey: "acct_name",
            header: ({ column }) => <DataGridColumnHeader title="ACCT NAME" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[140px]">{row.original.acct_name}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── No of pieces ─────────────────────────────────────────────────────
        {
            id: "no_of_pieces",
            accessorKey: "no_of_pieces",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="No. of pieces" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[110px]">{row.original.no_of_pieces}</span>,
            size: 100,
            enableSorting: true,
        },

        // ── Template Schedule ─────────────────────────────────────────────────
        {
            id: "template_schedule",
            accessorKey: "template_schedule",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="TEMPLATE SCHEDULE" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.template_schedule}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Template Received ─────────────────────────────────────────────────
        {
            id: "template_received",
            accessorKey: "template_received",
            header: ({ column }) => <DataGridColumnHeader title="TEMPLATE RECEIVED" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.template_received}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Templater ────────────────────────────────────────────────────────
        {
            id: "templater",
            accessorKey: "templater",
            header: ({ column }) => <DataGridColumnHeader title="TEMPLATER" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.templater}</span>,
            size: 130,
            enableSorting: true,
        },

        // ── Drafter ──────────────────────────────────────────────────────────
        // Hidden when all rows have a drafter. "Reassign" button per row
        // temporarily reveals the column so a new drafter can be selected.
        // On pages that don't pass onReassignDrafterClick this column behaves
        // exactly as before (shown/hidden by visibleColumns prop).
        {
            id: "drafter",
            accessorKey: "drafter",
            header: ({ column }) => <DataGridColumnHeader title="DRAFTER" column={column} />,
            cell: ({ row }) => {
                const drafter = row.original.drafter;
                const hasDrafter = drafter && drafter !== '-';

                return (
                    <div className="flex items-center gap-2">
                        <span className="text-xs">{drafter || '—'}</span>

                        {/* Only render Reassign when the prop is provided (JobStatusTable context) */}
                        {hasDrafter && onReassignDrafterClick && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] border-orange-300 text-orange-600 hover:bg-orange-50 whitespace-nowrap"
                                onClick={e => {
                                    e.stopPropagation();
                                    // Ensure the column stays visible while the user acts
                                    setDrafterColumnVisible(true);
                                    onReassignDrafterClick(row.original);
                                }}
                            >
                                Reassign
                            </Button>
                        )}
                    </div>
                );
            },
            size: 160,
            enableSorting: true,
        },

        // ── Total Sq Ft ──────────────────────────────────────────────────────
        {
            id: "total_sq_ft",
            accessorKey: "total_sq_ft",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Total Sq ft" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[100px]">{row.original.total_sq_ft}</span>,
            size: 100,
            enableSorting: true,
        },

        // ── Revisor ───────────────────────────────────────────────────────────
        {
            id: "revisor",
            accessorKey: "revisor",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revisor" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[120px]">{row.original.revisor}</span>,
            size: 100,
            enableSorting: true,
        },

        // ── Revised ───────────────────────────────────────────────────────────
        {
            id: "revised",
            accessorKey: "revised",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revised?" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[100px]">{row.original.revised}</span>,
            size: 80,
            enableSorting: true,
        },

        // ── Revision Completed ────────────────────────────────────────────────
        {
            id: "revision_completed",
            accessorKey: "revision_completed",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revision completed" column={column} />,
            cell: ({ row }) => <span className="text-sm break-words max-w-[160px]">{row.original.revision_completed}</span>,
            size: 130,
            enableSorting: true,
        },

        // ── Revision Number ───────────────────────────────────────────────────
        {
            id: "revision_number",
            accessorKey: "revision_number",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revision #" column={column} />,
            cell: ({ row }) => <span className="text-sm break-words max-w-[80px]">{row.original.revision_number}</span>,
            size: 100,
            enableSorting: true,
        },

        // ── Revision Reason ───────────────────────────────────────────────────
        {
            id: "revision_reason",
            accessorKey: "revision_reason",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revision reason" column={column} />,
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[200px]" title={row.original.revision_reason}>
                    {row.original.revision_reason}
                </span>
            ),
            size: 150,
            enableSorting: true,
        },

        // ── Revision Type ─────────────────────────────────────────────────────
        {
            id: "revision_type",
            accessorKey: "revision_type",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revision type" column={column} />,
            cell: ({ row }) => <span className="text-sm break-words max-w-[120px]">{row.original.revision_type}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Revenue ───────────────────────────────────────────────────────────
        {
            id: "revenue",
            accessorKey: "revenue",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Revenue" column={column} />,
            cell: ({ row }) => <span className="text-xs break-words max-w-[160px]">{row.original.revenue}</span>,
            size: 110,
            enableSorting: true,
        },

        // ── GP ────────────────────────────────────────────────────────────────
        {
            id: "gp",
            accessorKey: "gp",
            header: ({ column }) => <DataGridColumnHeader title="GP" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.gp}</span>,
            size: 80,
            enableSorting: true,
        },

        // ── SCT Completed ─────────────────────────────────────────────────────
        {
            id: "sct_completed",
            accessorKey: "sct_completed",
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="Sct Completed" column={column} />,
            cell: ({ row }) => <span className="text-sm break-words max-w-[160px]">{row.original.sct_completed}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── SlabSmith Status ──────────────────────────────────────────────────
        {
            id: "slabsmith_status",
            accessorFn: (row) => {
                const needed = (row as any).slabsmith_ag_needed ?? (row as any)._rawFabData?.slabsmith_ag_needed;
                const completed = (row as any).slabsmith_completed_date ?? (row as any)._rawFabData?.slabsmith_completed_date;
                if (needed === false) return 'Not Needed';
                if (needed === true) return completed ? 'Completed' : 'Not Completed';
                return 'Unknown';
            },
            header: ({ column }) => <DataGridColumnHeader className="uppercase" title="SlabSmith Status" column={column} />,
            cell: ({ row }) => {
                const needed = (row.original as any).slabsmith_ag_needed ?? (row.original as any)._rawFabData?.slabsmith_ag_needed;
                const completed = (row.original as any).slabsmith_completed_date ?? (row.original as any)._rawFabData?.slabsmith_completed_date;
                if (needed === false) return <span className="text-sm text-gray-500">Not Needed</span>;
                if (needed === true)  return completed
                    ? <span className="text-sm text-green-600 font-medium">Completed</span>
                    : <span className="text-sm text-red-600 font-medium">Not Completed</span>;
                return <span className="text-sm">Unknown</span>;
            },
            size: 140,
            enableSorting: true,
        },

        // ── Draft Status ──────────────────────────────────────────────────────
        {
            id: "draft_completed",
            accessorKey: "draft_completed",
            header: ({ column }) => <DataGridColumnHeader title="DRAFT Status" column={column} />,
            cell: ({ row }) => {
                const status = row.original.draft_completed;
                if (status === 'drafting') return <span className="text-sm text-green-600 font-medium">Drafting</span>;
                if (status === 'paused')   return <span className="text-sm text-red-600 font-medium">Paused</span>;
                return <span className="text-sm text-gray-500">Not Started</span>;
            },
            size: 130,
            enableSorting: true,
        },

        // ── Review Completed ──────────────────────────────────────────────────
        {
            id: "review_completed",
            accessorKey: "review_completed",
            header: ({ column }) => <DataGridColumnHeader title="REVIEW COMPLETED" column={column} />,
            cell: ({ row }) => <span className="text-sm break-words max-w-[160px]">{row.original.review_completed}</span>,
            size: 140,
            enableSorting: true,
        },

        // ── Notes columns ─────────────────────────────────────────────────────
        { id: 'templating_notes',        header: ({ column }) => <DataGridColumnHeader title="Templating Notes"       column={column} />, cell: ({ row }) => renderNotes(row, 'templating'),                         enableSorting: false, size: 180 },
        { id: 'drafting_notes',          header: ({ column }) => <DataGridColumnHeader title="Drafting Notes"         column={column} />, cell: ({ row }) => renderNotes(row, 'drafting'),                           enableSorting: false, size: 180 },
        { id: 'final_programming_notes', header: ({ column }) => <DataGridColumnHeader title="Notes"                  column={column} />, cell: ({ row }) => renderNotes(row, 'final_programming'),                  enableSorting: false, size: 180 },
        { id: 'pre_draft_notes',         header: ({ column }) => <DataGridColumnHeader title="Pre-Draft Notes"        column={column} />, cell: ({ row }) => renderNotes(row, 'pre_draft_review'),                   enableSorting: false, size: 180 },
        { id: 'cutting_notes',           header: ({ column }) => <DataGridColumnHeader title="Cut List Notes"         column={column} />, cell: ({ row }) => renderNotes(row, 'cut_list'),                           enableSorting: false, size: 180 },
        { id: 'slabsmith_notes',         header: ({ column }) => <DataGridColumnHeader title="SlabSmith Notes"        column={column} />, cell: ({ row }) => renderNotes(row, 'slab_smith_request'),                 enableSorting: false, size: 180 },
        { id: 'sct_notes',               header: ({ column }) => <DataGridColumnHeader title="SCT Notes"              column={column} />, cell: ({ row }) => renderNotes(row, 'sales_ct'),                           enableSorting: false, size: 180 },
        { id: 'draft_revision_notes',    header: ({ column }) => <DataGridColumnHeader title="Draft/Revision Notes"   column={column} />, cell: ({ row }) => renderNotes(row, ['draft', 'revisions']),               enableSorting: false, size: 180 },
        { id: 'draft_notes',             header: ({ column }) => <DataGridColumnHeader title="Draft Notes"            column={column} />, cell: ({ row }) => renderNotes(row, 'drafting'),                           enableSorting: false, size: 180 },
        { id: 'revision_notes',          header: ({ column }) => <DataGridColumnHeader title="Revision Notes"         column={column} />, cell: ({ row }) => renderNotes(row, ['revision', 'revisions']),            enableSorting: false, size: 180 },
        { id: 'install_notes',           header: ({ column }) => <DataGridColumnHeader title="Install Notes"          column={column} />, cell: ({ row }) => renderNotes(row, 'install_schedulling'),                enableSorting: false, size: 180 },

        // ── File ──────────────────────────────────────────────────────────────
        {
            id: 'file',
            accessorKey: 'file',
            header: ({ column }) => <DataGridColumnHeader title="FILE" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.file || '-'}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Shop Date Scheduled ───────────────────────────────────────────────
        {
            id: 'shop_date_scheduled',
            accessorKey: 'shop_date_scheduled',
            header: ({ column }) => <DataGridColumnHeader title="SHOP DATE SCHEDULED" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.shop_date_scheduled || '-'}</span>,
            size: 150,
            enableSorting: true,
        },

        // ── WJ Time Minutes ───────────────────────────────────────────────────
        {
            id: 'wj_time_minutes',
            accessorKey: 'wj_time_minutes',
            header: ({ column }) => <DataGridColumnHeader title="WJ TIME MINUTES" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.wj_time_minutes || '-'}</span>,
            size: 150,
            enableSorting: true,
        },

        // ── Final Programming Completed ───────────────────────────────────────
        {
            id: 'final_programming_completed',
            accessorKey: 'final_programming_completed',
            header: ({ column }) => <DataGridColumnHeader title="FINAL PROGRAMMING COMPLETED" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.final_programming_completed || '-'}</span>,
            size: 150,
            enableSorting: true,
        },

        // ── Final Programmer ──────────────────────────────────────────────────
        {
            id: 'final_programmer',
            accessorKey: 'final_programmer',
            header: ({ column }) => <DataGridColumnHeader title="FINAL PROGRAMMER" column={column} />,
            cell: ({ row }) => <span className="text-xs">{row.original.final_programmer || '-'}</span>,
            size: 150,
            enableSorting: true,
        },

        // ── Notes ─────────────────────────────────────────────────────────────
        {
            id: 'notes',
            accessorKey: 'notes',
            accessorFn: (row) => typeof row.notes === 'string' ? row.notes : '',
            header: ({ column }) => <DataGridColumnHeader title="NOTES" column={column} />,
            cell: ({ row }) => (
                <span className="text-xs">
                    {typeof row.original.notes === 'string' ? row.original.notes : '-'}
                </span>
            ),
            size: 150,
            enableSorting: true,
        },

        // ── Templating Action ─────────────────────────────────────────────────
        {
            id: "reschedule",
            accessorKey: "templating_completed",
            header: ({ column }) => <DataGridColumnHeader title="Templating Action" column={column} />,
            cell: ({ row }) => {
                if (row.original.templating_completed === false && row.original.template_schedule !== "" && !row.original.rescheduled) {
                    return (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={e => { e.stopPropagation(); onRescheduleClick?.(row.original); }}
                        >
                            Reschedule
                        </Button>
                    );
                }
                if (row.original.template_schedule === "") {
                    return <Link to={`/job/templating/${row.original.fab_id}`}>Assign</Link>;
                }
                if (row.original.templating_completed === false && row.original.rescheduled) {
                    return <span>Rescheduled</span>;
                }
                return null;
            },
            size: 100,
            enableSorting: true,
        },

        // ── % Complete ────────────────────────────────────────────────────────
        {
            id: 'percent_complete',
            accessorKey: 'percent_complete',
            header: ({ column }) => <DataGridColumnHeader title="% COMPLETE" column={column} />,
            cell: ({ row }) => {
                const val = (row.original as any).percent_complete;
                return <span className="text-xs">{val != null ? `${val}%` : '-'}</span>;
            },
            size: 100,
            enableSorting: true,
        },

        // ── Completion Date ───────────────────────────────────────────────────
        {
            id: 'completion_date',
            accessorKey: 'completion_date',
            header: ({ column }) => <DataGridColumnHeader title="COMPLETION DATE" column={column} />,
            cell: ({ row }) => <span className="text-xs">{(row.original as any).completion_date || '-'}</span>,
            size: 140,
            enableSorting: true,
        },

        // ── Installer ─────────────────────────────────────────────────────────
        {
            id: 'installer',
            accessorKey: 'installer',
            header: ({ column }) => <DataGridColumnHeader title="INSTALLER" column={column} />,
            cell: ({ row }) => <span className="text-xs">{(row.original as any).installer || '-'}</span>,
            size: 130,
            enableSorting: true,
        },

        // ── Install Date ──────────────────────────────────────────────────────
        {
            id: 'install_date',
            accessorKey: 'install_date',
            header: ({ column }) => <DataGridColumnHeader title="INSTALL DATE" column={column} />,
            cell: ({ row }) => <span className="text-xs">{(row.original as any).install_date || '-'}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── Install Confirmed ─────────────────────────────────────────────────
        {
            id: 'install_confirmed',
            accessorKey: 'install_confirmed',
            header: ({ column }) => <DataGridColumnHeader title="INSTALL CONFIRMED" column={column} />,
            cell: ({ row }) => {
                const confirmed = (row.original as any).install_confirmed;
                if (confirmed === true  || confirmed === 'Yes') return <span className="text-xs font-medium text-green-600">Yes</span>;
                if (confirmed === false || confirmed === 'No')  return <span className="text-xs font-medium text-red-500">No</span>;
                return <span className="text-xs text-gray-400">-</span>;
            },
            size: 140,
            enableSorting: true,
        },

        // ── Shop Status ───────────────────────────────────────────────────────
        {
            id: 'shop_status',
            accessorKey: 'shop_status',
            header: ({ column }) => <DataGridColumnHeader title="SHOP STATUS" column={column} />,
            cell: ({ row }) => <span className="text-xs">{(row.original as any).shop_status || '-'}</span>,
            size: 120,
            enableSorting: true,
        },

        // ── On Hold ───────────────────────────────────────────────────────────
        {
            id: "on_hold",
            accessorKey: "status_id",
            accessorFn: (row) => {
                const fabId = row.fab_id;
                if (optimisticUpdates[fabId] !== undefined) return optimisticUpdates[fabId] === 0;
                return row.status_id === 0;
            },
            header: ({ column }) => <DataGridColumnHeader title="ON HOLD" column={column} />,
            cell: ({ row }) => {
                const fabId = parseInt(row.original.fab_id);
                const isLoading = loadingStates[fabId] || false;
                const isChecked = optimisticUpdates[row.original.fab_id] !== undefined
                    ? optimisticUpdates[row.original.fab_id] === 0
                    : row.original.status_id === 0;
                return (
                    <div className="flex justify-center items-center">
                        <Switch
                            className={`data-[state=checked]:bg-red-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            checked={isChecked}
                            disabled={isLoading}
                            onCheckedChange={async (checked) => {
                                if (isLoading) return;
                                const newStatusId = checked ? 0 : 1;
                                const fabIdStr = row.original.fab_id;
                                setOptimisticUpdates(prev => ({ ...prev, [fabIdStr]: newStatusId }));
                                setLoadingStates(prev => ({ ...prev, [fabId]: true }));
                                setSuppressParentRefresh(true);
                                try {
                                    await toggleFabOnHold({ fab_id: fabId, on_hold: checked }).unwrap();
                                    setTimeout(() => {
                                        setSuppressParentRefresh(false);
                                        setOptimisticUpdates(prev => { const s = { ...prev }; delete s[fabIdStr]; return s; });
                                    }, 2000);
                                } catch {
                                    setOptimisticUpdates(prev => { const s = { ...prev }; delete s[row.original.fab_id]; return s; });
                                    setSuppressParentRefresh(false);
                                } finally {
                                    setLoadingStates(prev => { const s = { ...prev }; delete s[fabId]; return s; });
                                }
                            }}
                            aria-label="Toggle on hold"
                        />
                        {isLoading && (
                            <div className="ml-2">
                                <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            size: 80,
        },

    ], [
        getPath, path, dateRange, enableMultiSelect, effectiveSelectedRows,
        filteredData, loadingStates, optimisticUpdates, onRescheduleClick,
        onReassignDrafterClick, drafterColumnVisible,
    ]);

    // ── Column filtering ─────────────────────────────────────────────────────
    // The drafter column is excluded when:
    //   - every row already has a drafter (showDrafterColumn is false), AND
    //   - the user hasn't clicked Reassign yet
    // The checkbox column is excluded when enableMultiSelect is false.
    const columns = useMemo(() => {
        return baseColumns.filter(column => {
            // Always include actions
            if (column.id === 'actions') return true;

            // Checkbox: only include when multi-select is on
            if (column.id === 'select') return enableMultiSelect;

            // Drafter column: hide when every row has a drafter AND user hasn't toggled
            if (column.id === 'drafter') {
                // If visibleColumns whitelist is in use, it must include 'drafter' AND showDrafterColumn
                if (visibleColumns?.length) return visibleColumns.includes('drafter') && showDrafterColumn;
                return showDrafterColumn;
            }

            // visibleColumns whitelist
            if (visibleColumns?.length && column.id) return visibleColumns.includes(column.id);

            // Show column only if at least one row has a value for it
            const accessor = (column as any).accessorKey;
            if (accessor && accessor !== 'id') {
                return filteredData.some(
                    job => job[accessor as keyof IJob] != null && job[accessor as keyof IJob] !== ''
                );
            }
            return true;
        });
    }, [baseColumns, filteredData, visibleColumns, enableMultiSelect, showDrafterColumn]);

    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: useBackendPagination
            ? Math.ceil(totalRecords / pagination.pageSize)
            : Math.ceil(filteredData.length / pagination.pageSize),
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: useBackendPagination,
        meta: {
            getRowAttributes: (row: any) => ({
                'data-fab-type': row.original.fab_type?.toLowerCase()
            })
        }
    });

    return (
        <DataGrid
            table={table}
            recordCount={useBackendPagination ? totalRecords : filteredData.length}
            isLoading={isLoading}
            groupByDate
            dateKey="date"
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
            onRowClick={onRowClick ? (row) => handleRowClickInternal(row) : undefined}
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Search input with type selector */}
                            <div className="relative flex items-center">
                                <Select
                                    value={effectiveSearchType}
                                    onValueChange={v => setEffectiveSearchType(v as 'fab_id' | 'job_number' | 'job_name')}
                                >
                                    <SelectTrigger className="w-[140px] h-[34px] rounded-e-none border-r-0">
                                        <SelectValue placeholder="Search by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fab_id">Fab ID</SelectItem>
                                        <SelectItem value="job_number">Job Number</SelectItem>
                                        <SelectItem value="job_name">Job Name</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="relative">
                                    <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        placeholder={`Search by ${effectiveSearchType.replace('_', ' ')}`}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="ps-9 w-[230px] h-[34px] rounded-s-none"
                                    />
                                    {searchQuery && (
                                        <Button
                                            mode="icon"
                                            variant="ghost"
                                            className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <X />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Fab Type filter */}
                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {fabTypes.map(type => (
                                        <SelectItem key={type} value={type} className="uppercase">{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Date filter */}
                            <div className="flex items-center gap-2">
                                <Select value={dateFilter} onValueChange={v => {
                                    setDateFilter(v);
                                    if (v === 'custom') setIsDatePickerOpen(true);
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Filter by date" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="last_week">Last Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="last_month">Last Month</SelectItem>
                                        <SelectItem value="next_week">Next Week</SelectItem>
                                        <SelectItem value="next_month">Next Month</SelectItem>
                                        <SelectItem value="all">All Date</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>

                                {dateFilter === 'custom' && (
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-[34px]">
                                                <CalendarDays className="h-4 w-4 mr-2" />
                                                {dateRange?.from ? (
                                                    dateRange.to
                                                        ? <>{formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')} – {formatForDisplay(dateRange.to, 'DISPLAY_US_FORMAT')}</>
                                                        : <>{formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')}</>
                                                ) : <span>Pick dates</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={tempDateRange?.from || new Date()}
                                                selected={tempDateRange}
                                                onSelect={setTempDateRange}
                                                numberOfMonths={2}
                                            />
                                            <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                                                <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); }}>Reset</Button>
                                                <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>

                            {/* Schedule filter */}
                            {showScheduleFilter && (
                                <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                                    <SelectTrigger className="w-[150px] h-[34px]">
                                        <SelectValue placeholder="Schedule Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectLabel>Schedule Status</SelectLabel>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Stage filter (super admin) */}
                            {isSuperAdmin && (
                                <Select onValueChange={handleStageFilterChange}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Go to stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Stages</SelectItem>
                                        {Object.values(JOB_STAGES).map(stage => (
                                            <SelectItem key={stage.stage} value={stage.stage}>{stage.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardHeading>

                    <CardToolbar>
                        {/* Sales Person filter */}
                        {showSalesPersonFilter && uniqueSalesPersons.length > 0 && (
                            <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder={salesPersonFilterLabel} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {salesPersonFilterLabel.includes("Templater") ? "All Templaters" : "All Sales Persons"}
                                    </SelectItem>
                                    <SelectItem value="no_sales_person">
                                        {salesPersonFilterLabel.includes("Templater") ? "No Templater" : "No Sales Person"}
                                    </SelectItem>
                                    {uniqueSalesPersons.map(person => (
                                        <SelectItem key={person || 'N/A'} value={person || ''}>{person || 'N/A'}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Templater filter */}
                        {showTemplaterFilter && templaters.length > 0 && (
                            <Select value={templaterFilter} onValueChange={setTemplaterFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder="Filter by Templater" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Templaters</SelectItem>
                                    <SelectItem value="no_templater">No Templater Assigned</SelectItem>
                                    {templaters.map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Assign Drafter button */}
                        {showAssignDrafterButton && (
                            <Button variant="outline" onClick={onAssignDrafterClick} disabled={selectedRows.length === 0}>
                                Assign Drafter ({selectedRows.length})
                            </Button>
                        )}

                        {/* Export CSV */}
                        <Button variant="outline" onClick={() => exportTableToCSV(table, "FabId")}>
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)]">
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                    </ScrollArea>
                </CardTable>

                <CardFooter>
                    <DataGridPagination />
                </CardFooter>
            </Card>
        </DataGrid>
    );
};