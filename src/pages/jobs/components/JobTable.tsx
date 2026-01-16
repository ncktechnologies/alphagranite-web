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
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IJob } from './job';
import { groupData } from '@/lib/groupData';
import { exportTableToCSV } from '@/lib/exportToCsv';
import { useToggleFabOnHoldMutation } from '@/store/api/job';
import { Switch } from '@/components/ui/switch';
import ActionsCell from '../roles/sales/action';
import { useNavigate, Link } from 'react-router-dom';
import { JOB_STAGES } from '@/hooks/use-job-stage';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
// Replace date-fns format with timezone-aware utilities
import { formatDateRange, formatForDisplay } from '@/utils/date-utils';
import { useTableState } from '@/hooks/use-table-state';

interface JobTableProps {
    jobs: IJob[];
    path: string;
    getPath?: (job: IJob) => string;
    isSuperAdmin?: boolean;
    isLoading?: boolean;
    onRowClick?: (fabId: string) => void;
    showScheduleFilter?: boolean;
    // Optional sales person filter
    showSalesPersonFilter?: boolean;
    salesPersons?: string[];
    // Custom label for sales person filter (defaults to "Sales Person")
    salesPersonFilterLabel?: string;
    // Optional templater filter
    showTemplaterFilter?: boolean;
    templaters?: string[];
    templaterFilter?: string;
    setTemplaterFilter?: (value: string) => void;
    // Backend pagination props (optional)
    useBackendPagination?: boolean;
    totalRecords?: number;
    tableState?: ReturnType<typeof useTableState>;
    // Specify which columns to show (if not provided, show all)
    visibleColumns?: string[];
    // Multi-select functionality
    enableMultiSelect?: boolean;
    selectedRows?: string[];
    setSelectedRows?: (rows: string[]) => void;
    // Additional button props
    showAssignDrafterButton?: boolean;
    onAssignDrafterClick?: () => void;
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
    setTemplaterFilter = () => {},
    useBackendPagination = false,
    totalRecords = 0,
    tableState,
    visibleColumns,
    enableMultiSelect = false,
    selectedRows = [],
    setSelectedRows = () => {},
    showAssignDrafterButton = false,
    onAssignDrafterClick = () => {}
}: JobTableProps) => {
    const [localSelectedRows, setLocalSelectedRows] = useState<string[]>([]);
    const [localPagination, setLocalPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 5,
    });
    const [localSorting, setLocalSorting] = useState<SortingState>([]);
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [localDateFilter, setLocalDateFilter] = useState<string>('all');
    const [localFabTypeFilter, setLocalFabTypeFilter] = useState<string>('all');
    const [localSalesPersonFilter, setLocalSalesPersonFilter] = useState<string>('all');
    const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(undefined);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const navigate = useNavigate();
    
    const [toggleFabOnHold] = useToggleFabOnHoldMutation();

    // Use backend state if available, otherwise use local state
    const pagination = tableState?.pagination || localPagination;
    const setPagination = tableState?.setPagination || setLocalPagination;
    const sorting = tableState?.sorting || localSorting;
    const setSorting = tableState?.setSorting || setLocalSorting;
    const searchQuery = tableState?.searchQuery || localSearchQuery;
    const setSearchQuery = tableState?.setSearchQuery || setLocalSearchQuery;
    const dateFilter = tableState?.dateFilter || localDateFilter;
    const setDateFilter = tableState?.setDateFilter || setLocalDateFilter;
    const fabTypeFilter = tableState?.fabTypeFilter || localFabTypeFilter;
    const setFabTypeFilter = tableState?.setFabTypeFilter || setLocalFabTypeFilter;
    const salesPersonFilter = (tableState as any)?.salesPersonFilter || localSalesPersonFilter;
    const setSalesPersonFilter = (tableState as any)?.setSalesPersonFilter || localSalesPersonFilter;
    const dateRange = tableState?.dateRange || localDateRange;
    
    // Helper function to safely render date range
    const renderDateRange = () => {
        if (dateRange && dateRange.from) {
            if (dateRange.to) {
                // Use US format for date range
                return <>{formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')} - {formatForDisplay(dateRange.to, 'DISPLAY_US_FORMAT')}</>;
            } else {
                // Use US format for single date
                return <>{formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')}</>;
            }
        }
        return <span>Pick dates</span>;
    };
    
    const setDateRange = tableState?.setDateRange || setLocalDateRange;
    const scheduleFilter = tableState?.scheduleFilter || 'all';
    const setScheduleFilter = tableState?.setScheduleFilter || (() => { }); // No-op fallback
    
    // Use provided state if available, otherwise use local state
    const effectiveSelectedRows = selectedRows !== undefined ? selectedRows : localSelectedRows;
    const setEffectiveSelectedRows = setSelectedRows || setLocalSelectedRows;
    
    // Function to get the correct path for a specific job
    const getViewPath = (job: IJob): string => {
        // If getPath function is provided, use it
        if (getPath) {
            return getPath(job);
        }
        // Otherwise use the old static path
        return path;
    };

    // Updated handleView function that uses getViewPath
    const handleView = (job: IJob) => {
        const viewPath = getViewPath(job);
        navigate(`/job/${viewPath}/${job.fab_id}`);
    };

    // Function to handle row click
    const handleRowClickInternal = (job: IJob) => {
        if (onRowClick) {
            onRowClick(job.fab_id);
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

    // Filter and other logic remain the same...
    const fabTypes = useMemo(() => {
        const types = Array.from(new Set(jobs.map(job => job.fab_type).filter(Boolean)));
        return types.sort();
    }, [jobs]);

    // Get unique sales persons from jobs data
    const uniqueSalesPersons = useMemo(() => {
        const persons = Array.from(new Set(jobs.map(job => job.sales_person_name).filter(Boolean)));
        return persons.sort();
    }, [jobs]);

    const filteredData = useMemo(() => {
        // Skip client-side filtering if using backend pagination
        if (useBackendPagination) {
            // Even with backend pagination, we still need to sort by date
            let result = jobs;

            // Sort by date: items with dates first (oldest first), then items without dates
            result = result.sort((a, b) => {
                const getValidDate = (dateValue: any): number | null => {
                    // Handle null, undefined, or non-string values
                    if (dateValue == null) {
                        return null;
                    }

                    // Convert to string and trim
                    const dateStr = String(dateValue).trim();

                    // Check for empty strings, dashes, or other placeholder values
                    if (dateStr === '' || dateStr === '-' || dateStr.toLowerCase() === 'null' || dateStr.toLowerCase() === 'undefined') {
                        return null;
                    }

                    try {
                        const date = new Date(dateStr);
                        // Check if date is valid
                        if (isNaN(date.getTime())) {
                            return null;
                        }
                        return date.getTime();
                    } catch {
                        return null;
                    }
                };

                const dateA = getValidDate(a.date);
                const dateB = getValidDate(b.date);

                // Both have valid dates: sort by oldest first
                if (dateA !== null && dateB !== null) {
                    return dateA - dateB;
                }

                // Only A has valid date: A comes first (before B)
                if (dateA !== null && dateB === null) {
                    return -1;
                }

                // Only B has valid date: B comes first (before A)
                if (dateA === null && dateB !== null) {
                    return 1;
                }

                // Neither has valid date: maintain original order
                return 0;
            });

            return result;
        }

        let result = jobs;

        // Text search
        if (searchQuery) {
            result = result.filter((job) =>
                job.job_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.job_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.fab_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.template_schedule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.templater?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Date filter (only apply client-side filtering when not using backend pagination)
        if (!useBackendPagination && dateFilter !== 'all' && dateFilter !== 'custom') {
            result = result.filter((job) => {
                if (!job.date) return false;
                
                const jobDate = new Date(job.date);
                const today = new Date();
                
                // Reset time part for accurate date comparison
                const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                
                // Calculate week boundaries
                const startOfWeek = new Date(todayDate);
                startOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                const startOfLastWeek = new Date(startOfWeek);
                startOfLastWeek.setDate(startOfWeek.getDate() - 7);
                const endOfLastWeek = new Date(startOfWeek);
                endOfLastWeek.setDate(startOfWeek.getDate() - 1);
                
                const startOfNextWeek = new Date(endOfWeek);
                startOfNextWeek.setDate(endOfWeek.getDate() + 1);
                const endOfNextWeek = new Date(startOfNextWeek);
                endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
                
                // Calculate month boundaries
                const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
                const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
                
                const startOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
                const endOfLastMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
                
                const startOfNextMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
                const endOfNextMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 2, 0);
                
                switch (dateFilter) {
                    case 'today':
                        return jobDate.toDateString() === todayDate.toDateString();
                    case 'this_week':
                        return jobDate >= startOfWeek && jobDate <= endOfWeek;
                    case 'last_week':
                        return jobDate >= startOfLastWeek && jobDate <= endOfLastWeek;
                    case 'this_month':
                        return jobDate >= startOfMonth && jobDate <= endOfMonth;
                    case 'last_month':
                        return jobDate >= startOfLastMonth && jobDate <= endOfLastMonth;
                    case 'next_week':
                        return jobDate >= startOfNextWeek && jobDate <= endOfNextWeek;
                    case 'next_month':
                        return jobDate >= startOfNextMonth && jobDate <= endOfNextMonth;
                    default:
                        return true;
                }
            });
        }

        // Custom date range filter
        if (!useBackendPagination && dateFilter === 'custom' && dateRange?.from) {
            result = result.filter((job) => {
                if (!job.date) return false;
                
                const jobDate = new Date(job.date);
                const startDate = new Date(dateRange.from);
                const endDate = dateRange.to ? new Date(dateRange.to) : startDate;
                
                // Set end time to end of day
                endDate.setHours(23, 59, 59, 999);
                
                return jobDate >= startDate && jobDate <= endDate;
            });
        }

        // Date filter
        if (showScheduleFilter && scheduleFilter !== 'all') {
            if (scheduleFilter === 'scheduled') {
                result = result.filter((job) => job.date && job.date !== '');
            } else if (scheduleFilter === 'unscheduled') {
                result = result.filter((job) => !job.date || job.date === '');
            }
        }

        // Fab Type filter
        if (fabTypeFilter !== 'all') {
            result = result.filter((job) => job.fab_type === fabTypeFilter);
        }

        // Schedule filter (only apply client-side filtering when not using backend pagination)
        if (!useBackendPagination && scheduleFilter !== 'all') {
            if (scheduleFilter === 'scheduled') {
                result = result.filter((job) => job.date && job.date !== '');
            } else if (scheduleFilter === 'unscheduled') {
                result = result.filter((job) => !job.date || job.date === '');
            }
        }

        // Sales Person filter (only apply client-side filtering when not using backend pagination)
        if (!useBackendPagination && showSalesPersonFilter && salesPersonFilter !== 'all') {
            if (salesPersonFilter === 'no_sales_person') {
                result = result.filter((job) => !job.sales_person_name || job.sales_person_name === '');
            } else {
                result = result.filter((job) => job.sales_person_name === salesPersonFilter);
            }
        }

        // Sort by date: items with dates first (oldest first), then items without dates
        result = result.sort((a, b) => {
            const getValidDate = (dateValue: any): number | null => {
                // Handle null, undefined, or non-string values
                if (dateValue == null) {
                    return null;
                }

                // Convert to string and trim
                const dateStr = String(dateValue).trim();

                // Check for empty strings, dashes, or other placeholder values
                if (dateStr === '' || dateStr === '-' || dateStr.toLowerCase() === 'null' || dateStr.toLowerCase() === 'undefined') {
                    return null;
                }

                try {
                    const date = new Date(dateStr);
                    // Check if date is valid
                    if (isNaN(date.getTime())) {
                        return null;
                    }
                    return date.getTime();
                } catch {
                    return null;
                }
            };

            const dateA = getValidDate(a.date);
            const dateB = getValidDate(b.date);

            // Both have valid dates: sort by oldest first
            if (dateA !== null && dateB !== null) {
                return dateA - dateB;
            }

            // Only A has valid date: A comes first (before B)
            if (dateA !== null && dateB === null) {
                return -1;
            }

            // Only B has valid date: B comes first (before A)
            if (dateA === null && dateB !== null) {
                return 1;
            }

            // Neither has valid date: maintain original order
            return 0;
        });

        return result;
    }, [searchQuery, dateFilter, fabTypeFilter, scheduleFilter, dateRange, jobs, useBackendPagination, salesPersonFilter]);

    // Function to check if a column has any data
    const columnHasData = (accessorKey: string) => {
        return filteredData.some(job => {
            const value = job[accessorKey as keyof IJob];
            return value !== null && value !== undefined && value !== '';
        });
    };

    // Function to handle multi-select
    const toggleRowSelection = (fabId: string) => {
        if (setSelectedRows) {
            // Using prop-provided state - update directly
            if (effectiveSelectedRows.includes(fabId)) {
                setSelectedRows(effectiveSelectedRows.filter(id => id !== fabId));
            } else {
                setSelectedRows([...effectiveSelectedRows, fabId]);
            }
        } else {
            // Using local state - can use functional update
            setLocalSelectedRows(prevSelectedRows => {
                if (prevSelectedRows.includes(fabId)) {
                    return prevSelectedRows.filter(id => id !== fabId);
                } else {
                    return [...prevSelectedRows, fabId];
                }
            });
        }
    };

    const toggleAllRowsSelection = () => {
        if (setSelectedRows) {
            // Using prop-provided state - update directly
            const allFabIds = filteredData.map(job => job.fab_id);
            if (effectiveSelectedRows.length === allFabIds.length) {
                setSelectedRows([]);
            } else {
                setSelectedRows(allFabIds);
            }
        } else {
            // Using local state - can use functional update
            setLocalSelectedRows(prevSelectedRows => {
                const allFabIds = filteredData.map(job => job.fab_id);
                if (prevSelectedRows.length === allFabIds.length) {
                    return [];
                } else {
                    return allFabIds;
                }
            });
        }
    };

    // Function to get row background color based on fab_type
    const getRowBackgroundColor = (fabType: string) => {
        switch (fabType?.toLowerCase()) {
            case 'standard':
                return 'bg-green-50 hover:bg-green-100';
            case 'cust redo':
                return 'bg-yellow-50 hover:bg-yellow-100';
            case 'fast track':
                return 'bg-red-50 hover:bg-red-100';
            default:
                return '';
        }
    };

    // Function to generate fab info string
    const generateFabInfo = (job: IJob) => {
    const parts = [];
    
    // Add account name if available
    if (job.acct_name) {
        parts.push(job.acct_name);
    }
    
    // Add job details
    // if (job.job_name) {
    //     parts.push(job.job_name);
    // }
    
    // // Add job number
    // if (job.job_no) {
    //     parts.push(job.job_no);
    // }
    
    // Add pieces count
    // if (job.no_of_pieces) {
    //     parts.push(`${job.no_of_pieces} pieces`);
    // }
    
    // Add square footage
    if (job.total_sq_ft) {
        parts.push(`${job.total_sq_ft} sq ft`);
    }

    // Add material specifications if available
    if (job.stone_type_name) {
        parts.push(`Stone: ${job.stone_type_name}`);
    }
    
    if (job.stone_color_name) {
        parts.push(`Color: ${job.stone_color_name}`);
    }
    
    if (job.stone_thickness_value) {
        parts.push(`Thickness: ${job.stone_thickness_value}`);
    }
    
    if (job.edge_name) {
        parts.push(`Edge: ${job.edge_name}`);
    }
    
    return parts.join(' - ');
};

    const baseColumns = useMemo<ColumnDef<IJob>[]>(() => [
        {
            accessorKey: 'id',
            accessorFn: (row: IJob) => row.id,
            header: () => enableMultiSelect ? 
                <div className="w-full h-full flex items-center justify-center">
                    <Checkbox 
                        checked={effectiveSelectedRows.length === filteredData.length && filteredData.length > 0}
                        onCheckedChange={toggleAllRowsSelection}
                        aria-label="Select all"
                    />
                </div> : <></>,
            cell: ({ row }) => enableMultiSelect ? 
                <div className="w-full h-full flex items-center justify-center">
                    <Checkbox 
                        checked={effectiveSelectedRows.includes(row.original.fab_id)}
                        onCheckedChange={() => toggleRowSelection(row.original.fab_id)}
                        aria-label="Select row"
                    />
                </div> : <></>,
            enableSorting: false,
            enableHiding: false,
            enableResizing: false,
            size: 48,
            meta: {
                cellClassName: 'flex items-center justify-center h-full min-h-[40px] align-middle p-0',
                headerClassName: '!px-2',
            },
        },
        {
            id: "fab_type",
            accessorKey: "fab_type",
            accessorFn: (row: IJob) => row.fab_type,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB TYPE" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs uppercase">{row.original.fab_type}</span>,
            size: 100,
        },
        {
            id: "on_hold",
            accessorKey: "on_hold",
            accessorFn: (row: IJob) => row.on_hold,
            header: ({ column }) => (
                <DataGridColumnHeader title="ON HOLD" column={column} />
            ),
            cell: ({ row }) => {
                const fabId = parseInt(row.original.fab_id);
                return (
                    <div className="flex justify-center">
                        <Switch
                            checked={row.original.on_hold}
                            onCheckedChange={async (checked) => {
                                try {
                                    await toggleFabOnHold(fabId).unwrap();
                                    // Update the row data to reflect the change
                                    row.original.on_hold = checked;
                                } catch (error) {
                                    console.error('Failed to toggle on hold status:', error);
                                }
                            }}
                            aria-label="Toggle on hold"
                        />
                    </div>
                );
            },
            enableSorting: false,
            size: 80,
        },
        {
            id: "fab_id",
            accessorKey: "fab_id",
            accessorFn: (row: IJob) => row.fab_id,
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB ID" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.fab_id}</span>,
            size: 80,
        },
        {
            id: "job_name",
            accessorKey: "job_name",
            accessorFn: (row: IJob) => row.job_name,
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[180px]">
                    {row.original.job_name}
                </span>
            ),
            size: 160,
        },
        {
            id: "job_no",
            accessorKey: "job_no",
            accessorFn: (row: IJob) => row.job_no,
            header: ({ column }) => (
                <DataGridColumnHeader title="JOB NO" column={column} />
            ),
            cell: ({ row }) => (
                row.original.job_id ? (
                    <Link
                        to={`/job/details/${row.original.job_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {row.original.job_no}
                    </Link>
                ) : (
                    
                    <span className="text-xs">{row.original.job_no}</span>
                )
            ),
            size: 100,
        },
        {
            id: "template_needed",
            accessorKey: "template_needed",
            accessorFn: (row: IJob) => row.template_needed,
            header: ({ column }) => (
                <DataGridColumnHeader title="Template not needed" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.template_needed}</span>,
            size: 120,
        },
        {
            id: "acct_name",
            accessorKey: "acct_name",
            accessorFn: (row: IJob) => row.acct_name,
            header: ({ column }) => (
                <DataGridColumnHeader title="ACCT NAME" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[140px]">
                    {row.original.acct_name}
                </span>
            ),
            size: 120,
        },
        {
            id: "no_of_pieces",
            accessorKey: "no_of_pieces",
            accessorFn: (row: IJob) => row.no_of_pieces,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="No. of pieces" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[110px]">
                    {row.original.no_of_pieces}
                </span>
            ),
            size: 100,
        },
     
        {
            id: "template_schedule",
            accessorKey: "template_schedule",
            accessorFn: (row: IJob) => row.template_schedule,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="TEMPLATE SCHEDULE" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs">{row.original.template_schedule}</span>
            ),
            enableSorting: false, // Disable sorting since we pre-sort the data
            size: 120,
        },
        {
            id: "template_received",
            accessorKey: "template_received",
            accessorFn: (row: IJob) => row.template_received,
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATE RECEIVED" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs">{row.original.template_received}</span>
            ),
            size: 120,
        },
        {
            id: "templater",
            accessorKey: "templater",
            accessorFn: (row: IJob) => row.templater,
            header: ({ column }) => (
                <DataGridColumnHeader title="TEMPLATER" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.templater}</span>,
            size: 130,
        },
        {
            id: "drafter",
            accessorKey: "drafter",
            accessorFn: (row: IJob) => row.drafter,
            header: ({ column }) => (
                <DataGridColumnHeader title="DRAFTER" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.drafter}</span>,
            size: 130,
        },
        {
            id: "total_sq_ft",
            accessorKey: "total_sq_ft",
            accessorFn: (row: IJob) => row.total_sq_ft,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Total Sq ft " column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[100px]">
                    {row.original.total_sq_ft}
                </span>
            ),
            size: 100,
        },
            {
            id: "revisor",
            accessorKey: "revisor",
            accessorFn: (row: IJob) => row.revisor,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revisor" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[120px]">
                    {row.original.revisor}
                </span>
            ),
            size: 100,
        },
        {
            id: "revised",
            accessorKey: "revised",
            accessorFn: (row: IJob) => row.revised,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revised?" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[100px]">
                    {row.original.revised}
                </span>
            ),
            size: 80,
        },
        {
            id: "revision_completed",
            accessorKey: "revision_completed",
            accessorFn: (row: IJob) => row.revised,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revision completed" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[160px]">
                    {row.original.revision_completed}
                </span>
            ),
            size: 130,
        },
        {
            id: "revision_number",
            accessorKey: "revision_number",
            accessorFn: (row: IJob) => row.revision_number,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revision #" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[80px]">
                    {row.original.revision_number}
                </span>
            ),
            size: 100,
        },
        {
            id: "revision_reason",
            accessorKey: "revision_reason",
            accessorFn: (row: IJob) => row.revision_reason,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revision reason" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[200px]" title={row.original.revision_reason}>
                    {row.original.revision_reason}
                </span>
            ),
            size: 150,
        },
        {
            id: "revision_type",
            accessorKey: "revision_type",
            accessorFn: (row: IJob) => row.revision_type,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revision type" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[120px]">
                    {row.original.revision_type}
                </span>
            ),
            size: 120,
        },
        {
            id: "revenue",
            accessorKey: "revenue",
            accessorFn: (row: IJob) => row.revenue,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Revenue" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[160px]">
                    {row.original.revenue}
                </span>
            ),
            size: 110,
        },
        {
            id: "gp",
            accessorKey: "gp",
            accessorFn: (row: IJob) => row.gp,
            header: ({ column }) => (
                <DataGridColumnHeader title="GP" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm">{row.original.gp}</span>
            ),
            size: 80,
        },
        {
            id: "sct_completed",
            accessorKey: "sct_completed",
            accessorFn: (row: IJob) => row.sct_completed,
            header: ({ column }) => (
                <DataGridColumnHeader className='uppercase' title="Sct Completed" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[160px]">
                    {row.original.sct_completed}
                </span>
            ),
            size: 120,
        },
        {
            id: "draft_completed",
            accessorKey: "draft_completed",
            accessorFn: (row: IJob) => row.draft_completed,
            header: ({ column }) => (
                <DataGridColumnHeader title="DRAFT Status" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[160px]">
                    {row.original.draft_completed}
                </span>
            ),
            size: 130,
        },
        {
            id: "review_completed",
            accessorKey: "review_completed",
            accessorFn: (row: IJob) => row.review_completed,
            header: ({ column }) => (
                <DataGridColumnHeader title="REVIEW COMPLETED" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-sm break-words max-w-[160px]">
                    {row.original.review_completed}
                </span>
            ),
            size: 140,
        },
        {
            id: "fab_info",
            header: ({ column }) => (
                <DataGridColumnHeader title="FAB INFO" column={column} />
            ),
            cell: ({ row }) => (
                <span className="text-xs break-words max-w-[300px]">
                    {generateFabInfo(row.original)}
                </span>
            ),
            size: 300,
        },
        // Templating Notes Column
        {
            id: 'templating_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Templating Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = row.original.fab_notes || row.original.notes || [];
                const templatingNotes = fabNotes.filter(note => note.stage === 'templating');
                
                if (templatingNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = templatingNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-blue-700 truncate">T:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Drafting Notes Column
        {
            id: 'drafting_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Drafting Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const draftNotes = fabNotes.filter(note => note.stage === 'drafting');
                
                if (draftNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = draftNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-green-700 truncate">D:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Final Programming Notes Column
        {
            id: 'final_programming_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const fpNotes = fabNotes.filter(note => note.stage === 'cut_list');
                
                if (fpNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = fpNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-purple-700 truncate">FP:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Pre-Draft Notes Column
        {
            id: 'pre_draft_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Pre-Draft Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const preDraftNotes = fabNotes.filter(note => note.stage === 'pre_draft_review');
                
                if (preDraftNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = preDraftNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-indigo-700 truncate">PD:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Cutting Notes Column
        {
            id: 'cutting_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Cutting Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const cuttingNotes = fabNotes.filter(note => note.stage === 'cutting');
                
                if (cuttingNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = cuttingNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-orange-700 truncate">C:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Slab Smith Notes Column
        {
            id: 'slabsmith_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Slab Smith Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const slabSmithNotes = fabNotes.filter(note => note.stage === 'slab_smith_request');
                
                if (slabSmithNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = slabSmithNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-red-700 truncate">SS:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // SCT Notes Column
        {
            id: 'sct_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="SCT Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const sctNotes = fabNotes.filter(note => note.stage === 'sales_ct');
                
                if (sctNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = sctNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-yellow-700 truncate">SCT:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Draft/Revision Notes Column
        {
            id: 'draft_revision_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Draft/Revision Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const draftRevisionNotes = fabNotes.filter(note => 
                    note.stage === 'draft' || note.stage === 'revisions'
                );
                
                if (draftRevisionNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = draftRevisionNotes[0];
                const stagePrefix = latestNote.stage === 'draft' ? 'D:' : 'R:';
                const textColor = latestNote.stage === 'draft' ? 'text-green-700' : 'text-purple-700';
                
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className={`font-medium ${textColor} truncate`}>{stagePrefix}</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // Draft Notes Column
        {
            id: 'draft_notes',
            header: ({ column }) => (
                <DataGridColumnHeader title="Draft Notes" column={column} />
            ),
            cell: ({ row }) => {
                const fabNotes = Array.isArray(row.original.fab_notes) ? row.original.fab_notes : 
                               Array.isArray(row.original.notes) ? row.original.notes : [];
                const draftNotes = fabNotes.filter(note => note.stage === 'drafting');
                
                if (draftNotes.length === 0) {
                    return <span className="text-xs text-gray-500 italic">No notes</span>;
                }
                
                const latestNote = draftNotes[0];
                return (
                    <div className="text-xs max-w-xs" title={latestNote.note}>
                        <div className="font-medium text-green-700 truncate">D:</div>
                        <div className="truncate">{latestNote.note}</div>
                        <div className="text-gray-500 text-xs">by {latestNote.created_by_name || 'Unknown'}</div>
                    </div>
                );
            },
            enableSorting: false,
            size: 180,
        },
        
        // File Column
        {
            id: 'file',
            accessorKey: 'file',
            accessorFn: (row: IJob) => row.file,
            header: ({ column }) => (
                <DataGridColumnHeader title="FILE" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.file || '-'}</span>,
            size: 120,
        },
        
        // Notes Column
        {
            id: 'shop_date_scheduled',
            accessorKey: 'shop_date_scheduled',
            accessorFn: (row: IJob) => row.shop_date_scheduled,
            header: ({ column }) => (
                <DataGridColumnHeader title="SHOP DATE SCHEDULED" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.shop_date_scheduled || '-'}</span>,
            size: 150,
        },
        {
            id: 'wj_time_minutes',
            accessorKey: 'wj_time_minutes',
            accessorFn: (row: IJob) => row.wj_time_minutes,
            header: ({ column }) => (
                <DataGridColumnHeader title="WJ TIME MINUTES" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.wj_time_minutes || '-'}</span>,
            size: 150,
        },
        {
            id: 'final_programming_completed',
            accessorKey: 'final_programming_completed',
            accessorFn: (row: IJob) => row.final_programming_completed,
            header: ({ column }) => (
                <DataGridColumnHeader title="FINAL PROGRAMMING COMPLETED" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.final_programming_completed || '-'}</span>,
            size: 150,
        },
        {
            id: 'final_programmer',
            accessorKey: 'final_programmer',
            accessorFn: (row: IJob) => row.final_programmer,
            header: ({ column }) => (
                <DataGridColumnHeader title="FINAL PROGRAMMER" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{row.original.final_programmer || '-'}</span>,
            size: 150,
        },
        {
            id: 'notes',
            accessorKey: 'notes',
            accessorFn: (row: IJob) => typeof row.notes === 'string' ? row.notes : '',
            header: ({ column }) => (
                <DataGridColumnHeader title="NOTES" column={column} />
            ),
            cell: ({ row }) => <span className="text-xs">{typeof row.original.notes === 'string' ? row.original.notes : '-'}</span>,
            size: 150,
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <ActionsCell
                    row={row}
                    onView={() => handleView(row.original)} // Pass the job object
                />
            ),
            enableSorting: false,
            size: 60,
        },
    ], [getPath, path, dateRange, enableMultiSelect, effectiveSelectedRows, filteredData]); // Add dependencies for multi-select functionality

    // Filter columns based on data availability and visibleColumns prop
    const columns = useMemo<ColumnDef<IJob>[]>(() => {
        return baseColumns.filter(column => {
            // Always show ID column if multi-select is enabled, and actions column
            if ((column.id === 'id' && enableMultiSelect) || column.id === 'actions') {
                return true;
            }
            
            // If visibleColumns is specified, only show those columns (excluding id/actions which are handled separately)
            if (visibleColumns && visibleColumns.length > 0 && column.id) {
                return visibleColumns.includes(column.id as string);
            }
            
            // Otherwise, filter based on data availability
            const accessor = (column as any).accessorKey as string | undefined;
            if (accessor) {
                return columnHasData(accessor);
            }
            return true;
        });
    }, [baseColumns, filteredData, visibleColumns, enableMultiSelect]);

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
        manualSorting: true, // Enable manual sorting to respect pre-sorted data
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
            {/* Rest of your component remains the same... */}
            <Card>
                <CardHeader className="py-3.5 border-b">
                    <CardHeading>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="relative">
                                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Search by job, Fab ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-9 w-[230px] h-[34px]"
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

                            {/* Fab Type Filter */}
                            <Select value={fabTypeFilter} onValueChange={setFabTypeFilter}>
                                <SelectTrigger className="w-[150px] h-[34px]">
                                    <SelectValue placeholder="Fab Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fab Types</SelectItem>
                                    {fabTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Enhanced Date Filter */}
                            <div className="flex items-center gap-2">
                                <Select value={dateFilter} onValueChange={(value) => {
                                    setDateFilter(value);
                                    if (value === 'custom') {
                                        setIsDatePickerOpen(true);
                                    }
                                }}>
                                    <SelectTrigger className="w-[170px] h-[34px]">
                                        <SelectValue placeholder="Filter by date" />
                                    </SelectTrigger>
                                    <SelectContent className="w-48">
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="this_week">This Week</SelectItem>
                                        <SelectItem value="last_week">Last Week</SelectItem>
                                        <SelectItem value="this_month">This Month</SelectItem>
                                        <SelectItem value="last_month">Last Month</SelectItem>
                                        <SelectItem value="next_week">Next Week</SelectItem>
                                        <SelectItem value="next_month">Next Month</SelectItem>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Custom Date Range Picker - TIMEZONE AWARE */}
                                {dateFilter === 'custom' && (
                                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-[34px]">
                                                <CalendarDays className="h-4 w-4 mr-2" />
                                               {renderDateRange()}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                // Use timezone-consistent month navigation
                                                defaultMonth={tempDateRange?.from ? new Date(tempDateRange.from) : new Date()}
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
                                                        setDateRange(undefined);
                                                    }}
                                                >
                                                    Reset
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setDateRange(tempDateRange);
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

                            {/* Schedule Filter */}
                            {showScheduleFilter && (
                                <Select value={scheduleFilter} onValueChange={setScheduleFilter}>
                                    <SelectTrigger className="w-[150px] h-[34px]">
                                        <SelectValue placeholder="Schedule Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="unscheduled">Unscheduled</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Sales Person Filter */}


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
                        {showSalesPersonFilter && uniqueSalesPersons && uniqueSalesPersons.length > 0 && (
                            <Select value={salesPersonFilter} onValueChange={setSalesPersonFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder={salesPersonFilterLabel} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{salesPersonFilterLabel.includes("Templater") ? "All Templaters" : "All Sales Persons"}</SelectItem>
                                    <SelectItem value="no_sales_person">{salesPersonFilterLabel.includes("Templater") ? "No Templater" : "No Sales Person"}</SelectItem>
                                    {uniqueSalesPersons.map((person) => (
                                        <SelectItem key={person || 'N/A'} value={person || ''}>
                                            {person || 'N/A'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        
                        {showTemplaterFilter && templaters && templaters.length > 0 && (
                            <Select value={templaterFilter} onValueChange={setTemplaterFilter}>
                                <SelectTrigger className="w-[180px] h-[34px]">
                                    <SelectValue placeholder="Filter by Templater" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Templaters</SelectItem>
                                    <SelectItem value="no_templater">No Templater Assigned</SelectItem>
                                    {templaters.map((templater) => (
                                        <SelectItem key={templater} value={templater}>
                                            {templater}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {showAssignDrafterButton && (
                            <Button 
                                variant="outline" 
                                onClick={onAssignDrafterClick}
                                disabled={selectedRows.length === 0}
                            >
                                Assign Drafter ({selectedRows.length})
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => exportTableToCSV(table, "FabId")}>
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
        </>
    );
};