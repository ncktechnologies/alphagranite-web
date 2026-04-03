'use client'
import { useMemo, useState } from 'react';
import {
    ColumnDef,
    getCoreRowModel,
    getSortedRowModel,
    PaginationState,
    SortingState,
    useReactTable,
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
import { Search, X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Link, useNavigate } from 'react-router';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { Fab } from "@/store/api/job";
import { Switch } from '@/components/ui/switch';
import { useToggleFabOnHoldMutation } from '@/store/api/job';
import { NotesModal } from "@/components/common/NotesModal";
import ActionsCell from './components/action';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalculatedCutListData {
    id: number;
    fab_type: string;
    fab_id: string;
    fab_id_0?: string;
    job_name: string;
    job_no: string;
    job_id?: number;
    no_of_pcs: number;
    total_sq_ft: number;
    wl_ln_ft: number;
    sl_ln_ft: number;
    edging_ln_ft: number;
    cnc_ln_ft: number;
    milter_ln_ft: number;
    saw_cut_lnft?: number;
    cost_of_stone: number;
    revenue: number;
    fp_completed: string;
    cip: string;
    install_date: string;
    sales_person?: string;
    shop_date_schedule: string;
    status_id?: number;
    on_hold?: boolean;
    fab_notes?: Array<{ id: number; note: string; created_by_name?: string; created_at?: string; stage?: string }>;
    notes?: Array<{ id: number; note: string; created_by_name?: string; created_at?: string; stage?: string }>;
    acct_name?: string;
    input_area?: string;
    stone_type_name?: string;
    stone_color_name?: string;
    stone_thickness_value?: string;
    edge_name?: string;
    final_programming_completed_date?: string;
}

// ── Data transform ────────────────────────────────────────────────────────────

export const calculateCutListData = (fab: Fab): CalculatedCutListData => {
    const fabWithExtraFields = fab as any;

    const calculateCostOfStone = (): number => {
        if (fab.job_details?.project_value) {
            return parseFloat(fab.job_details.project_value.toString()) * 0.6;
        }
        return (fab.total_sqft || 0) * 50;
    };

    return {
        id: fab.id,
        fab_type: fab.fab_type || '',
        fab_id: String(fab.id),
        fab_id_0: '',
        job_name: fab.job_details?.name || '',
        job_no: fab.job_details?.job_number || '',
        job_id: fab.job_id,
        no_of_pcs: fabWithExtraFields.no_of_pieces || 0,
        total_sq_ft: fab.total_sqft || 0,
        wl_ln_ft: fabWithExtraFields.wj_linft || 0,
        sl_ln_ft: fabWithExtraFields.sl_linft || 0,
        edging_ln_ft: fabWithExtraFields.edging_linft || 0,
        cnc_ln_ft: fabWithExtraFields.cnc_linft || 0,
        milter_ln_ft: fabWithExtraFields.miter_linft || 0,
        saw_cut_lnft: fabWithExtraFields.saw_cut_lnft || 0,
        cost_of_stone: calculateCostOfStone(),
        revenue: fabWithExtraFields.revenue || 0,
        fp_completed: fabWithExtraFields.final_programming_complete ? 'Yes' : 'No',
        cip: '',
        install_date: fabWithExtraFields.installation_date || '',
        shop_date_schedule: fabWithExtraFields.shop_date_schedule || '',
        sales_person: fabWithExtraFields.sales_person_name || '',
        status_id: fab.status_id !== undefined ? fab.status_id : 1,
        on_hold: fab.status_id === 0,
        fab_notes: fab.fab_notes || [],
        acct_name: fab.account_name || fab.job_details?.account_id?.toString() || '',
        input_area: fab.input_area,
        stone_type_name: fab.stone_type_name,
        stone_color_name: fab.stone_color_name,
        stone_thickness_value: fab.stone_thickness_value,
        edge_name: fab.edge_name,
        final_programming_completed_date: fabWithExtraFields.final_programming_completed_date || '',
    };
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface CutListTableWithCalculationsProps {
    fabs: Fab[];
    totalCount?: number;
    fabTypes?: string[];
    salesPersons?: string[];
    path: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
    pagination?: { pageIndex: number; pageSize: number };
    setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    // ✅ searchType is now a controlled prop (owned by parent, sent to backend)
    //    Falls back to local state if not provided
    searchType?: 'fab_id' | 'job_number' | 'job_name';
    setSearchType?: (type: 'fab_id' | 'job_number' | 'job_name') => void;
    dateFilter?: string;
    setDateFilter?: (filter: string) => void;
    fabTypeFilter?: string;
    setFabTypeFilter?: (filter: string) => void;
    salesPersonFilter?: string;
    setSalesPersonFilter?: (filter: string) => void;
    dateRange?: DateRange | undefined;
    setDateRange?: (range: DateRange | undefined) => void;
    onAddNote?: (fabId: string, note: string) => void;
    onToggleSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const CutListTableWithCalculations = ({
    fabs,
    totalCount = 0,
    fabTypes = [],
    salesPersons = [],
    path,
    isSuperAdmin = false,
    isLoading,
    onRowClick,
    pagination,
    setPagination,
    searchQuery,
    setSearchQuery,
    searchType,         // ✅ from parent
    setSearchType,      // ✅ from parent
    dateFilter,
    setDateFilter,
    fabTypeFilter,
    setFabTypeFilter,
    salesPersonFilter,
    setSalesPersonFilter,
    dateRange,
    setDateRange,
    onAddNote,
    onToggleSuccess,
}: CutListTableWithCalculationsProps) => {
    const [toggleFabOnHold] = useToggleFabOnHoldMutation();

    // ── Local fallback state ──────────────────────────────────────────────────
    const [localPagination, setLocalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    // ✅ Local fallback — only used when parent does NOT pass searchType prop
    const [localSearchType, setLocalSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [localDateFilter, setLocalDateFilter] = useState<string>('all');
    const [localFabTypeFilter, setLocalFabTypeFilter] = useState<string>('all');
    const [localSalesPersonFilter, setLocalSalesPersonFilter] = useState<string>('all');
    const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedFabId, setSelectedFabId] = useState<string>('');
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});
    const [sorting, setSorting] = useState<SortingState>([]);

    // ── Effective values — prop wins over local fallback ──────────────────────
    const effectivePagination = pagination || localPagination;
    const setEffectivePagination = setPagination || setLocalPagination;
    const effectiveSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
    const setEffectiveSearchQuery = setSearchQuery || setLocalSearchQuery;
    // ✅ If parent passes searchType use it; otherwise use local fallback
    const effectiveSearchType = searchType !== undefined ? searchType : localSearchType;
    const setEffectiveSearchType = setSearchType || setLocalSearchType;
    const effectiveDateFilter = dateFilter !== undefined ? dateFilter : localDateFilter;
    const setEffectiveDateFilter = setDateFilter || setLocalDateFilter;
    const effectiveFabTypeFilter = fabTypeFilter !== undefined ? fabTypeFilter : localFabTypeFilter;
    const setEffectiveFabTypeFilter = setFabTypeFilter || setLocalFabTypeFilter;
    const effectiveSalesPersonFilter = salesPersonFilter !== undefined ? salesPersonFilter : localSalesPersonFilter;
    const setEffectiveSalesPersonFilter = setSalesPersonFilter || setLocalSalesPersonFilter;
    const effectiveDateRange = dateRange !== undefined ? dateRange : localDateRange;
    const setEffectiveDateRange = setDateRange || setLocalDateRange;

    const navigate = useNavigate();

    // ── Derived data ──────────────────────────────────────────────────────────
    const calculatedCutLists = useMemo(() => fabs.map(calculateCutListData), [fabs]);
    const uniqueFabTypes = useMemo(() => [...fabTypes].sort(), [fabTypes]);
    const uniqueSalesPersons = useMemo(() => [...salesPersons].sort(), [salesPersons]);

    // ── Filtered data (client-side safety net — backend does the real filtering) ──
    const filteredData = useMemo(() => {
        if (!calculatedCutLists || !Array.isArray(calculatedCutLists)) return [];

        let result = calculatedCutLists;

        // ✅ Typed search — mirrors what backend receives via `type` + `search` params
        if (effectiveSearchQuery) {
            const q = effectiveSearchQuery.toLowerCase();
            result = result.filter((list) => {
                if (effectiveSearchType === 'fab_id') return list.fab_id?.toLowerCase().includes(q);
                if (effectiveSearchType === 'job_number') return list.job_no?.toLowerCase().includes(q);
                if (effectiveSearchType === 'job_name') return list.job_name?.toLowerCase().includes(q);
                return false;
            });
        }

        if (effectiveDateFilter !== 'all') {
            result = result.filter((list) => {
                if (effectiveDateFilter === 'unscheduled') return !list.install_date || list.install_date === '';
                if (effectiveDateFilter === 'scheduled') return list.install_date && list.install_date !== '';
                if (!list.install_date) return false;

                const installDate = new Date(list.install_date);
                const today = new Date();

                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                const startOfNextWeek = new Date(endOfWeek);
                startOfNextWeek.setDate(endOfWeek.getDate() + 1);
                const endOfNextWeek = new Date(startOfNextWeek);
                endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1);
                const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

                switch (effectiveDateFilter) {
                    case 'today': return installDate.toDateString() === today.toDateString();
                    case 'this_week': return installDate >= startOfWeek && installDate <= endOfWeek;
                    case 'this_month': return installDate >= startOfMonth && installDate <= endOfMonth;
                    case 'next_week': return installDate >= startOfNextWeek && installDate <= endOfNextWeek;
                    case 'next_month': return installDate >= startOfNextMonth && installDate <= endOfNextMonth;
                    case 'custom':
                        if (effectiveDateRange?.from && effectiveDateRange?.to) {
                            const start = new Date(effectiveDateRange.from);
                            const end = new Date(effectiveDateRange.to);
                            end.setHours(23, 59, 59, 999);
                            return installDate >= start && installDate <= end;
                        }
                        return true;
                    default: return list.install_date?.includes(effectiveDateFilter);
                }
            });
        }

        if (effectiveFabTypeFilter !== 'all') {
            result = result.filter((list) => list.fab_type === effectiveFabTypeFilter);
        }

        if (effectiveSalesPersonFilter !== 'all') {
            if (effectiveSalesPersonFilter === 'no_sales_person') {
                result = result.filter((list) => !list.sales_person || list.sales_person === '');
            } else {
                result = result.filter((list) => list.sales_person === effectiveSalesPersonFilter);
            }
        }

        return result;
    }, [
        calculatedCutLists,
        effectiveSearchQuery,
        effectiveSearchType, // ✅ in dependency array
        effectiveDateFilter,
        effectiveFabTypeFilter,
        effectiveSalesPersonFilter,
        effectiveDateRange,
    ]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStageFilterChange = (stageValue: string) => {
        if (stageValue === 'all') return;
        const selectedStage = Object.values(JOB_STAGES).find(s => s.stage === stageValue);
        if (selectedStage) navigate(selectedStage.route);
    };

    const handleView = (id: string) => navigate(`/job/cut-list/${id}`);

    const handleAddNote = (id: string) => {
        setSelectedFabId(id);
        setIsNotesModalOpen(true);
    };

    const handleNoteSubmit = async (note: string, fabId: string) => {
        if (onAddNote) onAddNote(fabId, note);
        setIsNotesModalOpen(false);
        setSelectedFabId('');
    };

    const handleCloseNotesModal = () => {
        setIsNotesModalOpen(false);
        setSelectedFabId('');
    };

    // ── Fab info helper ───────────────────────────────────────────────────────
    const generateFabInfo = (list: CalculatedCutListData) => {
        const jobInfo: string[] = [];
        const materialInfo: string[] = [];
        const stoneInfo: string[] = [];
        if (list.acct_name) jobInfo.push(list.acct_name);
        if (list.job_name) jobInfo.push(list.job_name);
        if (list.input_area) jobInfo.push(`Area: ${list.input_area}`);
        if (list.stone_type_name) stoneInfo.push(list.stone_type_name);
        if (list.stone_color_name) stoneInfo.push(list.stone_color_name);
        if (list.stone_thickness_value) stoneInfo.push(list.stone_thickness_value);
        if (list.edge_name) materialInfo.push(list.edge_name);
        return { jobInfo, materialInfo, stoneInfo };
    };

    // ── Columns ───────────────────────────────────────────────────────────────
    const baseColumns = useMemo<ColumnDef<CalculatedCutListData>[]>(() => [
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <ActionsCell
                        row={row as any}
                        onView={() => handleView(row.original.fab_id)}
                        onAddNote={handleAddNote}
                    />
                </div>
            ),
            enableSorting: false,
            size: 120,
        },
        {
            id: 'fab_type', accessorKey: 'fab_type',
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} />,
            cell: ({ row }) => <span className="text-sm uppercase">{row.original.fab_type}</span>,
        },
        {
            id: 'fab_id', accessorKey: 'fab_id',
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
        },
        {
            id: 'job_name', accessorKey: 'job_name',
            header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
            cell: ({ row }) => <span className="text-sm truncate block max-w-[200px]">{row.original.job_name}</span>,
        },
        {
            id: 'job_no', accessorKey: 'job_no',
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
            cell: ({ row }) => row.original.job_id ? (
                <Link
                    to={`/job/details/${row.original.job_id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                    {row.original.job_no}
                </Link>
            ) : <span className="text-sm">{row.original.job_no}</span>,
        },
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} />,
            cell: ({ row }) => {
                const { jobInfo, materialInfo, stoneInfo } = generateFabInfo(row.original);
                return (
                    <div className="flex gap-4 text-xs max-w-[400px]">
                        {jobInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-gray-600" title={jobInfo.join(' - ')}>{jobInfo.join(' - ')}</div>
                                {stoneInfo.length > 0 && (
                                    <div className="truncate text-gray-600" title={stoneInfo.join(' - ')}>{stoneInfo.join(' - ')}</div>
                                )}
                            </div>
                        )}
                        {materialInfo.length > 0 && (
                            <div className="flex-1 min-w-0">
                                <div className="truncate text-gray-600" title={materialInfo.join(' - ')}>{materialInfo.join(' - ')}</div>
                            </div>
                        )}
                    </div>
                );
            },
            size: 300,
        },
        {
            id: 'fp_completed', accessorKey: 'fp_completed',
            header: ({ column }) => <DataGridColumnHeader title="FP COMPLETED DATE" column={column} />,
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.final_programming_completed_date
                        ? new Date(row.original.final_programming_completed_date).toLocaleDateString()
                        : 'Not Completed'}
                </span>
            ),
        },
        {
            id: 'no_of_pcs', accessorKey: 'no_of_pcs',
            header: ({ column }) => <DataGridColumnHeader title="NO OF PCS" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.no_of_pcs.toLocaleString()}</span>,
        },
        {
            id: 'total_sq_ft', accessorKey: 'total_sq_ft',
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQ FT" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.total_sq_ft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'wl_ln_ft', accessorKey: 'wl_ln_ft',
            header: ({ column }) => <DataGridColumnHeader title="WJ:LIN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.wl_ln_ft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'edging_ln_ft', accessorKey: 'edging_ln_ft',
            header: ({ column }) => <DataGridColumnHeader title="EDGING: LIN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.edging_ln_ft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'cnc_ln_ft', accessorKey: 'cnc_ln_ft',
            header: ({ column }) => <DataGridColumnHeader title="CNC: LIN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.cnc_ln_ft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'milter_ln_ft', accessorKey: 'milter_ln_ft',
            header: ({ column }) => <DataGridColumnHeader title="MITER:LIN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm block">{row.original.milter_ln_ft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'saw_cut_lnft', accessorKey: 'saw_cut_lnft',
            header: ({ column }) => <DataGridColumnHeader title="SAW:LIN FT" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.saw_cut_lnft?.toFixed(2) ?? '0.00'}</span>,
            enableSorting: true,
        },
        {
            id: 'cost_of_stone', accessorKey: 'cost_of_stone',
            header: ({ column }) => <DataGridColumnHeader title="COST OF STONE" column={column} />,
            cell: ({ row }) => <span className="text-sm block">${row.original.cost_of_stone.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },
        {
            id: 'revenue', accessorKey: 'revenue',
            header: ({ column }) => <DataGridColumnHeader title="REVENUE" column={column} />,
            cell: ({ row }) => <span className="text-sm block">${row.original.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
        },

        {
            id: 'cip', accessorKey: 'cip',
            header: ({ column }) => <DataGridColumnHeader title="GP" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.cip}</span>,
        },
        {
            id: 'sales_person', accessorKey: 'sales_person',
            header: ({ column }) => <DataGridColumnHeader title="SALES PERSON" column={column} />,
            cell: ({ row }) => <span className="text-sm">{row.original.sales_person || 'N/A'}</span>,
        },

        {
            id: 'fab_notes', accessorKey: 'fab_notes',
            header: ({ column }) => <DataGridColumnHeader title="Cut List Notes" column={column} />,
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes)
                    ? row.original.fab_notes
                    : Array.isArray(row.original.notes) ? row.original.notes : [];
                const cuttingNotes = fabNotes.filter(n => n.stage === 'cut_list');
                if (cuttingNotes.length === 0) return <span className="text-xs text-gray-500 italic">No notes</span>;
                const latest = cuttingNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latest.note}>
                        <div className="font-medium text-orange-700 truncate">C:</div>
                        <div className="truncate">{latest.note}</div>
                        <div className="text-gray-500 text-xs">by {latest.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        {
            id: 'on_hold',
            accessorKey: 'status_id',
            accessorFn: (row: CalculatedCutListData) => {
                if (optimisticUpdates[row.fab_id] !== undefined) return optimisticUpdates[row.fab_id];
                return row.status_id === 0;
            },
            header: ({ column }) => <DataGridColumnHeader title="ON HOLD" column={column} />,
            cell: ({ row }) => {
                const fabId = parseInt(row.original.fab_id);
                const isLoadingRow = loadingStates[fabId] || false;
                const isChecked = optimisticUpdates[row.original.fab_id] !== undefined
                    ? optimisticUpdates[row.original.fab_id]
                    : row.original.status_id === 0;
                return (
                    <div className="flex justify-center items-center">
                        <Switch
                            className={`data-[state=checked]:bg-red-600 ${isLoadingRow ? 'opacity-50 cursor-not-allowed' : ''}`}
                            checked={isChecked}
                            disabled={isLoadingRow}
                            onCheckedChange={async (checked) => {
                                if (isLoadingRow) return;
                                const fabIdStr = row.original.fab_id;
                                setOptimisticUpdates(prev => ({ ...prev, [fabIdStr]: checked }));
                                setLoadingStates(prev => ({ ...prev, [fabId]: true }));
                                try {
                                    await toggleFabOnHold({ fab_id: fabId, on_hold: checked }).unwrap();
                                    if (onToggleSuccess) onToggleSuccess();
                                    setTimeout(() => {
                                        setOptimisticUpdates(prev => { const s = { ...prev }; delete s[fabIdStr]; return s; });
                                    }, 500);
                                } catch (error) {
                                    console.error('Failed to toggle on hold status:', error);
                                    setOptimisticUpdates(prev => { const s = { ...prev }; delete s[fabIdStr]; return s; });
                                } finally {
                                    setLoadingStates(prev => { const s = { ...prev }; delete s[fabId]; return s; });
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Toggle on hold"
                        />
                        {isLoadingRow && (
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
    ], [path, optimisticUpdates, loadingStates]);

    // ── Table instance ────────────────────────────────────────────────────────
    const table = useReactTable({
        columns: baseColumns,
        data: filteredData,
        pageCount: Math.ceil(totalCount / effectivePagination.pageSize),
        state: { pagination: effectivePagination, sorting },
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function' ? updater(effectivePagination) : updater;
            setEffectivePagination(next);
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        manualPagination: true,
        manualFiltering: true,
        manualSorting: true,
        meta: {
            getRowAttributes: (row: any) => ({ 'data-fab-type': row.original.fab_type?.toLowerCase() }),
        },
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <DataGrid
                table={table}
                recordCount={totalCount}
                isLoading={isLoading}
                groupByDate={true}
                dateKey="shop_date_schedule"
                tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, cellBorder: true }}
            >
                <Card>
                    <CardHeader className="py-3.5 border-b">
                        <CardHeading>
                            <div className="flex items-center gap-2.5 flex-wrap">

                                {/* ── Typed Search ─────────────────────────────────────────────────────
                                    The Select value (effectiveSearchType) is lifted to the parent and
                                    included in buildQueryParams as `params.type` so the backend
                                    knows which field to search against.
                                ─────────────────────────────────────────────────────────────────────── */}
                                <div className="relative flex items-center">
                                    <Select
                                        value={effectiveSearchType}
                                        onValueChange={(v) =>
                                            setEffectiveSearchType(v as 'fab_id' | 'job_number' | 'job_name')
                                        }
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
                                            placeholder={`Search by ${effectiveSearchType.replace(/_/g, ' ')}`}
                                            value={effectiveSearchQuery}
                                            onChange={(e) => setEffectiveSearchQuery(e.target.value)}
                                            className="ps-9 w-[230px] h-[34px] rounded-s-none"
                                        />
                                        {effectiveSearchQuery && (
                                            <Button
                                                mode="icon"
                                                variant="ghost"
                                                className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                                onClick={() => setEffectiveSearchQuery('')}
                                            >
                                                <X />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* ── Fab Type Filter ───────────────────────────────── */}
                                <Select value={effectiveFabTypeFilter} onValueChange={setEffectiveFabTypeFilter}>
                                    <SelectTrigger className="w-[150px] h-[34px]">
                                        <SelectValue placeholder="Fab Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Fab Types</SelectItem>
                                        {uniqueFabTypes.map((type) => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* ── Date Filter ───────────────────────────────────── */}
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={effectiveDateFilter}
                                        onValueChange={(value) => {
                                            setEffectiveDateFilter(value);
                                            if (value === 'custom') setIsDatePickerOpen(false);
                                        }}
                                    >
                                        <SelectTrigger className="w-[170px] h-[34px]">
                                            <SelectValue placeholder="Install Date" />
                                        </SelectTrigger>
                                        <SelectContent className="w-48">
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="this_week">This Week</SelectItem>
                                            <SelectItem value="last_week">Last Week</SelectItem>
                                            <SelectItem value="this_month">This Month</SelectItem>
                                            <SelectItem value="last_month">Last Month</SelectItem>
                                            <SelectItem value="next_week">Next Week</SelectItem>
                                            <SelectItem value="next_month">Next Month</SelectItem>
                                            <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {effectiveDateFilter === 'custom' && (
                                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-[34px]">
                                                    <CalendarDays className="h-4 w-4 mr-2" />
                                                    {effectiveDateRange?.from ? (
                                                        effectiveDateRange.to ? (
                                                            <>{format(effectiveDateRange.from, 'MMM dd')} - {format(effectiveDateRange.to, 'MMM dd, yyyy')}</>
                                                        ) : format(effectiveDateRange.from, 'MMM dd, yyyy')
                                                    ) : <span>Pick dates</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus mode="range"
                                                    defaultMonth={tempDateRange?.from || new Date()}
                                                    selected={tempDateRange}
                                                    onSelect={setTempDateRange}
                                                    numberOfMonths={2}
                                                />
                                                <div className="flex items-center justify-end gap-1.5 border-t border-border p-3">
                                                    <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setEffectiveDateRange(undefined); }}>Reset</Button>
                                                    <Button size="sm" onClick={() => { setEffectiveDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                </div>

                                {/* ── Sales Person Filter ───────────────────────────── */}
                                <Select value={effectiveSalesPersonFilter} onValueChange={setEffectiveSalesPersonFilter}>
                                    <SelectTrigger className="w-[180px] h-[34px]">
                                        <SelectValue placeholder="Sales Person" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sales Persons</SelectItem>
                                        <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                                        {uniqueSalesPersons.map((person) => (
                                            <SelectItem key={person || 'N/A'} value={person || ''}>{person || 'N/A'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* ── Stage Filter (super admin only) ───────────────── */}
                                {isSuperAdmin && (
                                    <Select onValueChange={handleStageFilterChange}>
                                        <SelectTrigger className="w-[170px] h-[34px]">
                                            <SelectValue placeholder="Go to stage" />
                                        </SelectTrigger>
                                        <SelectContent className="w-48">
                                            <SelectItem value="all">All Stages</SelectItem>
                                            {Object.values(JOB_STAGES).map((stage) => (
                                                <SelectItem key={stage.stage} value={stage.stage}>{stage.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </CardHeading>

                        <CardToolbar>
                            <Button variant="outline" onClick={() => exportTableToCSV(table, 'CutList')}>
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>

                    <CardTable>
                        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-200px)] [&>[data-radix-scroll-area-viewport]]:pb-4">
                            <DataGridTable />
                            <ScrollBar orientation="horizontal" className="h-3 bg-gray-100 [&>div]:bg-gray-400 hover:[&>div]:bg-gray-500" />
                        </ScrollArea>
                    </CardTable>

                    <CardFooter>
                        <DataGridPagination />
                    </CardFooter>
                </Card>
            </DataGrid>

            <NotesModal
                isOpen={isNotesModalOpen}
                onClose={handleCloseNotesModal}
                fabId={selectedFabId}
                onSubmit={handleNoteSubmit}
            />
        </>
    );
};

export default CutListTableWithCalculations;