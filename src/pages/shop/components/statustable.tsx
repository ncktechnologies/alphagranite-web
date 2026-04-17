import React, { useMemo, useState, useEffect } from 'react';
import { flexRender } from '@tanstack/react-table';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    ExpandedState,
    getExpandedRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTable,
    CardToolbar,
} from '@/components/ui/card';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
    Search, CalendarDays, X, ChevronLeft, ChevronRight,
    ChevronDown, ChevronRight as ChevronRightIcon,
    EllipsisVertical, Eye, MessageSquare,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetFabsQuery, useGetFabTypesQuery } from '@/store/api/job';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import { useTableState } from '@/hooks/use-table-state';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCreateFabNoteMutation } from '@/store/api/job';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ------------------ Types ------------------
export interface ShopStatusPlan {
    plan_id: number;
    planning_section_id: number;
    plan_name: string;
    workstation_name: string;
    operator_name: string;
    estimated_hours: number;
    scheduled_start_date: string;
    work_percentage: number;
    notes: string | null;
}

export interface StageProgress {
    completed: number;
    percent: number;
    total: number;
    unit: string;
}

export interface ShopStatusFab {
    fab_id: string;
    fab_type: string;
    job_no: string;
    job_id?: number;
    job_name: string;
    acct_name?: string;
    input_area?: string;
    stone_type_name?: string;
    stone_color_name?: string;
    stone_thickness_value?: string;
    edge_name?: string;
    pieces: number;
    total_sq_ft: number;
    wj_total: number;
    edging_total: number;
    miter_total: number;
    cnc_total: number;
    cut_progress: StageProgress;
    wj_progress: StageProgress;
    edging_progress: StageProgress;
    miter_progress: StageProgress;
    cnc_progress: StageProgress;
    touchup_progress: StageProgress;
    shop_est_completion_date?: string;
    cut_date_scheduled?: string;
    install_date?: string;
    percent_complete: number;
    notes?: string | null;
    plans: ShopStatusPlan[];
    date_group: string;       // 'yyyy-MM-dd' or 'unscheduled'
    month_group: string;      // 'yyyy-MM'    or 'unscheduled'
    shop_date_schedule?: string;
}

export type ShopStatusRow = {
    type: 'fab';
    data: ShopStatusFab;
    subRows: ShopStatusRow[];
} | {
    type: 'plan';
    fab_id: string;
    plan: ShopStatusPlan;
    stage_total: number;
    stage_unit: string;
    stage_percent: number;
    date_group: string;
    subRows: ShopStatusRow[];
};

// Grouped structure used for rendering
interface DayGroup {
    dayKey: string;         // 'yyyy-MM-dd' or 'unscheduled'
    dayDisplay: string;     // e.g. 'TUESDAY, APRIL 14 2026'
    parents: ShopStatusRow[];
    totals: GroupTotals;
}

interface MonthGroup {
    monthKey: string;       // 'yyyy-MM' or 'unscheduled'
    monthDisplay: string;   // e.g. 'APRIL 2026'
    days: DayGroup[];
    totals: GroupTotals;
}

interface GroupTotals {
    pieces: number;
    sqft: number;
    wj: number;
    edging: number;
    miter: number;
    cnc: number;
}

interface ShopStatusTableProps {
    isLoading?: boolean;
}

// Mapping of planning_section_id to stage details
const stageMapping = [
    { id: 7, name: 'cut', unit: 'SF' },
    { id: 8, name: 'wj', unit: 'LF' },
    { id: 9, name: 'edging', unit: 'LF' },
    { id: 2, name: 'miter', unit: 'LF' },
    { id: 1, name: 'cnc', unit: 'LF' },
    { id: 6, name: 'touchup', unit: 'SF' },
];

const getStageInfo = (id: number) => stageMapping.find(s => s.id === id) || null;

const getTotalForStage = (fab: any, sectionId: number): number => {
    switch (sectionId) {
        case 7: return fab.total_sqft || 0;
        case 8: return fab.wj_linft || 0;
        case 9: return fab.edging_linft || 0;
        case 2: return fab.miter_linft || 0;
        case 1: return fab.cnc_linft || 0;
        case 6: return fab.total_sqft || 0;
        default: return 0;
    }
};

const emptyTotals = (): GroupTotals => ({ pieces: 0, sqft: 0, wj: 0, edging: 0, miter: 0, cnc: 0 });

const addToTotals = (acc: GroupTotals, fab: ShopStatusFab): GroupTotals => ({
    pieces:  acc.pieces  + fab.pieces,
    sqft:    acc.sqft    + fab.total_sq_ft,
    wj:      acc.wj      + fab.wj_total,
    edging:  acc.edging  + fab.edging_total,
    miter:   acc.miter   + fab.miter_total,
    cnc:     acc.cnc     + fab.cnc_total,
});

// ------------------ Progress Bar (plan rows only) ------------------
const ProgressBar: React.FC<{ total: number; percent: number; unit: string }> = ({ total, percent, unit }) => {
    const displayPercent = percent || 0;
    const barColor =
        displayPercent === 100 ? '#4caf50' :
            displayPercent >= 75 ? '#2196f3' :
                displayPercent >= 50 ? '#ff9800' :
                    displayPercent >= 25 ? '#f44336' : '#9e9e9e';

    return (
        <div className="flex flex-col gap-1 items-start min-w-[100px]">
            <p className="text-sm text-[#4b545d]">{total.toFixed(1)} {unit}</p>
            <div className="w-full bg-[#e2e4ed] rounded-full h-[6px] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(displayPercent, 100)}%`, backgroundColor: barColor }}
                />
            </div>
            <p className="text-xs text-[#4b545d]">{displayPercent.toFixed(1)}%</p>
        </div>
    );
};

// ------------------ Add Note Dialog ------------------
interface AddNoteDialogProps {
    open: boolean;
    fabId: string;
    onClose: () => void;
}

const AddNoteDialog: React.FC<AddNoteDialogProps> = ({ open, fabId, onClose }) => {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createFabNote] = useCreateFabNoteMutation();

    const handleSubmit = async () => {
        if (!note.trim()) { toast.warning('Please enter a note.'); return; }
        setIsSubmitting(true);
        try {
            await createFabNote({ fab_id: Number(fabId), note: note.trim(), stage: 'shop_status' }).unwrap();
            toast.success('Note added successfully.');
            setNote('');
            onClose();
        } catch {
            toast.error('Failed to add note.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
                <Textarea
                    placeholder="Type your note here..."
                    className="min-h-[120px] resize-none"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Note'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ------------------ Actions Cell ------------------
interface ActionsCellProps {
    fabId: string;
    onAddNote: (fabId: string) => void;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ fabId, onAddNote }) => {
    const navigate = useNavigate();
    return (
        <div className="flex items-center justify-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <EllipsisVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/shop/fab/${fabId}`); }}>
                        <Eye className="mr-2 h-4 w-4" />View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote(fabId); }}>
                        <MessageSquare className="mr-2 h-4 w-4" />Add Note
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

// ------------------ Main Component ------------------
const ShopStatusTable: React.FC<ShopStatusTableProps> = ({ isLoading: externalLoading }) => {
    const tableState = useTableState({
        tableId: 'shop-status-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: true,
    });

    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [itemsPerPage, setItemsPerPage] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // collapsed state for month groups and day groups
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
    const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

    const { pagination, setPagination, searchQuery, setSearchQuery, dateRange, setDateRange } = tableState;

    useEffect(() => {
        setCurrentPage(pagination.pageIndex + 1);
        setItemsPerPage(pagination.pageSize);
    }, [pagination]);

    const [noteDialogFabId, setNoteDialogFabId] = useState<string | null>(null);

    const queryParams = useMemo(() => ({
        current_stage: 'shop',
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
    }), [searchQuery, fabTypeFilter, currentPage, itemsPerPage]);

    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);
    const { data: fabTypesData } = useGetFabTypesQuery();

    const fabTypes = useMemo(() => {
        if (!fabTypesData) return [];
        let rawData: any[] = [];
        if (Array.isArray(fabTypesData)) rawData = fabTypesData;
        else if (typeof fabTypesData === 'object' && 'data' in fabTypesData) rawData = (fabTypesData as any).data || [];
        const extractName = (item: { name: string } | string) =>
            typeof item === 'string' ? item : (typeof item === 'object' && item !== null ? item.name || String(item) : String(item));
        return rawData.map(extractName);
    }, [fabTypesData]);

    const fabs = useMemo(() => {
        if (!fabsData) return [];
        return Array.isArray(fabsData.data) ? fabsData.data : [];
    }, [fabsData]);

    const totalRecords = fabsData?.total || 0;

    const fabTypeColorMap: Record<string, string> = {
        standard: '#9eeb47',
        'fab only': '#5bd1d7',
        'cust redo': '#f0bf4c',
        resurface: '#d094ea',
        'fast track': '#f59794',
        'ag redo': '#f5cc94',
    };

    const getFabColor = (fabType: string | undefined): string => {
        if (!fabType) return '#e2e4ed';
        return fabTypeColorMap[fabType.toLowerCase()] || '#e2e4ed';
    };

    const stageColumnIds = new Set(['cut', 'wj', 'edging', 'miter', 'cnc', 'touchup', 'percent_complete']);

    const getStagePercent = (fab: ShopStatusFab, columnId: string): number => {
        switch (columnId) {
            case 'cut': return fab.cut_progress.percent;
            case 'wj': return fab.wj_progress.percent;
            case 'edging': return fab.edging_progress.percent;
            case 'miter': return fab.miter_progress.percent;
            case 'cnc': return fab.cnc_progress.percent;
            case 'touchup': return fab.touchup_progress.percent;
            case 'percent_complete': return fab.percent_complete;
            default: return 0;
        }
    };

    // ------------------ Transform API data → ShopStatusRow tree ------------------
    const tableData: ShopStatusRow[] = useMemo(() => {
        return fabs.map((fab: any): ShopStatusRow => {
            const rawDate = fab.shop_est_completion_date || fab.estimated_completion_date || fab.shop_date_schedule || fab.installation_date;
            const dayKey   = rawDate ? format(new Date(rawDate), 'yyyy-MM-dd') : 'unscheduled';
            const monthKey = rawDate ? format(new Date(rawDate), 'yyyy-MM')    : 'unscheduled';

            const getPlanPercent = (sectionId: number): number => {
                const plan = (fab.plans || []).find((p: any) => p.planning_section_id === sectionId);
                return plan?.work_percentage || 0;
            };

            const buildProgress = (sectionId: number): StageProgress => {
                const info = getStageInfo(sectionId);
                const unit = info?.unit || 'SF';
                const total = getTotalForStage(fab, sectionId);
                const percent = getPlanPercent(sectionId);
                return { completed: total * (percent / 100), percent, total, unit };
            };

            const fabData: ShopStatusFab = {
                fab_id: String(fab.id),
                fab_type: fab.fab_type || 'N/A',
                job_no: fab.job_details?.job_number || 'N/A',
                job_id: fab.job_details?.id || undefined,
                job_name: fab.job_details?.name || 'N/A',
                acct_name: fab.account_name,
                input_area: fab.input_area,
                stone_type_name: fab.stone_type_name,
                stone_color_name: fab.stone_color_name,
                stone_thickness_value: fab.stone_thickness_value,
                edge_name: fab.edge_name,
                pieces: fab.no_of_pieces || 0,
                total_sq_ft: fab.total_sqft || 0,
                wj_total: fab.wj_linft || 0,
                edging_total: fab.edging_linft || 0,
                miter_total: fab.miter_linft || 0,
                cnc_total: fab.cnc_linft || 0,
                cut_progress: buildProgress(7),
                wj_progress: buildProgress(8),
                edging_progress: buildProgress(9),
                miter_progress: buildProgress(2),
                cnc_progress: buildProgress(1),
                touchup_progress: buildProgress(6),
                shop_est_completion_date: fab.shop_est_completion_date || fab.estimated_completion_date,
                cut_date_scheduled: (fab.plans || []).find((p: any) => p.planning_section_id === 7)?.scheduled_start_date,
                install_date: fab.installation_date,
                percent_complete: fab.percent_complete || 0,
                notes: fab.notes ? (Array.isArray(fab.notes) ? fab.notes.join(', ') : fab.notes) : null,
                plans: fab.plans || [],
                date_group: dayKey,
                month_group: monthKey,
                shop_date_schedule: fab.shop_date_schedule,
            };

            const subRows: ShopStatusRow[] = (fab.plans || []).map((plan: any): ShopStatusRow => {
                const stageInfo = getStageInfo(plan.planning_section_id);
                return {
                    type: 'plan',
                    fab_id: String(fab.id),
                    plan: {
                        plan_id: plan.id,
                        planning_section_id: plan.planning_section_id,
                        plan_name: plan.plan_name || stageInfo?.name?.toUpperCase() || 'PLAN',
                        workstation_name: plan.workstation_name || '-',
                        operator_name: plan.operator_name || '-',
                        estimated_hours: plan.estimated_hours || 0,
                        scheduled_start_date: plan.scheduled_start_date,
                        work_percentage: plan.work_percentage || 0,
                        notes: plan.notes,
                    },
                    stage_total: getTotalForStage(fab, plan.planning_section_id),
                    stage_unit: stageInfo?.unit || 'SF',
                    stage_percent: plan.work_percentage || 0,
                    date_group: dayKey,
                    subRows: [],
                };
            });

            return { type: 'fab', data: fabData, subRows };
        });
    }, [fabs]);

    // ------------------ Client-side Filtering ------------------
    const filteredData = useMemo(() => {
        let result = tableData;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.type === 'fab' && (
                    r.data.job_no.toLowerCase().includes(q) ||
                    r.data.fab_id.toLowerCase().includes(q) ||
                    (r.data.acct_name && r.data.acct_name.toLowerCase().includes(q)) ||
                    (r.data.job_name && r.data.job_name.toLowerCase().includes(q))
                )
            );
        }
        if (fabTypeFilter !== 'all') {
            result = result.filter(r =>
                r.type === 'fab' && r.data.fab_type.toLowerCase() === fabTypeFilter.toLowerCase()
            );
        }
        if (dateRange?.from && dateRange?.to) {
            const start = startOfDay(dateRange.from);
            const end = startOfDay(dateRange.to);
            end.setHours(23, 59, 59, 999);
            result = result.filter(r => {
                if (r.type !== 'fab' || !r.data.shop_est_completion_date) return false;
                const d = new Date(r.data.shop_est_completion_date);
                return d >= start && d <= end;
            });
        }
        return result;
    }, [tableData, searchQuery, fabTypeFilter, dateRange]);

    // ------------------ Build two-level month → day grouping ------------------
    const monthGroups = useMemo((): MonthGroup[] => {
        // Build month map preserving insertion order (sorted by monthKey)
        const monthMap = new Map<string, Map<string, ShopStatusRow[]>>();

        filteredData.forEach(row => {
            if (row.type !== 'fab') return;
            const mk = row.data.month_group;
            const dk = row.data.date_group;
            if (!monthMap.has(mk)) monthMap.set(mk, new Map());
            const dayMap = monthMap.get(mk)!;
            if (!dayMap.has(dk)) dayMap.set(dk, []);
            dayMap.get(dk)!.push(row);
        });

        // Sort month keys (unscheduled goes last)
        const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => {
            if (a === 'unscheduled') return 1;
            if (b === 'unscheduled') return -1;
            return a.localeCompare(b);
        });

        return sortedMonthKeys.map(mk => {
            const dayMap = monthMap.get(mk)!;

            // Sort day keys within each month
            const sortedDayKeys = Array.from(dayMap.keys()).sort((a, b) => {
                if (a === 'unscheduled') return 1;
                if (b === 'unscheduled') return -1;
                return a.localeCompare(b);
            });

            let monthTotals = emptyTotals();

            const days: DayGroup[] = sortedDayKeys.map(dk => {
                const parents = dayMap.get(dk)!;
                let dayTotals = emptyTotals();
                parents.forEach(p => {
                    if (p.type === 'fab') dayTotals = addToTotals(dayTotals, p.data);
                });
                monthTotals = {
                    pieces:  monthTotals.pieces  + dayTotals.pieces,
                    sqft:    monthTotals.sqft    + dayTotals.sqft,
                    wj:      monthTotals.wj      + dayTotals.wj,
                    edging:  monthTotals.edging  + dayTotals.edging,
                    miter:   monthTotals.miter   + dayTotals.miter,
                    cnc:     monthTotals.cnc     + dayTotals.cnc,
                };

                const dayDisplay = dk !== 'unscheduled'
                    ? format(new Date(dk), 'EEEE, MMMM d yyyy').toUpperCase()
                    : 'UNSCHEDULED';

                return { dayKey: dk, dayDisplay, parents, totals: dayTotals };
            });

            const monthDisplay = mk !== 'unscheduled'
                ? format(new Date(mk + '-01'), 'MMMM yyyy').toUpperCase()
                : 'UNSCHEDULED';

            return { monthKey: mk, monthDisplay, days, totals: monthTotals };
        });
    }, [filteredData]);

    // ------------------ Overall totals ------------------
    const overallTotals = useMemo((): GroupTotals => {
        return filteredData.reduce((acc, row) => {
            if (row.type !== 'fab') return acc;
            return addToTotals(acc, row.data);
        }, emptyTotals());
    }, [filteredData]);

    // ------------------ Column Definitions ------------------
    const columns = useMemo<ColumnDef<ShopStatusRow>[]>(() => [
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => {
                if (row.original.type === 'fab' && row.original.subRows.length > 0) {
                    return (
                        <button onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }} className="p-1 hover:bg-gray-100 rounded">
                            {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                        </button>
                    );
                }
                return <div className="w-6" />;
            },
            size: 36,
        },
        {
            id: 'actions',
            header: () => null,
            cell: ({ row }) => {
                if (row.original.type !== 'fab') return null;
                return <ActionsCell fabId={row.original.data.fab_id} onAddNote={(id) => setNoteDialogFabId(id)} />;
            },
            size: 48,
        },
        {
            id: 'estimated_completion_date',
            accessorFn: (r) => r.type === 'fab' ? r.data.shop_est_completion_date : null,
            header: ({ column }) => <DataGridColumnHeader title="EST. COMPLETION DATE" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const date = row.original.data.shop_est_completion_date;
                    return <span className="text-sm text-[#4b545d]">{date ? format(new Date(date), 'MM/dd/yyyy') : '-'}</span>;
                }
                if (row.original.type === 'plan') {
                    return <span className="text-xs text-gray-500 pl-4">{row.original.plan.plan_name} · {row.original.plan.workstation_name} · {row.original.plan.operator_name}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 230,
        },
        {
            id: 'cut_date_scheduled',
            accessorFn: (r) => r.type === 'fab' ? r.data.cut_date_scheduled : null,
            header: ({ column }) => <DataGridColumnHeader title="CUT DATE SCHEDULED" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const date = row.original.data.shop_date_schedule;
                    return <span className="text-sm text-[#4b545d]">{date ? format(new Date(date), 'MM/dd/yyyy') : '-'}</span>;
                }
                if (row.original.type === 'plan') {
                    const date = row.original.plan.scheduled_start_date;
                    return <span className="text-xs text-gray-500 pl-4">{date ? format(new Date(date), 'MM/dd/yyyy') : '-'}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 160,
        },
        {
            id: 'install_date',
            accessorFn: (r) => r.type === 'fab' ? r.data.install_date : null,
            header: ({ column }) => <DataGridColumnHeader title="INSTALL DATE" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const date = row.original.data.install_date;
                    return <span className="text-sm text-[#4b545d]">{date ? format(new Date(date), 'MM/dd/yyyy') : '-'}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 130,
        },
        {
            id: 'fab_type',
            accessorFn: (r) => r.type === 'fab' ? r.data.fab_type : null,
            header: ({ column }) => <DataGridColumnHeader title="FAB TYPE" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') return <span className="text-sm text-[#4b545d] whitespace-nowrap">{row.original.data.fab_type}</span>;
                return null;
            },
            enableSorting: true,
            size: 130,
        },
        {
            id: 'fab_id',
            accessorFn: (r) => r.type === 'fab' ? r.data.fab_id : null,
            header: ({ column }) => <DataGridColumnHeader title="FAB ID" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return (
                        <Link to={`/sales/${row.original.data.fab_id}`} className="text-sm text-[#4b545d] hover:underline cursor-pointer">
                            {row.original.data.fab_id}
                        </Link>
                    );
                }
                return null;
            },
            enableSorting: true,
            size: 100,
        },
        {
            id: 'job_no',
            accessorFn: (r) => r.type === 'fab' ? r.data.job_no : null,
            header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return row.original.data.job_id ? (
                        <Link to={`/job/details/${row.original.data.job_id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                            {row.original.data.job_no}
                        </Link>
                    ) : (
                        <span className="text-sm text-[#4b545d]">{row.original.data.job_no}</span>
                    );
                }
                return null;
            },
            enableSorting: true,
            size: 100,
        },
        {
            id: 'fab_info',
            header: ({ column }) => <DataGridColumnHeader title="FAB INFO" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const f = row.original.data;
                    const jobInfo = [f.acct_name, f.job_name].filter(Boolean);
                    const stoneInfo = [f.stone_type_name, f.stone_color_name, f.stone_thickness_value].filter(Boolean);
                    const materialInfo = [f.input_area ? `Area: ${f.input_area}` : '', f.edge_name || ''].filter(Boolean);
                    return (
                        <div className="flex gap-4 text-xs max-w-[400px]">
                            {(jobInfo.length > 0 || stoneInfo.length > 0) && (
                                <div className="flex-1 min-w-0">
                                    {jobInfo.length > 0 && <div className="truncate text-gray-600" title={jobInfo.join(' - ')}>{jobInfo.join(' - ')}</div>}
                                    {stoneInfo.length > 0 && <div className="truncate text-gray-600" title={stoneInfo.join(' - ')}>{stoneInfo.join(' - ')}</div>}
                                </div>
                            )}
                            {materialInfo.length > 0 && (
                                <div className="flex-1 min-w-0">
                                    {materialInfo.map((info, idx) => <div key={idx} className="truncate text-gray-600">{info}</div>)}
                                </div>
                            )}
                        </div>
                    );
                }
                if (row.original.type === 'plan') {
                    return <span className="text-xs text-gray-400 pl-4">Estimated hrs: {row.original.plan.estimated_hours}h</span>;
                }
                return null;
            },
            size: 400,
        },
        {
            id: 'pieces',
            accessorFn: (r) => r.type === 'fab' ? r.data.pieces : null,
            header: ({ column }) => <DataGridColumnHeader title="NO. OF PIECES" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') return <span className="text-sm text-[#4b545d]">{row.original.data.pieces}</span>;
                return null;
            },
            enableSorting: true,
            size: 130,
        },
        {
            id: 'total_sq_ft',
            accessorFn: (r) => r.type === 'fab' ? r.data.total_sq_ft : null,
            header: ({ column }) => <DataGridColumnHeader title="TOTAL SQ FT" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') return <span className="text-sm text-[#4b545d]">{row.original.data.total_sq_ft.toFixed(1)}</span>;
                return null;
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: 'cut',
            header: ({ column }) => <DataGridColumnHeader title="CUT" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.cut_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 7) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'wj',
            header: ({ column }) => <DataGridColumnHeader title="WJ" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.wj_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 8) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'edging',
            header: ({ column }) => <DataGridColumnHeader title="EDGING" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.edging_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 9) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'miter',
            header: ({ column }) => <DataGridColumnHeader title="MITER" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.miter_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 2) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'cnc',
            header: ({ column }) => <DataGridColumnHeader title="CNC" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.cnc_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 1) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'touchup',
            header: ({ column }) => <DataGridColumnHeader title="TOUCHUP QA" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.touchup_progress;
                    return <div className="flex flex-col items-start leading-tight"><span className="text-sm text-[#4b545d]">{p.total.toFixed(1)} {p.unit}</span><span className="text-xs text-[#4b545d]">{p.percent.toFixed(1)}%</span></div>;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 6) {
                    return <ProgressBar total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'percent_complete',
            accessorFn: (r) => r.type === 'fab' ? r.data.percent_complete : null,
            header: ({ column }) => <DataGridColumnHeader title="% COMPLETE" column={column} className="text-[#7c8689] text-[15px] font-normal" />,
            cell: ({ row }) => {
                if (row.original.type === 'fab') return <span className="text-sm text-[#4b545d]">{row.original.data.percent_complete.toFixed(2)}%</span>;
                if (row.original.type === 'plan') return <span className="text-xs text-gray-500">{row.original.stage_percent.toFixed(1)}%</span>;
                return null;
            },
            enableSorting: true,
            size: 120,
        },
    ], []);

    // ------------------ Table Instance ------------------
    const table = useReactTable({
        columns,
        data: filteredData,
        pageCount: Math.ceil(totalRecords / itemsPerPage),
        getRowId: (row) =>
            row.type === 'fab' ? row.data.fab_id : `plan-${row.fab_id}-${row.plan.plan_id}`,
        state: {
            pagination: { pageIndex: currentPage - 1, pageSize: itemsPerPage },
            sorting,
            expanded,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function'
                ? updater({ pageIndex: currentPage - 1, pageSize: itemsPerPage })
                : updater;
            setCurrentPage(next.pageIndex + 1);
            setItemsPerPage(next.pageSize);
        },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSubRows: (row) => row.type === 'fab' && row.subRows.length > 0 ? row.subRows : undefined,
        manualPagination: true,
    });

    // ------------------ Pagination helpers ------------------
    const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
    const startItem = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalRecords);

    const pageNumbers = useMemo(() => {
        const half = 2;
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, currentPage + half);
        if (end - start < 4) {
            if (start === 1) end = Math.min(totalPages, start + 4);
            else start = Math.max(1, end - 4);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [currentPage, totalPages]);

    // ------------------ Helper: render a totals row ------------------
    const renderTotalsRow = (
        label: string,
        totals: GroupTotals,
        bgClass = 'bg-[#f9f9f9]',
        labelColId = 'estimated_completion_date',
    ) => (
        <tr className={`${bgClass} font-medium border-b border-[#e2e4ed]`}>
            {table.getVisibleFlatColumns().map(col => {
                const id = col.id;
                const td = (content: React.ReactNode) => (
                    <td key={id} className="px-4 py-2 text-sm font-semibold text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0">
                        {content}
                    </td>
                );
                if (id === 'expander' || id === 'actions') return <td key={id} className="px-4 py-2 border-r border-[#e2e4ed]" />;
                if (id === labelColId) return td(label);
                if (id === 'pieces')      return td(totals.pieces);
                if (id === 'total_sq_ft') return td(`${totals.sqft.toFixed(1)} SF`);
                if (id === 'wj')          return td(`${totals.wj.toFixed(1)} LF`);
                if (id === 'edging')      return td(`${totals.edging.toFixed(1)} LF`);
                if (id === 'miter')       return td(`${totals.miter.toFixed(1)} LF`);
                if (id === 'cnc')         return td(`${totals.cnc.toFixed(1)} LF`);
                return <td key={id} className="px-4 py-2 border-r border-[#e2e4ed] last:border-r-0" />;
            })}
        </tr>
    );

    const isLoading = isApiLoading || externalLoading;

    // Toggle helpers
    const toggleMonth = (mk: string) => setCollapsedMonths(prev => {
        const next = new Set(prev);
        next.has(mk) ? next.delete(mk) : next.add(mk);
        return next;
    });

    const toggleDay = (dk: string) => setCollapsedDays(prev => {
        const next = new Set(prev);
        next.has(dk) ? next.delete(dk) : next.add(dk);
        return next;
    });

    const colCount = table.getVisibleFlatColumns().length;

    // ------------------ Render ------------------
    return (
        <>
            <DataGrid
                table={table}
                recordCount={totalRecords}
                isLoading={isLoading}
                groupByDate={false}
                tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}
            >
                <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)]">

                    {/* ---- Filters ---- */}
                    <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-[#e2e4ed] px-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select value={searchType} onValueChange={(value: 'fab_id' | 'job_number' | 'job_name') => setSearchType(value)}>
                                <SelectTrigger className="w-[140px] h-[34px] border-[#e2e4ed] focus-visible:ring-0">
                                    <SelectValue placeholder="Search by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fab_id">FAB ID</SelectItem>
                                    <SelectItem value="job_number">Job Number</SelectItem>
                                    <SelectItem value="job_name">Job Name</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="relative">
                                <Search className="size-4 text-[#7c8689] absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder={`Search by ${searchType.replace('_', ' ')}`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[280px] h-[34px] border-[#e2e4ed] focus-visible:ring-0"
                                    disabled={isLoading}
                                />
                                {searchQuery && (
                                    <Button size="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn('w-[210px] h-[34px] justify-start text-left font-normal border-[#e2e4ed]', !dateRange && 'text-muted-foreground')} disabled={isLoading}>
                                        <CalendarDays className="mr-2 h-4 w-4 text-[#7c8689]" />
                                        {dateRange?.from ? (
                                            dateRange.to
                                                ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                                                : format(dateRange.from, 'MMM dd, yyyy')
                                        ) : <span>Pick dates</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from || new Date()} selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                                    <div className="flex items-center justify-end gap-1.5 border-t border-[#e2e4ed] p-3">
                                        <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); setDateRange(undefined); }}>Reset</Button>
                                        <Button size="sm" onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}>Apply</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter} disabled={isLoading}>
                                <SelectTrigger className="w-auto h-[34px] border-[#e2e4ed]">
                                    <SelectValue placeholder="FAB type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {fabTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <CardToolbar className="flex gap-4">
                            <Button variant="outline" onClick={() => exportTableToCSV(table, 'shop-status')} disabled={isLoading} className="h-[34px] border-[#e2e4ed] text-[#4b545d]">
                                Export CSV
                            </Button>
                        </CardToolbar>
                    </CardHeader>

                    {/* ---- Table Body ---- */}
                    <CardTable>
                        <ScrollArea className="h-[calc(100vh-280px)]">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <p className="text-[#7c8689]">Loading…</p>
                                </div>
                            ) : (
                                <table className="w-full border-collapse table-fixed">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        {table.getHeaderGroups().map(hg => (
                                            <tr key={hg.id}>
                                                {hg.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        className="px-4 py-2 text-left text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 whitespace-normal relative"
                                                        style={{ 
                                                            width: header.getSize(),
                                                            minWidth: header.getSize(),
                                                            maxWidth: header.getSize()
                                                        }}
                                                    >
                                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                                        {/* Overall totals */}
                                        {renderTotalsRow('ALL TOTALS', overallTotals, 'bg-[#eef0f6]')}

                                        {monthGroups.map(monthGroup => {
                                            const monthCollapsed = collapsedMonths.has(monthGroup.monthKey);

                                            return (
                                                <React.Fragment key={monthGroup.monthKey}>
                                                    {/* ── Month header row ── */}
                                                    

                                                    {/* ── Month totals row ── */}
                                                    {!monthCollapsed && renderTotalsRow(
                                                        `${monthGroup.monthDisplay} `,
                                                        monthGroup.totals,
                                                        'bg-[#f0f7e0] text-[11px] font-medium',
                                                    )}

                                                    {!monthCollapsed && monthGroup.days.map(dayGroup => {
                                                        const dayCollapsed = collapsedDays.has(dayGroup.dayKey);

                                                        return (
                                                            <React.Fragment key={dayGroup.dayKey}>
                                                                {/* ── Day header row ── */}
                                                                {/* <tr
                                                                    className="bg-[#F6FFE7] cursor-pointer select-none hover:bg-[#edffd4] transition-colors"
                                                                    onClick={() => toggleDay(dayGroup.dayKey)}
                                                                >
                                                                    <td className="px-4 py-2" colSpan={colCount}>
                                                                        <div className="flex items-center gap-2 pl-4">
                                                                            {dayCollapsed
                                                                                ? <ChevronRightIcon className="h-3.5 w-3.5 text-[#7a9705]" />
                                                                                : <ChevronDown className="h-3.5 w-3.5 text-[#7a9705]" />}
                                                                            <span className="text-xs font-semibold text-[#4b545d]">
                                                                                {dayGroup.dayDisplay}
                                                                            </span>
                                                                            <span className="text-xs text-[#7c8689] ml-1">
                                                                                ({dayGroup.parents.length} FAB{dayGroup.parents.length !== 1 ? 's' : ''})
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </tr> */}

                                                                {/* ── Day totals row ── */}
                                                                {!dayCollapsed && renderTotalsRow(
                                                                    `${dayGroup.dayDisplay} `,
                                                                    dayGroup.totals,
                                                                    'bg-[#f9f9f9] text-[10px]',
                                                                )}

                                                                {/* ── FAB rows for this day ── */}
                                                                {!dayCollapsed && dayGroup.parents.map(parent => {
                                                                    if (parent.type !== 'fab') return null;

                                                                    const parentRow = table.getRowModel().rows.find(
                                                                        r => r.original.type === 'fab' && r.original.data.fab_id === parent.data.fab_id
                                                                    );
                                                                    if (!parentRow) return null;

                                                                    return (
                                                                        <React.Fragment key={parentRow.id}>
                                                                            {(() => {
                                                                                const rowBgColor = parentRow.original.type === 'fab'
                                                                                    ? getFabColor(parentRow.original.data.fab_type)
                                                                                    : 'transparent';

                                                                                return (
                                                                                    <>
                                                                                        <tr className="border-b border-[#e2e4ed] transition-colors">
                                                                                            {parentRow.getVisibleCells().map(cell => {
                                                                                                const columnId = cell.column.id;
                                                                                                let cellStyle = {};
                                                                                                
                                                                                                if (parentRow.original.type === 'fab') {
                                                                                                    if (stageColumnIds.has(columnId)) {
                                                                                                        // Stage columns: gradient based on individual stage progress
                                                                                                        const percent = getStagePercent(parentRow.original.data, columnId);
                                                                                                        const bgColor = getFabColor(parentRow.original.data.fab_type);
                                                                                                        cellStyle = {
                                                                                                            background: `linear-gradient(to right, ${bgColor} 0%, ${bgColor} ${percent}%, white ${percent}%, white 100%)`,
                                                                                                        };
                                                                                                    } else {
                                                                                                        // Non-stage columns: solid fab_type color
                                                                                                        cellStyle = {
                                                                                                            backgroundColor: rowBgColor,
                                                                                                        };
                                                                                                    }
                                                                                                }
                                                                                                
                                                                                                return (
                                                                                                    <td
                                                                                                        key={cell.id}
                                                                                                        className="px-4 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                                                                        style={cellStyle}
                                                                                                    >
                                                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                                                    </td>
                                                                                                );
                                                                                            })}
                                                                                        </tr>

                                                                                        {/* Child plan rows */}
                                                                                        {parentRow.getIsExpanded() && parentRow.subRows.map(childRow => (
                                                                                            <tr key={childRow.id} className="border-b border-[#e2e4ed] bg-gray-50/60">
                                                                                                {childRow.getVisibleCells().map(cell => (
                                                                                                    <td key={cell.id} className="px-4 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0">
                                                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                                                    </td>
                                                                                                ))}
                                                                                            </tr>
                                                                                        ))}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}

                                        {filteredData.length === 0 && (
                                            <tr>
                                                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-[#7c8689]">
                                                    No records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardTable>

                    {/* ---- Pagination Footer ---- */}
                    <CardFooter className="flex items-center justify-between px-5 py-3 border-t border-[#e2e4ed]">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[#7c8689]">Show</span>
                            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="h-8 w-[70px] border-[#dbdfe9] bg-[#f9f9f9] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-sm text-[#7c8689]">per page</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-[#7c8689]">{startItem}–{endItem} of {totalRecords}</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                                    <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {pageNumbers.map(page => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? 'default' : 'ghost'}
                                        size="icon"
                                        className={cn('h-8 w-8 text-sm', currentPage === page ? 'bg-[#e2e4ed] text-[#4b545d] hover:bg-[#e2e4ed]' : 'text-[#7c8689]')}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
                                    <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-3" />
                                </Button>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            </DataGrid>

            {noteDialogFabId && (
                <AddNoteDialog open={!!noteDialogFabId} fabId={noteDialogFabId} onClose={() => setNoteDialogFabId(null)} />
            )}
        </>
    );
};

export { ShopStatusTable };