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
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from '@/components/ui/data-grid-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { useNavigate } from 'react-router';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { Fragment } from "react";
import { Fab } from "@/store/api/job"; // Import the Fab type


import ActionsCell from "@/pages/shop/components/action";
import { NotesModal } from "@/components/common/NotesModal";

// Define the interface for calculated cut list data
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
    cost_of_stone: number;
    revenue: number;
    fp_completed: string;
    cip: string;
    install_date: string;
    sales_person?: string;
    shop_date_schedule: string;
}

// Update the calculateCutListData function to work with Fab
export const calculateCutListData = (fab: Fab): CalculatedCutListData => {
    // Access additional fields that exist in the backend response but not in the Fab interface
    const fabWithExtraFields = fab as any;



    // Calculate cost of stone based on actual project value
    const calculateCostOfStone = (): number => {
        // Use actual project value from job details if available
        if (fab.job_details?.project_value) {
            const projectValue = parseFloat(fab.job_details.project_value.toString());
            // If project value is available, we can use it as the cost of stone
            // or calculate a percentage of it as the cost of stone
            return projectValue * 0.6; // Assuming 60% of project value is cost of stone
        }
        // Fallback to simple calculation if no project value
        const costPerSqFt = 50;
        return (fab.total_sqft || 0) * costPerSqFt;
    };

    return {
        id: fab.id,
        fab_type: fab.fab_type || '',
        fab_id: String(fab.id),
        fab_id_0: '', // Placeholder, can be populated if needed
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
        cost_of_stone: calculateCostOfStone(),
        revenue: fabWithExtraFields.revenue || 0,
        fp_completed: fabWithExtraFields.final_programming_complete ? 'Yes' : 'No',
        cip: '', // Placeholder - would need to get CIP from backend
        install_date: fabWithExtraFields.installation_date || '',
        shop_date_schedule: fabWithExtraFields.shop_date_schedule || "",
        sales_person: fabWithExtraFields.sales_person_name || '',
    };
};

interface CutListTableWithCalculationsProps {
    fabs: Fab[];  // Change from FabData[] to Fab[]
    fabTypes?: string[]; // Add fabTypes prop
    salesPersons?: string[]; // Add salesPersons prop
    path: string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
    pagination?: { pageIndex: number; pageSize: number };
    setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void;
    searchQuery?: string;
    setSearchQuery?: (query: string) => void;
    dateFilter?: string;
    setDateFilter?: (filter: string) => void;
    fabTypeFilter?: string;
    setFabTypeFilter?: (filter: string) => void;
    salesPersonFilter?: string;
    setSalesPersonFilter?: (filter: string) => void;
    dateRange?: DateRange | undefined;
    setDateRange?: (range: DateRange | undefined) => void;
    onAddNote?: (fabId: string, note: string) => void;
}

export const CutListTableWithCalculations = ({
    fabs,
    fabTypes = [], // Destructure fabTypes with default empty array
    salesPersons = [], // Destructure salesPersons with default empty array
    path,
    isSuperAdmin = false,
    isLoading,
    onRowClick,
    pagination,
    setPagination,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    fabTypeFilter,
    setFabTypeFilter,
    salesPersonFilter,
    setSalesPersonFilter,
    dateRange,
    setDateRange,
    onAddNote
}: CutListTableWithCalculationsProps) => {
    // Use passed pagination state or default to local state
    const [localPagination, setLocalPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });

    const effectivePagination = pagination || localPagination;
    const setEffectivePagination = setPagination || setLocalPagination;

    // Use passed filter states or default to local states
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [localDateFilter, setLocalDateFilter] = useState<string>('all');
    const [localFabTypeFilter, setLocalFabTypeFilter] = useState<string>('all');
    const [localSalesPersonFilter, setLocalSalesPersonFilter] = useState<string>('all');
    const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedFabId, setSelectedFabId] = useState<string>('');

    const effectiveSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
    const setEffectiveSearchQuery = setSearchQuery || setLocalSearchQuery;
    const effectiveDateFilter = dateFilter !== undefined ? dateFilter : localDateFilter;
    const setEffectiveDateFilter = setDateFilter || setLocalDateFilter;
    const effectiveFabTypeFilter = fabTypeFilter !== undefined ? fabTypeFilter : localFabTypeFilter;
    const setEffectiveFabTypeFilter = setFabTypeFilter || setLocalFabTypeFilter;
    const effectiveSalesPersonFilter = salesPersonFilter !== undefined ? salesPersonFilter : localSalesPersonFilter;
    const setEffectiveSalesPersonFilter = setSalesPersonFilter || setLocalSalesPersonFilter;
    const effectiveDateRange = dateRange !== undefined ? dateRange : localDateRange;
    const setEffectiveDateRange = setDateRange || setLocalDateRange;

    // Transform raw FAB data to calculated cut list data
    const calculatedCutLists = useMemo(() => {
        return fabs.map(calculateCutListData);
    }, [fabs]);

    // Get unique fab types - now using the passed fabTypes prop
    const uniqueFabTypes = useMemo(() => {
        // Create a copy before sorting to avoid modifying readonly arrays
        return [...fabTypes].sort();
    }, [fabTypes]);

    // Get unique sales persons - now using the passed salesPersons prop
    const uniqueSalesPersons = useMemo(() => {
        // Create a copy before sorting to avoid modifying readonly arrays
        return [...salesPersons].sort();
    }, [salesPersons]);

    const filteredData = useMemo(() => {
        if (!calculatedCutLists || !Array.isArray(calculatedCutLists)) return [];

        let result = calculatedCutLists;

        // Text search
        if (effectiveSearchQuery) {
            result = result.filter((list) =>
                list.job_name?.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
                list.fab_id?.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
                (list.fab_id_0 && list.fab_id_0.toLowerCase().includes(effectiveSearchQuery.toLowerCase())) ||
                list.job_no?.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
                list.fab_type?.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) ||
                (list.sales_person && list.sales_person.toLowerCase().includes(effectiveSearchQuery.toLowerCase())) ||
                list.cip?.toLowerCase().includes(effectiveSearchQuery.toLowerCase())
            );
        }

        // Date filter based on install_date
        if (effectiveDateFilter !== 'all') {
            result = result.filter((list) => {
                // Handle "unscheduled" filter
                if (effectiveDateFilter === 'unscheduled') {
                    return !list.install_date || list.install_date === '';
                }

                // Handle "scheduled" filter
                if (effectiveDateFilter === 'scheduled') {
                    return list.install_date && list.install_date !== '';
                }

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
                    case 'today':
                        return installDate.toDateString() === today.toDateString();
                    case 'this_week':
                        return installDate >= startOfWeek && installDate <= endOfWeek;
                    case 'this_month':
                        return installDate >= startOfMonth && installDate <= endOfMonth;
                    case 'next_week':
                        return installDate >= startOfNextWeek && installDate <= endOfNextWeek;
                    case 'next_month':
                        return installDate >= startOfNextMonth && installDate <= endOfNextMonth;
                    case 'custom':
                        if (effectiveDateRange?.from && effectiveDateRange?.to) {
                            const start = new Date(effectiveDateRange.from);
                            const end = new Date(effectiveDateRange.to);
                            end.setHours(23, 59, 59, 999);
                            return installDate >= start && installDate <= end;
                        }
                        return true;
                    default:
                        return list.install_date?.includes(effectiveDateFilter);
                }
            });
        }

        // Fab Type filter
        if (effectiveFabTypeFilter !== 'all') {
            result = result.filter((list) => list.fab_type === effectiveFabTypeFilter);
        }

        // Sales Person filter
        if (effectiveSalesPersonFilter !== 'all') {
            if (effectiveSalesPersonFilter === 'no_sales_person') {
                result = result.filter((list) => !list.sales_person || list.sales_person === '');
            } else {
                result = result.filter((list) => list.sales_person === effectiveSalesPersonFilter);
            }
        }

        return result;
    }, [calculatedCutLists, effectiveSearchQuery, effectiveDateFilter, effectiveFabTypeFilter, effectiveSalesPersonFilter, effectiveDateRange]);

    const navigate = useNavigate();

    // Function to handle row click
    const handleRowClickInternal = (list: CalculatedCutListData) => {
        if (onRowClick) {
            onRowClick(list.fab_id);
        } else {
            // Default navigation to cut list details page
            navigate(`/job/cut-list/${list.id}`);
        }
    };

    // Function to handle stage filter change
    const handleStageFilterChange = (stageValue: string) => {
        if (stageValue === 'all') {
            return;
        }

        const selectedStage = Object.values(JOB_STAGES).find(stage => stage.stage === stageValue);
        if (selectedStage) {
            navigate(selectedStage.route);
        }
    };
    const handleView = (id: string) => {
        navigate(`/job/cut-list/${id}`);
    };

    const handleAddNote = (id: string) => {
        setSelectedFabId(id);
        setIsNotesModalOpen(true);
    };

    const handleNoteSubmit = async (note: string, fabId: string) => {
        if (onAddNote) {
            onAddNote(fabId, note);
        }
        // Close modal after submission
        setIsNotesModalOpen(false);
        setSelectedFabId('');
    };

    const handleCloseNotesModal = () => {
        setIsNotesModalOpen(false);
        setSelectedFabId('');
    };

    const baseColumns = useMemo<ColumnDef<CalculatedCutListData>[]>(() => [
        // {
        //     accessorKey: 'id',
        //     accessorFn: (row: CalculatedCutListData) => row.id,
        //     header: () => <DataGridTableRowSelectAll />,
        //     cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        //     enableSorting: false,
        //     enableHiding: false,
        //     enableResizing: false,
        //     size: 48,
        //     meta: {
        //         cellClassName: '',
        //     },
        // },
        {
            id: "fab_type",
            accessorKey: "fab_type",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm uppercase">{row.original.fab_type}</span>,
        },
        {
            id: "fab_id",
            accessorKey: "fab_id",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.fab_id}</span>,
        },
        {
            id: "fab_id_0",
            accessorKey: "fab_id_0",
            header: ({ column }) => (
                <DataGridColumnHeader title="SECOND FAB ID" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.fab_id_0 || 'N/A'}</span>
            ),
        },
        {
            id: "job_name",
            accessorKey: "job_name",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm truncate block max-w-[200px]">
                    {row.original.job_name}
                </span>
            ),
        },
        {
            id: "job_no",
            accessorKey: "job_no",
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} />
            ),
            cell: ({ row }) => (
                row.original.job_id ? (
                    <Link
                        to={`/job/details/${row.original.job_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {row.original.job_no}
                    </Link>
                ) : (
                    <span className="text-sm">{row.original.job_no}</span>
                )
            ),
        },
        {
            id: "no_of_pcs",
            accessorKey: "no_of_pcs",
            header: ({ column }) => (
                <DataGridColumnHeader title="NO OF PCS" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.no_of_pcs.toLocaleString()}
                </span>
            ),
        },
        {
            id: "total_sq_ft",
            accessorKey: "total_sq_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="TOTAL SQ FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm block">
                    {row.original.total_sq_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "wl_ln_ft",
            accessorKey: "wl_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="WJ:LIN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm block">
                    {row.original.wl_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },

        {
            id: "edging_ln_ft",
            accessorKey: "edging_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="Edging: Lin ft" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.edging_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "cnc_ln_ft",
            accessorKey: "cnc_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="CNC: LIN FT " column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.cnc_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "milter_ln_ft",
            accessorKey: "milter_ln_ft",
            header: ({ column }) => (
                <DataGridColumnHeader title="MILTER:LIN FT" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    {row.original.milter_ln_ft.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "cost_of_stone",
            accessorKey: "cost_of_stone",
            header: ({ column }) => (
                <DataGridColumnHeader title="COST OF STONE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    ${row.original.cost_of_stone.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "revenue",
            accessorKey: "revenue",
            header: ({ column }) => (
                <DataGridColumnHeader title="REVENUE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm text-right block">
                    ${row.original.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}
                </span>
            ),
        },
        {
            id: "fp_completed",
            accessorKey: "fp_completed",
            header: ({ column }) => (
                <DataGridColumnHeader title="FP COMPLETED" column={column} />
            ),
            cell: ({ row }) => (
                <span className={`text-sm font-medium ${row.original.fp_completed === 'Yes' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {row.original.fp_completed}
                </span>
            ),
        },
        {
            id: "cip",
            accessorKey: "cip",
            header: ({ column }) => (
                <DataGridColumnHeader title="GP" column={column} />
            ),
            cell: ({ row }) => <span className="text-sm">{row.original.cip}</span>,
        },
        {
            id: "install_date",
            accessorKey: "install_date",
            header: ({ column }) => (
                <DataGridColumnHeader title="INSTALL DATE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.install_date ?
                        new Date(row.original.install_date).toLocaleDateString() :
                        'Not Scheduled'
                    }
                </span>
            ),
        },
        {
            id: "sales_person",
            accessorKey: "sales_person",
            header: ({ column }) => (
                <DataGridColumnHeader title="SALES PERSON" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.sales_person || 'N/A'}
                </span>
            ),
        },
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
    ], [path]);



    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        columns: baseColumns,
        data: filteredData,
        pageCount: Math.ceil(filteredData.length / effectivePagination.pageSize),
        state: { pagination: effectivePagination, sorting },
        onPaginationChange: (updater) => {
            // Handle both functional and direct updates
            const newPagination = typeof updater === 'function'
                ? updater(effectivePagination)
                : updater;
            if (newPagination) {
                setEffectivePagination(newPagination as PaginationState);
            }
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        meta: {
            getRowAttributes: (row: any) => ({
                'data-fab-type': row.original.fab_type?.toLowerCase()
            })
        }
    });

    return (
        <>
            <DataGrid
            table={table}
            recordCount={filteredData.length}
            isLoading={isLoading}
            groupByDate={true}
            dateKey="shop_date_schedule"
            tableLayout={{
                columnsPinnable: true,
                columnsMovable: true,
                columnsVisibility: true,
                cellBorder: true,
            }}
            onRowClick={(row) => handleRowClickInternal(row as CalculatedCutListData)}
        >
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Search Cut Lists..."
                                    value={effectiveSearchQuery}
                                    onChange={(e) => setEffectiveSearchQuery(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
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

                            {/* Fab Type Filter */}
                            <Select value={effectiveFabTypeFilter} onValueChange={setEffectiveFabTypeFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {uniqueFabTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Date Filter */}
                            <div className="flex items-center gap-2">
                                <Select value={effectiveDateFilter} onValueChange={(value) => {
                                    setEffectiveDateFilter(value);
                                    if (value === 'custom') {
                                        setIsDatePickerOpen(false);
                                    }
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Install Date" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="next_week">Next Week</SelectItem>
                                        <SelectItem value="next_month">Next Month</SelectItem>
                                        <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Picker */}
                                {effectiveDateFilter === 'custom' && (
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-[34px]">
                                                <CalendarDays className="h-4 w-4 mr-2" />
                                                {effectiveDateRange?.from ? (
                                                    effectiveDateRange.to ? (
                                                        <>
                                                            {format(effectiveDateRange.from, 'MMM dd')} - {format(effectiveDateRange.to, 'MMM dd, yyyy')}
                                                        </>
                                                    ) : (
                                                        format(effectiveDateRange.from, 'MMM dd, yyyy')
                                                    )
                                                ) : (
                                                    <span>Pick dates</span>
                                                )}
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
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setTempDateRange(undefined);
                                                        setEffectiveDateRange(undefined);
                                                    }}
                                                >
                                                    Reset
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setEffectiveDateRange(tempDateRange);
                                                        setIsDatePickerOpen(false);
                                                    }}
                                                >
                                                    Apply
                                                </Button>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                )}
                            </div>

                            {/* Sales Person Filter */}
                            <Select value={effectiveSalesPersonFilter} onValueChange={setEffectiveSalesPersonFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder="Sales Person" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sales Persons</SelectItem>
                                    <SelectItem value="no_sales_person">No Sales Person</SelectItem>
                                    {uniqueSalesPersons.map((person) => (
                                        <SelectItem key={person || 'N/A'} value={person || ''}>
                                            {person || 'N/A'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Stage filter - only visible to super admins */}
                            {isSuperAdmin && (
                                <Select onValueChange={handleStageFilterChange}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Go to stage" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="all">All Stages</SelectItem>
                                        {Object.values(JOB_STAGES).map((stage) => (
                                            <SelectItem key={stage.stage} value={stage.stage}>
                                                {stage.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardHeading>

                    <CardToolbar>
                        <Button variant="outline" onClick={() => exportTableToCSV(table, "CutList")}>
                            Export CSV
                        </Button>
                    </CardToolbar>
                </CardHeader>

                <CardTable>
                    <ScrollArea>
                        <DataGridTable />
                        <ScrollBar orientation="horizontal" />
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
