import { useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, X, CalendarDays } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useTableState } from '@/hooks/use-table-state';
import { useGetFabsCompletionQuery, useGetFabsQuery } from '@/store/api/job';
import { formatForDisplay } from '@/utils/date-utils';
import { IJob } from '../jobs/components/job';
import { current } from '@reduxjs/toolkit';

// Helper: format date to "08 Oct, 2025"
const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    } catch {
        return '-';
    }
};

// Transform API fab object to the shape expected by the card
const transformFabToJobCard = (fab: any): IJob => ({
    id: fab.id,
    fab_id: String(fab.id),
    job_no: String(fab.job_details?.job_number),
    input_area: fab.input_area || '-',
    total_sq_ft: String(fab.total_sqft || '-'),
    install_date: fab.install_details?.scheduled_install_date
        ? formatDate(fab.install_details.scheduled_install_date)
        : '-',
    // Minimal other fields to satisfy IJob interface
    fab_type: fab.fab_type,
    job_name: '',
    date: '',
    shop_est_completion_date: '',
    current_stage: fab.current_stage,
    sales_person_name: '',
    acct_name: '',
    template_received: '',
    template_needed: '',
    revenue: '',
    gp: '',
    revised: '',
    sct_completed: '',
    draft_completed: '',
    review_completed: '',
    template_schedule: '',
    templater: '',
    stone_type_name: '',
    stone_color_name: '',
    stone_thickness_value: '',
    edge_name: '',
    fab_notes: [],
    job_id: fab.job_id,
    on_hold: fab.on_hold,
    status_id: fab.status_id,
    no_of_pieces: '',
    est_completion_date: '',
    completion_date: '',
    installer: '',
    install_confirmed: undefined,
    shop_status: '',
});

export function InstallerScheduleCards() {
    const navigate = useNavigate();

    // Use the same table state hook as JobTable – includes searchType, dateRange, etc.
    const tableState = useTableState({
        tableId: 'installer-cards',
        defaultPagination: { pageIndex: 0, pageSize: 9 }, // 3x3 grid
        defaultDateFilter: 'all',
        persistState: false,
    });

    const {
        searchQuery,
        setSearchQuery,
        searchType,
        setSearchType,
        dateFilter,
        setDateFilter,
        pagination,
        setPagination,
        dateRange,
        setDateRange,
    } = tableState;

    // Local state for custom date picker
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

    const skip = pagination.pageIndex * pagination.pageSize;

    // Build query params for the API (matches JobTable logic)
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: pagination.pageSize,
            current_stage: 'install_completion',
        };
        if (searchQuery) {
            params.search = searchQuery;
            params.type = searchType || 'fab_id';
        }
        if (dateFilter && dateFilter !== 'all') {
            if (dateFilter === 'custom' && dateRange?.from) {
                params.template_completed_start = format(dateRange.from, 'yyyy-MM-dd');
                if (dateRange.to) {
                    params.template_completed_end = format(dateRange.to, 'yyyy-MM-dd');
                }
            } else if (dateFilter !== 'custom') {
                params.date_filter = dateFilter;
            }
        }
        return params;
    }, [skip, pagination.pageSize, searchQuery, searchType, dateFilter, dateRange]);

    const { data, isLoading, isError } = useGetFabsQuery(queryParams);

    const jobs: IJob[] = data?.data?.map(transformFabToJobCard) || [];
    const totalRecords = data?.total || 0;

    const handlePageChange = (newPageIndex: number) => {
        setPagination({ ...pagination, pageIndex: newPageIndex });
    };

    const handleCardClick = (jobId: string) => {
        navigate(`/app/jobs/install-to-schedule/${jobId}`);
    };

    // Loading skeletons
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-[#e6e8f0] shadow-sm p-5">
                        <div className="flex gap-4">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                        <Skeleton className="h-px w-full my-4" />
                        <div className="space-y-3">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="text-center py-12 mt-6">
                <p className="text-red-500">Failed to load installation data. Please try again later.</p>
            </div>
        );
    }

    // Empty state


    return (
        <div>
            {/* Filter bar – exactly as in JobTable */}
            <div className="flex items-center gap-2.5 flex-wrap mt-6 mb-6">
                {/* Search input with type selector */}
                <div className="relative flex items-center">
                    <Select value={searchType || 'fab_id'} onValueChange={(v) => setSearchType(v as any)}>
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
                            placeholder={`Search by ${(searchType || 'fab_id').replace('_', ' ')}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                {/* Date filter (same as JobTable) */}
                <div className="flex items-center gap-2">
                    <Select
                        value={dateFilter}
                        onValueChange={(v) => {
                            setDateFilter(v);
                            if (v === 'custom') setIsDatePickerOpen(true);
                        }}
                    >
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
                                            ? `${formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')} – ${formatForDisplay(dateRange.to, 'DISPLAY_US_FORMAT')}`
                                            : formatForDisplay(dateRange.from, 'DISPLAY_US_FORMAT')
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
            </div>

            {/* Cards grid */}
            {jobs.length === 0 &&

                <div className="text-center py-12 mt-6">
                    <p className="text-gray-500">No jobs found for installation scheduling.</p>
                </div>


            }
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                    <div
                        key={job.id}
                        onClick={() => handleCardClick(job.id)}
                        className="bg-white rounded-xl border border-[#e6e8f0] shadow-sm p-5 cursor-pointer transition-all hover:shadow-md hover:border-[#667f01]/30"
                    >
                        <div className="flex gap-4 justify-between mb-2">
                            <div>
                                <p className="text-sm text-[#7c8689]">Job Number</p>
                                <p className="text-2xl font-semibold text-[#1379f0]">{job.job_no}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#7c8689]">Fab ID</p>
                                <p className="text-2xl font-semibold text-[#1379f0]">{job.fab_id}</p>
                            </div>
                        </div>

                        <div className="border-t border-[#dbdfe9] my-3" />

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#7c8689]">Area</span>
                                <span className="text-sm font-medium text-[#4b545d]">{job.input_area || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#7c8689]">Total SQ FT</span>
                                <span className="text-sm font-medium text-[#4b545d]">{job.total_sq_ft}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-[#7c8689]">Installation Date</span>
                                <span className="text-sm font-medium text-[#4b545d]">{job.install_date || '-'}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalRecords > 0 && (
                <div className="flex justify-between items-center mt-8 pt-4 border-t border-[#e2e4ed]">
                    <div className="text-sm text-gray-500">
                        Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
                        {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRecords)} of {totalRecords} results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.pageIndex - 1)}
                            disabled={pagination.pageIndex === 0}
                            className="px-3 py-1 border border-[#e2e4ed] rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.pageIndex + 1)}
                            disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalRecords}
                            className="px-3 py-1 border border-[#e2e4ed] rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}