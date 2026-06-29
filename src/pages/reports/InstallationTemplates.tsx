import { useEffect, useMemo, useState } from 'react';
import { flexRender, ColumnDef, getCoreRowModel, getExpandedRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, SortingState, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronRight, Search, X, FileText } from 'lucide-react';
import { useGetInstallationTemplateReportQuery, useGetInstallationTemplateReportPdfMutation } from '@/store/api/report';
import { DataGrid } from '@/components/ui/data-grid';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Card, CardHeader, CardToolbar, CardTable, CardFooter, CardHeading } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { BackButton } from '@/components/common/BackButton';
import { getJobNameLink, getJobNumberLink, renderLink } from '@/lib/reportLinks';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UpdateInstallationTemplateModal } from './component/InstallationModal';
import { useSelector } from 'react-redux';
import { usePermission } from '@/hooks/use-permission';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TimerSession {
    id: number;
    job_id: number;
    fab_id: number | null;
    templater_id?: number;
    installer_id?: number;
    status: string;
    session_start_at: string;
    current_run_start_at: string | null;
    current_pause_start_at: string | null;
    stopped_at: string | null;
    total_work_seconds: number;
    total_pause_seconds: number;
    sqft_templated?: number;
    sqft_not_templated?: number;
    sqft_installed?: number;
    sqft_not_installed?: number;
    created_at: string;
    updated_at: string;
    updated_by: number | null;
}

interface ReportRow {
    installer: string;
    installer_id: number;
    installer_hours: number;
    activity_type: string;
    activity_date: string;
    fab_id: number;
    fab_type: string;
    job_number: string;
    job_name: string;
    account_name: string;
    activity_complete: boolean;
    duration: string;
    sq_ft_installed: number;
    sq_ft_incomplete: number;
    sqft_templated: number;
    sqft_not_templated: number;
    reason_if_not_complete: string | null;
    sales_person_id: number;
    sales_person_name: string;
    job_id?: number;
    timer_sessions: TimerSession[];
}

interface Group {
    installer: string;
    installer_id: number;
    activity_label: string;
    job_count: number;
    rows: ReportRow[];
    installer_hours: number;
    installer_hours_display: string;
}

interface ReportData {
    title: string;
    period: { from_date: string | null; to_date: string | null };
    columns: string[];
    filters: { search: string | null; fab_type: string | null; sales_person_id: number | null };
    filter_options: { sales_person_options: { id: number; name: string }[]; fab_types: string[] };
    summary: {
        total_hours_templated: string;
        total_hours_installed: string;
        sqft_templated: number;
        sqft_not_templated: number;
        sqft_installed: number;
        sqft_not_installed: number;
        row_count: number;
        group_count: number;
    };
    groups: Group[];
    rows: ReportRow[];
}

// ─── Helper: format duration with days ────────────────────────────────────
const formatDuration = (seconds: number): string => {
    if (seconds < 0) seconds = 0;
    const days = Math.floor(seconds / 86400);
    const remainder = seconds % 86400;
    const hrs = Math.floor(remainder / 3600);
    const mins = Math.floor((remainder % 3600) / 60);
    const secs = remainder % 60;
    if (days > 0) {
        return `${days}d ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ─── Component ──────────────────────────────────────────────────────────────
export function InstallationTemplateReport() {
    const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

    // ── Permission ──────────────────────────────────────────────────────────
    const { can_create: canEdit } = usePermission('Installation & Template'); // adjust menu code as needed

    // ── Filters ─────────────────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const [searchQuery, setSearchQuery] = useState('');
    const [fabTypeFilter, setFabTypeFilter] = useState<string>('all');
    const [salesPersonId, setSalesPersonId] = useState<number | 'all'>('all');

    // ── PDF Dialog state ────────────────────────────────────────────────────
    const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
    const [pdfDateRange, setPdfDateRange] = useState<DateRange | undefined>(undefined);
    const [pdfTempDateRange, setPdfTempDateRange] = useState<DateRange | undefined>(undefined);
    const [pdfIsDatePickerOpen, setPdfIsDatePickerOpen] = useState(false);
    const [pdfMonth, setPdfMonth] = useState(new Date());
    const [pdfSearch, setPdfSearch] = useState('');
    const [pdfFabType, setPdfFabType] = useState<string>('all');
    const [pdfSalesPerson, setPdfSalesPerson] = useState<number | 'all'>('all');

    // ── Update Modal state ──────────────────────────────────────────────────
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [selectedRowData, setSelectedRowData] = useState<any>(null);

    // ── Pagination & Expansion ──────────────────────────────────────────────
    const [paginationTemplate, setPaginationTemplate] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sortingTemplate, setSortingTemplate] = useState<SortingState>([]);
    const [expandedTemplate, setExpandedTemplate] = useState<Record<string, boolean>>({});

    const [paginationInstall, setPaginationInstall] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
    const [sortingInstall, setSortingInstall] = useState<SortingState>([]);
    const [expandedInstall, setExpandedInstall] = useState<Record<string, boolean>>({});

    const [hasInitialized, setHasInitialized] = useState(false);

    // ─── Queries & Mutations ────────────────────────────────────────────────
    const [exportPdf, { isLoading: pdfLoading }] = useGetInstallationTemplateReportPdfMutation();

    // ─── Build query params ──────────────────────────────────────────────────
    const queryParams = useMemo(() => {
        const params: { from_date?: string; to_date?: string; search?: string; fab_type?: string; sales_person_id?: number } = {};
        if (dateRange?.from) {
            params.from_date = format(dateRange.from, 'yyyy-MM-dd');
            params.to_date = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd');
        }
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (fabTypeFilter !== 'all') params.fab_type = fabTypeFilter;
        if (salesPersonId !== 'all') params.sales_person_id = salesPersonId;
        return Object.keys(params).length ? params : undefined;
    }, [dateRange, searchQuery, fabTypeFilter, salesPersonId]);

    const { data, isLoading, refetch } = useGetInstallationTemplateReportQuery(queryParams);
    const reportData = data?.data as ReportData | undefined;

    const fabTypes = useMemo(() => reportData?.filter_options?.fab_types ?? [], [reportData]);
    const salesPersonOptions = useMemo(() => reportData?.filter_options?.sales_person_options ?? [], [reportData]);
    const summary = reportData?.summary;

    // ─── Build hierarchical data (installer → job → timer) ────────────────
    const { templateData, installData } = useMemo(() => {
        if (!reportData?.groups) return { templateData: [], installData: [] };

        const buildActivityData = (activityType: 'Template' | 'Installation') => {
            const result: any[] = [];
            reportData.groups.forEach((group) => {
                const rows = group.rows.filter(r => r.activity_type === activityType);
                if (rows.length === 0) return;

                const totalHours = rows.reduce((s, r) => s + r.installer_hours, 0);
                const totalSqftTemplated = rows.reduce((s, r) => s + (r.sqft_templated || 0), 0);
                const totalSqftNotTemplated = rows.reduce((s, r) => s + (r.sqft_not_templated || 0), 0);
                const totalSqftInstalled = rows.reduce((s, r) => s + (r.sq_ft_installed || 0), 0);
                const totalSqftIncomplete = rows.reduce((s, r) => s + (r.sq_ft_incomplete || 0), 0);

                const installerRow = {
                    type: 'installer',
                    id: `installer-${group.installer}-${activityType}`,
                    installer: group.installer,
                    installer_id: group.installer_id,
                    total_hours: totalHours,
                    total_sqft_templated: totalSqftTemplated,
                    total_sqft_not_templated: totalSqftNotTemplated,
                    total_sqft_installed: totalSqftInstalled,
                    total_sqft_incomplete: totalSqftIncomplete,
                    subRows: rows.map((r) => ({
                        ...r,
                        type: 'job',
                        id: `job-${r.fab_id}-${activityType}`,
                        // Timer sessions become subRows of the job
                        subRows: (r.timer_sessions || []).map((ts) => ({
                            ...ts,
                            type: 'timer',
                            id: `timer-${ts.id}`,                     // table key
                            timer_session_id: ts.id,                  // numeric ID
                            job_id: r.job_id,                         // job ID
                            activity_type: r.activity_type,
                            // map fields for display
                            session_start: ts.session_start_at,
                            session_end: ts.stopped_at,
                            work_duration: ts.total_work_seconds,
                            pause_duration: ts.total_pause_seconds,
                            sqft: ts.sqft_templated ?? ts.sqft_installed ?? 0,
                            status: ts.status,
                            // Keep the original timer session ID as `timer_session_id`
                        })),
                    })),
                };
                result.push(installerRow);
            });
            return result;
        };

        return {
            templateData: buildActivityData('Template'),
            installData: buildActivityData('Installation'),
        };
    }, [reportData]);

    // ─── Initial expand state (installers + jobs expanded, timers collapsed) ──
    useEffect(() => {
        if (!hasInitialized && (templateData.length > 0 || installData.length > 0)) {
            const initExpanded = (data: any[]) => {
                const state: Record<string, boolean> = {};
                data.forEach(installer => {
                    state[installer.id] = true;
                    installer.subRows?.forEach((job: any) => {
                        state[job.id] = true; // expand jobs by default
                        // timers remain collapsed
                    });
                });
                return state;
            };
            if (templateData.length > 0) setExpandedTemplate(initExpanded(templateData));
            if (installData.length > 0) setExpandedInstall(initExpanded(installData));
            setHasInitialized(true);
        }
    }, [templateData, installData, hasInitialized]);

    // ─── Handle edit actions ─────────────────────────────────────────────────
    // For editing timer sessions – passes the timer session data (which includes id as timer_session_id)
    const handleEditTimer = (timerData: any) => {
        setSelectedRowData(timerData); // the modal will receive the timer session info
        setIsUpdateModalOpen(true);
    };

    // ─── Column definitions ──────────────────────────────────────────────────
    const baseColumns = (activityType: 'Template' | 'Installation'): ColumnDef<any>[] => {
        const isTemplate = activityType === 'Template';
        const sqftLabel1 = isTemplate ? 'SQFT TEMPLATED' : 'SQFT INSTALLED';
        const sqftKey1 = isTemplate ? 'total_sqft_templated' : 'total_sqft_installed';
        const sqftLabel2 = isTemplate ? 'SQFT NOT TEMPLATED' : 'SQFT NOT INSTALLED';
        const sqftKey2 = isTemplate ? 'total_sqft_not_templated' : 'total_sqft_incomplete';

        const columns: ColumnDef<any>[] = [
            {
                id: 'expander',
                header: () => null,
                cell: ({ row }) => {
                    // Show expander for installer and job rows (only if they have children)
                    if (row.original.type === 'installer' || row.original.type === 'job') {
                        const hasSubRows = row.original.subRows && row.original.subRows.length > 0;
                        if (!hasSubRows) return null;
                        return (
                            <button onClick={row.getToggleExpandedHandler()} className="p-1 hover:bg-gray-100 rounded">
                                {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        );
                    }
                    return null;
                },
                size: 40,
                enableSorting: false,
            },
        ];

        // ── Actions column – only on timer rows, if user has edit permission ──
        if (canEdit) {
            columns.push({
                id: 'actions',
                header: () => null,
                cell: ({ row }) => {
                    if (row.original.type === 'timer') {
                        return (
                            <Button size="sm" onClick={() => handleEditTimer(row.original)}>
                                Edit
                            </Button>
                        );
                    }
                    return null;
                },
                size: 80,
                enableSorting: false,
            });
        }

        // ── Main columns ──────────────────────────────────────────────────────
        columns.push(
            {
                id: 'installer',
                header: ({ column }) => <DataGridColumnHeader title="EMPLOYEE" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span className="font-medium">{row.original.installer}</span>;
                    } else if (row.original.type === 'timer') {
                        return <span className="text-muted-foreground text-xs">—</span>;
                    }
                    return null;
                },
                size: 200,
                enableSorting: true,
            },
            {
                id: 'account_name',
                header: ({ column }) => <DataGridColumnHeader title="ACCOUNT" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span className="text-muted-foreground">—</span>;
                    } else if (row.original.type === 'job') {
                        return <span>{row.original.account_name}</span>;
                    } else {
                        return <span className="text-muted-foreground text-xs">—</span>;
                    }
                },
                size: 200,
                enableSorting: true,
            },
            {
                id: 'job_name',
                header: ({ column }) => <DataGridColumnHeader title="JOB NAME" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span className="text-muted-foreground">—</span>;
                    } else if (row.original.type === 'job') {
                        if (row.original.job_name) {
                            const jobId = row.original.job_id;
                            if (jobId) {
                                const link = getJobNameLink(String(row.original.job_name), jobId);
                                if (link) return renderLink(link);
                            }
                            return <span className="text-sm">{row.original.job_name}</span>;
                        }
                        return null;
                    } else {
                        return <span className="text-muted-foreground text-xs">Timer session</span>;
                    }
                },
                size: 250,
                enableSorting: true,
            },
            {
                id: "job_number",
                accessorKey: "job_number",
                header: ({ column }) => <DataGridColumnHeader title="JOB NO" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'timer') return <span className="text-muted-foreground text-xs">—</span>;
                    const jobNumber = row.original.job_number;
                    if (!jobNumber) return <span className="text-sm">—</span>;
                    const link = getJobNumberLink(jobNumber);
                    return renderLink(link);
                },
                size: 100,
                enableSorting: true,
            },
            {
                id: 'activity_complete',
                header: ({ column }) => <DataGridColumnHeader title="ACTIVITY COMPLETE" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'job') {
                        return <span>{row.original.activity_complete ? 'Yes' : 'No'}</span>;
                    } else if (row.original.type === 'timer') {
                        return <span className="text-muted-foreground text-xs">—</span>;
                    }
                    return null;
                },
                size: 130,
                enableSorting: true,
            },
            {
                id: 'duration',
                header: ({ column }) => <DataGridColumnHeader title="DURATION" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'job') {
                        return <span className="whitespace-pre-wrap">{row.original.total_work_seconds || '—'}</span>;
                    } else if (row.original.type === 'timer') {
                        const seconds = row.original.total_work_seconds || 0;
                        return <span className="text-xs">{formatDuration(seconds)}</span>;
                    }
                    return null;
                },
                size: 120,
                enableSorting: true,
            },
            {
                id: 'sqft_1',
                header: ({ column }) => <DataGridColumnHeader title={sqftLabel1} column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span>{row.original[sqftKey1]?.toFixed(0) ?? '0'}</span>;
                    } else if (row.original.type === 'job') {
                        const val = isTemplate ? row.original.sqft_templated : row.original.sq_ft_installed;
                        return <span>{val?.toFixed(0) ?? '0'}</span>;
                    } else {
                        // Timer row: show session's sqft
                        const val = row.original.sqft ?? 0;
                        return <span className="text-xs">{val.toFixed(0)}</span>;
                    }
                },
                size: 130,
                enableSorting: true,
            },
            {
                id: 'sqft_2',
                header: ({ column }) => <DataGridColumnHeader title={sqftLabel2} column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'installer') {
                        return <span>{row.original[sqftKey2]?.toFixed(0) ?? '0'}</span>;
                    } else if (row.original.type === 'job') {
                        const val = isTemplate ? row.original.sqft_not_templated : row.original.sq_ft_incomplete;
                        return <span>{val?.toFixed(0) ?? '0'}</span>;
                    } else if (row.original.type === 'timer') {
                        const actType = row.original.activity_type;
                        let val = 0;
                        if (actType === 'Template') {
                            val = row.original.sqft_not_templated ?? 0;
                        } else if (actType === 'Installation') {
                            val = row.original.sqft_not_installed ?? 0;
                        } else {
                            // fallback: try both
                            val = row.original.sqft_not_templated ?? row.original.sqft_not_installed ?? 0;
                        }
                        return <span className="text-xs">{val.toFixed(0)}</span>;
                    }
                    return null;
                },
                size: 140,
                enableSorting: true,
            },
            {
                id: 'reason',
                header: ({ column }) => <DataGridColumnHeader title="REASON (IF NOT COMPLETE)" column={column} />,
                cell: ({ row }) => {
                    if (row.original.type === 'job') {
                        return <span>{row.original.reason_if_not_complete || '—'}</span>;
                    } else if (row.original.type === 'timer') {
                        return <span className="text-muted-foreground text-xs">—</span>;
                    }
                    return null;
                },
                size: 200,
                enableSorting: true,
            }
        );

        return columns;
    };

    const templateColumns = useMemo(() => baseColumns('Template'), [canEdit]);
    const installColumns = useMemo(() => baseColumns('Installation'), [canEdit]);

    // ─── Table instances ──────────────────────────────────────────────────────
    const templateTable = useReactTable({
        columns: templateColumns,
        data: templateData,
        getRowId: (row) => row.id,
        state: {
            pagination: paginationTemplate,
            sorting: sortingTemplate,
            expanded: expandedTemplate,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onSortingChange: setSortingTemplate,
        onPaginationChange: setPaginationTemplate,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpandedTemplate(updater(expandedTemplate));
            } else {
                setExpandedTemplate(updater);
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSubRows: (row) => row.subRows || [],
        enableExpanding: true,
        meta: {
            getRowAttributes: (row) => {
                if (row.original.type === 'installer') {
                    return { className: 'bg-[#f6ffe7] hover:bg-[#edffd4] transition-colors' };
                } else if (row.original.type === 'timer') {
                    return { className: 'bg-gray-50/30 hover:bg-gray-100/40 transition-colors text-xs' };
                }
                return { className: 'bg-white hover:bg-gray-50/50' };
            },
        },
    });

    const installTable = useReactTable({
        columns: installColumns,
        data: installData,
        getRowId: (row) => row.id,
        state: {
            pagination: paginationInstall,
            sorting: sortingInstall,
            expanded: expandedInstall,
        },
        columnResizeMode: 'onEnd',
        enableColumnResizing: true,
        onSortingChange: setSortingInstall,
        onPaginationChange: setPaginationInstall,
        onExpandedChange: (updater) => {
            if (typeof updater === 'function') {
                setExpandedInstall(updater(expandedInstall));
            } else {
                setExpandedInstall(updater);
            }
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSubRows: (row) => row.subRows || [],
        enableExpanding: true,
        meta: {
            getRowAttributes: (row) => {
                if (row.original.type === 'installer') {
                    return { className: 'bg-[#f6ffe7] hover:bg-[#edffd4] transition-colors' };
                } else if (row.original.type === 'timer') {
                    return { className: 'bg-gray-50/30 hover:bg-gray-100/40 transition-colors text-xs' };
                }
                return { className: 'bg-white hover:bg-gray-50/50' };
            },
        },
    });

    // ─── PDF Export handler ──────────────────────────────────────────────────
    const handleOpenPdfDialog = () => {
        setPdfDateRange(dateRange);
        setPdfSearch(searchQuery);
        setPdfFabType(fabTypeFilter);
        setPdfSalesPerson(salesPersonId);
        setIsPdfDialogOpen(true);
    };

    const token = useSelector((state: any) => state.auth?.token || state.user?.token || localStorage.getItem('token'));

    const handlePdfDownload = async () => {
        const params: any = {};
        if (pdfDateRange?.from) {
            params.from_date = format(pdfDateRange.from, 'yyyy-MM-dd');
            params.to_date = pdfDateRange.to ? format(pdfDateRange.to, 'yyyy-MM-dd') : format(pdfDateRange.from, 'yyyy-MM-dd');
        }
        if (pdfSearch.trim()) params.search = pdfSearch.trim();
        if (pdfFabType !== 'all') params.fab_type = pdfFabType;
        if (pdfSalesPerson !== 'all') params.sales_person_id = pdfSalesPerson;

        const queryString = new URLSearchParams(params).toString();
        const url = `${baseUrl}/api/v1/reports/owner/installation-template-dashboard/pdf${queryString ? `?${queryString}` : ''}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/pdf',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                },
            });

            const contentType = response.headers.get('content-type') || '';

            if (!response.ok || contentType.includes('application/json')) {
                const errorText = await response.text();
                let errorMessage = 'PDF generation failed';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.detail || errorText;
                } catch (_) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                throw new Error('Empty PDF file received');
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `installation-template-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            setIsPdfDialogOpen(false);
            toast.success('PDF downloaded successfully');
        } catch (error: any) {
            console.error('PDF export failed:', error);
            toast.error(error.message || 'Failed to download PDF. Please try again.');
        }
    };

    // ─── CSV Export helper ──────────────────────────────────────────────────
    const exportFlattenedToCSV = (table: any, filename: string) => {
        const flattenRows = (rows: any[]): any[] => {
            let result: any[] = [];
            rows.forEach(row => {
                result.push(row.original);
                if (row.subRows && row.subRows.length > 0) {
                    result = result.concat(flattenRows(row.subRows));
                }
            });
            return result;
        };

        const allRows = flattenRows(table.getPrePaginationRowModel().rows);
        if (allRows.length === 0) {
            toast.warning('No data to export');
            return;
        }

        const excludeKeys = ['type', 'id', 'subRows', '_level', '_isGroup', 'children'];
        const headers = Object.keys(allRows[0]).filter(k => !excludeKeys.includes(k) && k !== 'children');

        const rows = allRows.map(row =>
            headers.map(header => {
                const value = row[header] ?? '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    // ─── Render Table helper ────────────────────────────────────────────────
    const renderTable = (
        table: any,
        title: string,
        dataLength: number,
        columns: ColumnDef<any>[],
        exportFileName: string
    ) => (
        <DataGrid
            table={table}
            recordCount={dataLength}
            tableLayout={{ columnsPinnable: true, columnsMovable: true, columnsVisibility: true, columnsResizable: true, cellBorder: true }}
        >
            <Card className="border border-[#e2e4ed] rounded-[12px] shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] overflow-hidden">
                <CardHeader className="py-3.5 border-b border-[#e2e4ed]">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-semibold text-[#4b545d]">{title}</span>
                        </div>
                    </CardHeading>
                    <CardToolbar>
                        <Button variant="outline" onClick={() => exportFlattenedToCSV(table, exportFileName)} className="h-[34px]">
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[calc(100vh-10px)] bg-white [&>[data-radix-scroll-area-viewport]]:pb-4">
                        <div className="relative">
                            <table className="w-full border-collapse table-fixed">
                                <thead className="sticky top-0 z-10 bg-white">
                                    {table.getHeaderGroups().map((headerGroup: any) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header: any) => (
                                                <th
                                                    key={header.id}
                                                    className="px-3 py-2 text-left text-xs font-semibold text-[#7c8689] border-b border-[#e2e4ed] bg-gray-50"
                                                    style={{ width: header.getSize() }}
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
                                    {table.getRowModel().rows.map((row: any) => {
                                        const rowAttrs = table.options.meta?.getRowAttributes?.(row) || {};
                                        return (
                                            <tr key={row.id} className={`border-b border-[#e2e4ed] ${rowAttrs.className || ''}`}>
                                                {row.getVisibleCells().map((cell: any) => (
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
                                    {dataLength === 0 && (
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
    );

    if (isLoading) return <div className="p-5 text-[#7c8689]">Loading report...</div>;

    return (
        <div className="flex flex-col gap-5 p-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#4b545d]">Installation And Template</h1>
                <div className="flex items-center gap-2">
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-[170px] h-[34px] justify-start text-left', !dateRange && 'text-muted-foreground')}>
                                <CalendarDays className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` : format(dateRange.from, 'MMM dd, yyyy')) : 'Filter by Date'}
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

                    <Button
                        variant="outline"
                        onClick={handleOpenPdfDialog}
                        disabled={pdfLoading}
                        className="h-[34px] flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        {pdfLoading ? 'Generating...' : 'Export PDF'}
                    </Button>

                    <BackButton />
                </div>
            </div>

            {/* ── Global Filters ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex items-center">
                    <div className="relative">
                        <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                        <Input
                            placeholder="Search by job name"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ps-9 w-[230px] h-[34px]"
                        />
                        {searchQuery && (
                            <Button mode="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                    <SelectTrigger className="w-auto min-w-[150px] h-[34px]"><SelectValue placeholder="Fab Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {fabTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={String(salesPersonId)} onValueChange={(v) => setSalesPersonId(v === 'all' ? 'all' : Number(v))}>
                    <SelectTrigger className="w-auto min-w-[150px] h-[34px]"><SelectValue placeholder="Sales Person" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sales Persons</SelectItem>
                        <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                        {salesPersonOptions.map(sp => <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* ── Summary Cards ── */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Template Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_templated ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Templated</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Not Templated </p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_not_templated?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">Install Hours</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.total_hours_installed ?? '0:00'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Installed</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_installed?.toFixed(0) ?? '0'}</p>
                    </div>
                    <div className="p-4 shadow-[0px_4px_5px_0px_rgba(0,0,0,0.03)] border border-[#e2e4ed] rounded-[12px] bg-white">
                        <p className="text-xs text-[#7c8689] font-medium uppercase tracking-wider">SQFT Not Installed</p>
                        <p className="text-2xl font-semibold mt-2 text-[#4b545d]">{summary.sqft_not_installed?.toFixed(0) ?? '0'}</p>
                    </div>
                </div>
            )}

            {/* ── Tables ── */}
            {renderTable(
                templateTable,
                'Template Activities',
                templateData.length,
                templateColumns,
                'template-activities'
            )}

            {renderTable(
                installTable,
                'Installation Activities',
                installData.length,
                installColumns,
                'installation-activities'
            )}

            {/* ── Update Modal ── */}
            <UpdateInstallationTemplateModal
                open={isUpdateModalOpen}
                onClose={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedRowData(null);
                }}
                rowData={selectedRowData}   // now contains timer session data with `timer_session_id`
                onUpdateSuccess={refetch}
            />

            {/* ── PDF Export Dialog ── */}
            <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Export PDF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Date Range</Label>
                            <Popover open={pdfIsDatePickerOpen} onOpenChange={setPdfIsDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal h-[34px]">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {pdfDateRange?.from ? (
                                            pdfDateRange.to
                                                ? `${format(pdfDateRange.from, 'MMM dd')} – ${format(pdfDateRange.to, 'MMM dd, yyyy')}`
                                                : format(pdfDateRange.from, 'MMM dd, yyyy')
                                        ) : 'Select date range'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        month={pdfMonth}
                                        onMonthChange={setPdfMonth}
                                        selected={pdfTempDateRange}
                                        onSelect={setPdfTempDateRange}
                                        numberOfMonths={2}
                                    />
                                    <div className="flex justify-end gap-2 p-3 border-t">
                                        <Button variant="outline" size="sm" onClick={() => { setPdfTempDateRange(undefined); setPdfDateRange(undefined); setPdfIsDatePickerOpen(false); }}>Reset</Button>
                                        <Button size="sm" onClick={() => { setPdfDateRange(pdfTempDateRange); setPdfIsDatePickerOpen(false); }}>Apply</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="pdf-search">Search</Label>
                            <Input
                                id="pdf-search"
                                value={pdfSearch}
                                onChange={(e) => setPdfSearch(e.target.value)}
                                placeholder="Search by job name, job number, FAB ID"
                                className="h-[34px]"
                            />
                        </div>
                        <div>
                            <Label>Fab Type</Label>
                            <Select value={pdfFabType} onValueChange={setPdfFabType}>
                                <SelectTrigger className="h-[34px]">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {fabTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Sales Person</Label>
                            <Select value={String(pdfSalesPerson)} onValueChange={(v) => setPdfSalesPerson(v === 'all' ? 'all' : Number(v))}>
                                <SelectTrigger className="h-[34px]">
                                    <SelectValue placeholder="All Sales Persons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sales Persons</SelectItem>
                                    <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                                    {salesPersonOptions.map(sp => <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPdfDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handlePdfDownload} disabled={pdfLoading}>
                            {pdfLoading ? 'Generating...' : 'Download PDF'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}