import React, { useMemo, useState } from 'react';
import { flexRender } from '@tanstack/react-table';
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    PaginationState,
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
import { Search, CalendarDays, X, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGetFabsQuery } from '@/store/api/job';

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
    expected_completion_date?: string;
    cut_date_scheduled?: string;
    install_date?: string;
    percent_complete: number;
    notes?: string | null;
    plans: ShopStatusPlan[];
    date_group: string;
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
    stage_total: number;   // raw value from backend (e.g. edging_linft)
    stage_unit: string;
    stage_percent: number;
    date_group: string;
    subRows: ShopStatusRow[];
};

interface ShopStatusTableProps {
    isLoading?: boolean;
}

const salesPersons: string[] = ['Mike Rodriguez', 'Sarah Johnson', 'Bruno Pires', 'Maria Garcia'];

// Mapping of planning_section_id to stage details
const stageMapping = [
    { id: 7, name: 'cut',     unit: 'SF' },
    { id: 8, name: 'wj',      unit: 'LF' },
    { id: 9, name: 'edging',  unit: 'LF' },
    { id: 2, name: 'miter',   unit: 'LF' },
    { id: 1, name: 'cnc',     unit: 'LF' },
    { id: 6, name: 'touchup', unit: 'SF' },
];

const getStageInfo = (id: number) => stageMapping.find(s => s.id === id) || null;

// Get the total value from a raw fab object for a given planning section
const getTotalForStage = (fab: any, sectionId: number): number => {
    switch (sectionId) {
        case 7: return fab.total_sqft   || 0;
        case 8: return fab.wj_linft     || 0;
        case 9: return fab.edging_linft || 0;
        case 2: return fab.miter_linft  || 0;
        case 1: return fab.cnc_linft    || 0;
        case 6: return fab.total_sqft   || 0;
        default: return 0;
    }
};

// ------------------ Progress Bar ------------------
// `total`   = raw value from backend (e.g. edging_linft, cnc_linft) — displayed as the number
// `percent` = work_percentage from the plan — drives the bar fill
const ProgressBar: React.FC<{ value: number; total: number; percent: number; unit: string }> = ({
    // value kept in props signature for call-site compatibility but not used in display
    total,
    percent,
    unit,
}) => {
    const displayPercent = percent || 0;
    const barColor =
        displayPercent === 100 ? '#4caf50' :
        displayPercent >= 75   ? '#2196f3' :
        displayPercent >= 50   ? '#ff9800' :
        displayPercent >= 25   ? '#f44336' : '#9e9e9e';

    return (
        <div className="flex flex-col gap-1 items-start min-w-[100px]">
            <p className="text-sm text-[#4b545d]">
                {total.toFixed(1)} {unit}
            </p>
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

// ------------------ Main Component ------------------
const ShopStatusTable: React.FC<ShopStatusTableProps> = ({ isLoading: externalLoading }) => {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [itemsPerPage, setItemsPerPage] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const queryParams = useMemo(() => ({
        current_stage: 'cut_list',
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(fabTypeFilter !== 'all' && { fab_type: fabTypeFilter }),
    }), [searchQuery, fabTypeFilter, currentPage, itemsPerPage]);

    const { data: fabsData, isLoading: isApiLoading } = useGetFabsQuery(queryParams);

    // fabsData is already shaped as { data: Fab[], total: number } by transformResponse
    const fabs = useMemo(() => {
        if (!fabsData) return [];
        return Array.isArray(fabsData.data) ? fabsData.data : [];
    }, [fabsData]);

    const totalRecords = fabsData?.total || 0;

    // ------------------ Transform API data → ShopStatusRow tree ------------------
    const tableData: ShopStatusRow[] = useMemo(() => {
        return fabs.map((fab: any): ShopStatusRow => {
            const expectedDate = fab.shop_date_schedule || fab.installation_date;
            const dateGroup = expectedDate
                ? format(new Date(expectedDate), 'yyyy-MM')
                : 'unscheduled';

            // Returns the work_percentage for a given planning section from this fab's plans
            const getPlanPercent = (sectionId: number): number => {
                const plan = (fab.plans || []).find((p: any) => p.planning_section_id === sectionId);
                return plan?.work_percentage || 0;
            };

            // Builds a StageProgress object for a section
            const buildProgress = (sectionId: number): StageProgress => {
                const info = getStageInfo(sectionId);
                const unit = info?.unit || 'SF';
                const total = getTotalForStage(fab, sectionId);
                const percent = getPlanPercent(sectionId);
                const completed = total * (percent / 100);
                return { completed, percent, total, unit };
            };

            const fabData: ShopStatusFab = {
                fab_id:               String(fab.id),
                fab_type:             fab.fab_type || 'N/A',
                job_no:               fab.job_details?.job_number || 'N/A',
                job_name:             fab.job_details?.name || 'N/A',
                acct_name:            fab.account_name,
                input_area:           fab.input_area,
                stone_type_name:      fab.stone_type_name,
                stone_color_name:     fab.stone_color_name,
                stone_thickness_value: fab.stone_thickness_value,
                edge_name:            fab.edge_name,
                pieces:               fab.no_of_pieces || 0,
                total_sq_ft:          fab.total_sqft || 0,
                // Raw linft totals (used for group/overall totals)
                wj_total:             fab.wj_linft     || 0,
                edging_total:         fab.edging_linft || 0,
                miter_total:          fab.miter_linft  || 0,
                cnc_total:            fab.cnc_linft    || 0,
                // Progress per stage
                cut_progress:     buildProgress(7),
                wj_progress:      buildProgress(8),
                edging_progress:  buildProgress(9),
                miter_progress:   buildProgress(2),
                cnc_progress:     buildProgress(1),
                touchup_progress: buildProgress(6),
                // Dates
                expected_completion_date: expectedDate,
                cut_date_scheduled: (fab.plans || []).find((p: any) => p.planning_section_id === 7)?.scheduled_start_date,
                install_date: fab.installation_date,
                percent_complete: fab.percent_complete || 0,
                notes: fab.notes
                    ? (Array.isArray(fab.notes) ? fab.notes.join(', ') : fab.notes)
                    : null,
                plans: fab.plans || [],
                date_group: dateGroup,
                shop_date_schedule: fab.shop_date_schedule,
            };

            // Build child rows for each plan
            const subRows: ShopStatusRow[] = (fab.plans || []).map((plan: any): ShopStatusRow => {
                const stageInfo = getStageInfo(plan.planning_section_id);
                const unit = stageInfo?.unit || 'SF';
                const total = getTotalForStage(fab, plan.planning_section_id);
                const percent = plan.work_percentage || 0;
                const completed = total * (percent / 100);

                return {
                    type: 'plan',
                    fab_id: String(fab.id),
                    plan: {
                        plan_id:              plan.id,
                        planning_section_id:  plan.planning_section_id,
                        plan_name:            plan.plan_name || stageInfo?.name?.toUpperCase() || 'PLAN',
                        workstation_name:     plan.workstation_name || '-',
                        operator_name:        plan.operator_name || '-',
                        estimated_hours:      plan.estimated_hours || 0,
                        scheduled_start_date: plan.scheduled_start_date,
                        work_percentage:      percent,
                        notes:                plan.notes,
                    },
                    stage_total:   total,
                    stage_unit:    unit,
                    stage_percent: percent,
                    date_group:    dateGroup,
                    subRows: [],   // plans have no children
                };
            });

            return {
                type: 'fab',
                data: fabData,
                subRows,
            };
        });
    }, [fabs]);

    // ------------------ Client-side Filtering (on top of server pagination) ------------------
    const filteredData = useMemo(() => {
        let result = tableData;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.type === 'fab' && (
                    r.data.job_no.toLowerCase().includes(q) ||
                    r.data.fab_id.toLowerCase().includes(q) ||
                    (r.data.acct_name  && r.data.acct_name.toLowerCase().includes(q)) ||
                    (r.data.job_name   && r.data.job_name.toLowerCase().includes(q))
                )
            );
        }

        if (fabTypeFilter !== 'all') {
            result = result.filter(r =>
                r.type === 'fab' &&
                r.data.fab_type.toLowerCase() === fabTypeFilter.toLowerCase()
            );
        }

        if (dateRange?.from && dateRange?.to) {
            const start = startOfDay(dateRange.from);
            const end   = startOfDay(dateRange.to);
            end.setHours(23, 59, 59, 999);
            result = result.filter(r => {
                if (r.type !== 'fab' || !r.data.expected_completion_date) return false;
                const d = new Date(r.data.expected_completion_date);
                return d >= start && d <= end;
            });
        }

        return result;
    }, [tableData, searchQuery, fabTypeFilter, dateRange]);

    // ------------------ Grouping & Totals ------------------
    const groupedParents = useMemo(() => {
        const groups: Record<string, { parents: ShopStatusRow[]; dateDisplay: string }> = {};
        filteredData.forEach(parent => {
            if (parent.type !== 'fab') return;
            const key = parent.data.date_group;
            const display = key !== 'unscheduled'
                ? format(new Date(parent.data.expected_completion_date!), 'MMMM yyyy').toUpperCase()
                : 'UNSCHEDULED';
            if (!groups[key]) groups[key] = { parents: [], dateDisplay: display };
            groups[key].parents.push(parent);
        });
        return groups;
    }, [filteredData]);

    const groupTotals = useMemo(() => {
        const totals: Record<string, { pieces: number; sqft: number; wj: number; edging: number; miter: number; cnc: number }> = {};
        filteredData.forEach(parent => {
            if (parent.type !== 'fab') return;
            const key = parent.data.date_group;
            if (!totals[key]) totals[key] = { pieces: 0, sqft: 0, wj: 0, edging: 0, miter: 0, cnc: 0 };
            totals[key].pieces  += parent.data.pieces;
            totals[key].sqft    += parent.data.total_sq_ft;
            totals[key].wj      += parent.data.wj_total;
            totals[key].edging  += parent.data.edging_total;
            totals[key].miter   += parent.data.miter_total;
            totals[key].cnc     += parent.data.cnc_total;
        });
        return totals;
    }, [filteredData]);

    const overallTotals = useMemo(() => {
        let pieces = 0, sqft = 0, wj = 0, edging = 0, miter = 0, cnc = 0;
        filteredData.forEach(parent => {
            if (parent.type !== 'fab') return;
            pieces  += parent.data.pieces;
            sqft    += parent.data.total_sq_ft;
            wj      += parent.data.wj_total;
            edging  += parent.data.edging_total;
            miter   += parent.data.miter_total;
            cnc     += parent.data.cnc_total;
        });
        return { pieces, sqft, wj, edging, miter, cnc };
    }, [filteredData]);

    // ------------------ Column Definitions ------------------
    const columns = useMemo<ColumnDef<ShopStatusRow>[]>(() => [
        // Expander
        {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => {
                if (row.original.type === 'fab' && row.original.subRows.length > 0) {
                    return (
                        <button
                            onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                            className="p-1 hover:bg-gray-100 rounded"
                        >
                            {row.getIsExpanded()
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRightIcon className="h-4 w-4" />
                            }
                        </button>
                    );
                }
                return <div className="w-6" />;
            },
            size: 36,
        },
        // Est. Completion Date (also used to show plan summary for child rows)
        {
            id: 'month',
            accessorFn: (r) => r.type === 'fab' ? r.data.expected_completion_date : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="EST. COMPLETION DATE" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const date = row.original.data.expected_completion_date;
                    return <span className="text-sm text-[#4b545d]">{''}</span>;
                }
                if (row.original.type === 'plan') {
                    // Show plan summary in this column for child rows
                    return (
                        <span className="text-xs text-gray-500 pl-4">
                            {row.original.plan.plan_name} · {row.original.plan.workstation_name} · {row.original.plan.operator_name}
                        </span>
                    );
                }
                return null;
            },
            enableSorting: true,
            size: 230,
        },
        // Cut Date Scheduled
        {
            id: 'cut_date_scheduled',
            accessorFn: (r) => r.type === 'fab' ? r.data.cut_date_scheduled : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="CUT DATE SCHEDULED" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
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
        // Install Date
        {
            id: 'install_date',
            accessorFn: (r) => r.type === 'fab' ? r.data.install_date : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALL DATE" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
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
        // FAB Type
        {
            id: 'fab_type',
            accessorFn: (r) => r.type === 'fab' ? r.data.fab_type : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return <span className="text-sm text-[#4b545d] whitespace-nowrap">{row.original.data.fab_type}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 130,
        },
        // FAB ID
        {
            id: 'fab_id',
            accessorFn: (r) => r.type === 'fab' ? r.data.fab_id : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return (
                        <span className="text-sm text-[#4b545d] hover:underline cursor-pointer">
                            {row.original.data.fab_id}
                        </span>
                    );
                }
                return null;
            },
            enableSorting: true,
            size: 100,
        },
        // Job No
        {
            id: 'job_no',
            accessorFn: (r) => r.type === 'fab' ? r.data.job_no : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return <span className="text-sm text-[#4b545d]">{row.original.data.job_no}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 100,
        },
        // FAB Info
        {
            id: 'fab_info',
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB INFO" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const f = row.original.data;
                    const jobParts   = [f.acct_name, f.job_name, f.input_area ? `Area: ${f.input_area}` : ''].filter(Boolean);
                    const stoneParts = [f.stone_type_name, f.stone_color_name, f.stone_thickness_value, f.edge_name].filter(Boolean);
                    return (
                        <div className="flex flex-col gap-1 text-xs max-w-[360px]">
                            {jobParts.length > 0 && (
                                <div className="truncate text-gray-600" title={jobParts.join(' - ')}>
                                    {jobParts.join(' - ')}
                                </div>
                            )}
                            {stoneParts.length > 0 && (
                                <div className="truncate text-gray-500" title={stoneParts.join(' - ')}>
                                    {stoneParts.join(' - ')}
                                </div>
                            )}
                        </div>
                    );
                }
                if (row.original.type === 'plan') {
                    return (
                        <span className="text-xs text-gray-400 pl-4">
                            Estimated hrs:. {row.original.plan.estimated_hours}h
                        </span>
                    );
                }
                return null;
            },
            size: 360,
        },
        // Pieces
        {
            id: 'pieces',
            accessorFn: (r) => r.type === 'fab' ? r.data.pieces : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="NO. OF PIECES" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return <span className="text-sm text-[#4b545d]">{row.original.data.pieces}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 130,
        },
        // Total Sq Ft
        {
            id: 'total_sq_ft',
            accessorFn: (r) => r.type === 'fab' ? r.data.total_sq_ft : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="TOTAL SQ FT" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return <span className="text-sm text-[#4b545d]">{row.original.data.total_sq_ft.toFixed(1)}</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 120,
        },
        // ---- Stage columns ----
        {
            id: 'cut',
            header: ({ column }) => (
                <DataGridColumnHeader title="CUT" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.cut_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 7) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'wj',
            header: ({ column }) => (
                <DataGridColumnHeader title="WJ" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.wj_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 8) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'edging',
            header: ({ column }) => (
                <DataGridColumnHeader title="EDGING" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.edging_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 9) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'miter',
            header: ({ column }) => (
                <DataGridColumnHeader title="MITER" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.miter_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 2) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'cnc',
            header: ({ column }) => (
                <DataGridColumnHeader title="CNC" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.cnc_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 1) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        {
            id: 'touchup',
            header: ({ column }) => (
                <DataGridColumnHeader title="TOUCHUP QA" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    const p = row.original.data.touchup_progress;
                    return <ProgressBar value={p.completed} total={p.total} percent={p.percent} unit={p.unit} />;
                }
                if (row.original.type === 'plan' && row.original.plan.planning_section_id === 6) {
                    return <ProgressBar value={0} total={row.original.stage_total} percent={row.original.stage_percent} unit={row.original.stage_unit} />;
                }
                return null;
            },
            size: 130,
        },
        // % Complete
        {
            id: 'percent_complete',
            accessorFn: (r) => r.type === 'fab' ? r.data.percent_complete : null,
            header: ({ column }) => (
                <DataGridColumnHeader title="% COMPLETE" column={column} className="text-[#7c8689] text-[15px] font-normal" />
            ),
            cell: ({ row }) => {
                if (row.original.type === 'fab') {
                    return <span className="text-sm text-[#4b545d]">{row.original.data.percent_complete.toFixed(2)}%</span>;
                }
                if (row.original.type === 'plan') {
                    return <span className="text-xs text-gray-500">{row.original.stage_percent.toFixed(1)}%</span>;
                }
                return null;
            },
            enableSorting: true,
            size: 120,
        },
        // Notes
        // {
        //     id: 'notes',
        //     header: ({ column }) => (
        //         <DataGridColumnHeader title="NOTES" column={column} className="text-[#7c8689] text-[15px] font-normal" />
        //     ),
        //     cell: ({ row }) => {
        //         if (row.original.type === 'fab') {
        //             return <span className="text-sm text-[#4b545d] line-clamp-2">{row.original.data.notes || '-'}</span>;
        //         }
        //         if (row.original.type === 'plan') {
        //             return <span className="text-xs text-gray-500">{row.original.plan.notes || '-'}</span>;
        //         }
        //         return null;
        //     },
        //     size: 150,
        // },
    ], []);

    // ------------------ Table Instance ------------------
    const table = useReactTable({
        columns,
        data: filteredData,   // only parent FAB rows; TanStack reads subRows from each
        pageCount: Math.ceil(totalRecords / itemsPerPage),
        getRowId: (row) =>
            row.type === 'fab'
                ? row.data.fab_id
                : `plan-${row.fab_id}-${row.plan.plan_id}`,
        state: {
            pagination: { pageIndex: currentPage - 1, pageSize: itemsPerPage },
            sorting,
            expanded,
        },
        columnResizeMode: 'onChange',
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function'
                ? updater({ pageIndex: currentPage - 1, pageSize: itemsPerPage })
                : updater;
            setCurrentPage(next.pageIndex + 1);
            setItemsPerPage(next.pageSize);
        },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        getCoreRowModel:      getCoreRowModel(),
        getFilteredRowModel:  getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel:    getSortedRowModel(),
        getExpandedRowModel:  getExpandedRowModel(),
        // This is the key: TanStack will use subRows from each row object
        getSubRows: (row) =>
            row.type === 'fab' && row.subRows.length > 0 ? row.subRows : undefined,
        manualPagination: true,
    });

    // ------------------ Pagination helpers ------------------
    const totalPages  = Math.ceil(totalRecords / itemsPerPage) || 1;
    const startItem   = totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem     = Math.min(currentPage * itemsPerPage, totalRecords);

    const pageNumbers = useMemo(() => {
        const half  = 2;
        let start   = Math.max(1, currentPage - half);
        let end     = Math.min(totalPages, currentPage + half);
        if (end - start < 4) {
            if (start === 1) end   = Math.min(totalPages, start + 4);
            else             start = Math.max(1, end - 4);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }, [currentPage, totalPages]);

    // ------------------ Helper: render a totals row ------------------
    const renderTotalsRow = (
        label: string,
        totals: { pieces: number; sqft: number; wj: number; edging: number; miter: number; cnc: number },
        bgClass = 'bg-[#f9f9f9]',
    ) => (
        <tr className={`${bgClass} font-medium border-b border-[#e2e4ed]`}>
            {table.getVisibleFlatColumns().map(col => {
                const id = col.id;
                const td = (content: React.ReactNode) => (
                    <td key={id} className="px-4 py-2 text-sm font-semibold text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0">
                        {content}
                    </td>
                );
                if (id === 'expander')     return <td key={id} className="px-4 py-2 border-r border-[#e2e4ed]" />;
                if (id === 'month')        return td(label);
                if (id === 'pieces')       return td(totals.pieces);
                if (id === 'total_sq_ft')  return td(`${totals.sqft.toFixed(1)} SF`);
                if (id === 'wj')           return td(`${totals.wj.toFixed(1)} LF`);
                if (id === 'edging')       return td(`${totals.edging.toFixed(1)} LF`);
                if (id === 'miter')        return td(`${totals.miter.toFixed(1)} LF`);
                if (id === 'cnc')          return td(`${totals.cnc.toFixed(1)} LF`);
                return <td key={id} className="px-4 py-2 border-r border-[#e2e4ed] last:border-r-0" />;
            })}
        </tr>
    );

    const isLoading = isApiLoading || externalLoading;

    // ------------------ Render ------------------
    return (
        <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoading}
            groupByDate={false}
            tableLayout={{
                columnsPinnable:    true,
                columnsMovable:     true,
                columnsVisibility:  true,
                cellBorder:         true,
            }}
        >
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)]">

                {/* ---- Filters ---- */}
                <CardHeader className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-[#e2e4ed] px-5">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="size-4 text-[#7c8689] absolute start-3 top-1/2 -translate-y-1/2" />
                            <Input
                                placeholder="Search by job, Fab ID"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="ps-9 w-[280px] h-[34px] border-[#e2e4ed] focus-visible:ring-0"
                                disabled={isLoading}
                            />
                            {searchQuery && (
                                <Button
                                    size="icon" variant="ghost"
                                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Date Range */}
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-[210px] h-[34px] justify-start text-left font-normal border-[#e2e4ed]',
                                        !dateRange && 'text-muted-foreground'
                                    )}
                                    disabled={isLoading}
                                >
                                    <CalendarDays className="mr-2 h-4 w-4 text-[#7c8689]" />
                                    {dateRange?.from ? (
                                        dateRange.to
                                            ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                                            : format(dateRange.from, 'MMM dd, yyyy')
                                    ) : (
                                        <span>Pick dates</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from || new Date()}
                                    selected={tempDateRange}
                                    onSelect={setTempDateRange}
                                    numberOfMonths={2}
                                />
                                <div className="flex items-center justify-end gap-1.5 border-t border-[#e2e4ed] p-3">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => { setTempDateRange(undefined); setDateRange(undefined); }}
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => { setDateRange(tempDateRange); setIsDatePickerOpen(false); }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* FAB Type */}
                        <Select value={fabTypeFilter} onValueChange={setFabTypeFilter} disabled={isLoading}>
                            <SelectTrigger className="w-[140px] h-[34px] border-[#e2e4ed]">
                                <SelectValue placeholder="FAB type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="ag redo">AG Redo</SelectItem>
                                <SelectItem value="fab only">FAB Only</SelectItem>
                                <SelectItem value="resurface">Resurface</SelectItem>
                                <SelectItem value="fast track">Fast Track</SelectItem>
                                <SelectItem value="cust redo">Cust Redo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <CardToolbar className="flex gap-4">
                        {/* Sales Person */}
                        {/* <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter} disabled={isLoading}>
                            <SelectTrigger className="w-[205px] h-[34px] border-[#e2e4ed]">
                                <SelectValue placeholder="Select sales person" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sales Persons</SelectItem>
                                {salesPersons.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select> */}

                        {/* Export */}
                        <Button
                            variant="outline"
                            onClick={() => exportTableToCSV(table, 'shop-status')}
                            disabled={isLoading}
                            className="h-[34px] border-[#e2e4ed] text-[#4b545d]"
                        >
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                {/* ---- Table Body ---- */}
                <CardTable>
                    <ScrollArea>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-[#7c8689]">Loading…</p>
                            </div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead>
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className="px-4 py-3 text-left text-xs font-medium text-[#7c8689] bg-[#f9f9f9] border-b border-r border-[#e2e4ed] last:border-r-0 whitespace-normal sticky top-0 z-10"
                                                    style={{ width: header.getSize() }}

                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>

                                <tbody>
                                    {/* Overall totals row */}
                                    {renderTotalsRow('Overall Total', overallTotals, 'bg-[#eef0f6]')}

                                    {Object.entries(groupedParents).map(([dateKey, group]) => {
                                        const groupTotal = groupTotals[dateKey] || { pieces: 0, sqft: 0, wj: 0, edging: 0, miter: 0, cnc: 0 };

                                        return (
                                            <React.Fragment key={dateKey}>
                                                {/* Date group header */}
                                                <tr className="bg-[#F6FFE7]">
                                                    <td
                                                        className="px-4 py-2 text-xs font-semibold text-[#4b545d]"
                                                        colSpan={table.getVisibleFlatColumns().length}
                                                    >
                                                        {group.dateDisplay}
                                                    </td>
                                                </tr>

                                                {/* Group totals row */}
                                                {renderTotalsRow('Group Total', groupTotal)}

                                                {/* FAB rows + their expanded plan child rows */}
                                                {group.parents.map(parent => {
                                                    if (parent.type !== 'fab') return null;

                                                    // Find the TanStack row object for this FAB
                                                    const parentRow = table.getRowModel().rows.find(
                                                        r =>
                                                            r.original.type === 'fab' &&
                                                            r.original.data.fab_id === parent.data.fab_id
                                                    );
                                                    if (!parentRow) return null;

                                                    return (
                                                        <React.Fragment key={parentRow.id}>
                                                            {/* Parent FAB row */}
                                                            <tr className="border-b border-[#e2e4ed]  transition-colors" data-fab-type={parentRow.original.type === 'fab' ? parentRow.original.data.fab_type?.toLowerCase() : undefined}>
                                                                {parentRow.getVisibleCells().map(cell => (
                                                                    <td
                                                                        key={cell.id}
                                                                        className="px-4 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                                    >
                                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                    </td>
                                                                ))}
                                                            </tr>

                                                            {/* Child plan rows — TanStack provides these via parentRow.subRows */}
                                                            {parentRow.getIsExpanded() &&
                                                                parentRow.subRows.map(childRow => (
                                                                    <tr
                                                                        key={childRow.id}
                                                                        className="border-b border-[#e2e4ed] bg-gray-50/60"
                                                                    >
                                                                        {childRow.getVisibleCells().map(cell => (
                                                                            <td
                                                                                key={cell.id}
                                                                                className="px-4 py-2 text-sm text-[#4b545d] border-r border-[#e2e4ed] last:border-r-0"
                                                                            >
                                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))
                                                            }
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}

                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={table.getVisibleFlatColumns().length}
                                                className="px-4 py-12 text-center text-sm text-[#7c8689]"
                                            >
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
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                        >
                            <SelectTrigger className="h-8 w-[70px] border-[#dbdfe9] bg-[#f9f9f9] text-xs">
                                <SelectValue />
                            </SelectTrigger>
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
                        <span className="text-sm text-[#7c8689]">
                            {startItem}–{endItem} of {totalRecords}
                        </span>

                        <div className="flex items-center gap-1">
                            {/* First */}
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <ChevronLeft className="h-4 w-4 -ml-3" />
                            </Button>
                            {/* Prev */}
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {pageNumbers.map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'ghost'}
                                    size="icon"
                                    className={cn(
                                        'h-8 w-8 text-sm',
                                        currentPage === page
                                            ? 'bg-[#e2e4ed] text-[#4b545d] hover:bg-[#e2e4ed]'
                                            : 'text-[#7c8689]'
                                    )}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Button>
                            ))}

                            {/* Next */}
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            {/* Last */}
                            <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                            >
                                <ChevronRight className="h-4 w-4" />
                                <ChevronRight className="h-4 w-4 -ml-3" />
                            </Button>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </DataGrid>
    );
};

export { ShopStatusTable };