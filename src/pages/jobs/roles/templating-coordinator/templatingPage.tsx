import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetFabsQuery, Fab } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Format date to "08 Oct, 2025" format
const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month}, ${year}`;
    } catch (error) {
        return '-';
    }
};

// Transform Fab data to match IJob interface
const transformFabToJob = (fab: Fab): IJob => {
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: `${fab.id}`,
        job_name: fab.job_details?.name || `Job ${fab.job_id}`,
        job_no: fab.job_details?.job_number || String(fab.job_id),
        date: fab.templating_schedule_start_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        // Optional fields with default values
        acct_name: '',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '',
        template_received: fab.template_received  ? 'Yes' : 'No',
        templater: fab.technician_name || '-',
        // no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.revenue?.toString() || "-",
        // gp: "-",
        revised: '',
        sct_completed: '',
        draft_completed: '',
        fab_notes: fab.fab_notes || [],
    };
};

export function TemplatingPage() {
    const navigate = useNavigate();
    
    // Fetch sales persons data for filter dropdown
    const { data: salesPersonsData } = useGetSalesPersonsQuery();

    // Create map of sales person names to IDs
    const salesPersonIdMap = useMemo(() => {
        if (!salesPersonsData) {
            return new Map<string, number>();
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) {
            rawData = salesPersonsData;
        } else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) {
            rawData = (salesPersonsData as any).data || [];
        }

        // Create map of name -> id
        const map = new Map<string, number>();
        rawData.forEach(item => {
            if (typeof item === 'object' && item !== null && item.id) {
                const name = item.name || `${item.first_name} ${item.last_name}`.trim() || String(item);
                map.set(name, item.id);
            }
        });

        return map;
    }, [salesPersonsData]);

    // Extract sales person names for dropdown
    const salesPersons = useMemo(() => {
        return Array.from(salesPersonIdMap.keys()).sort();
    }, [salesPersonIdMap]);

    // Use independent table state for templating table
    const tableState = useTableState({
        tableId: 'templating-table',
        defaultPagination: { pageIndex: 0, pageSize: 10 },
        defaultDateFilter: 'all',
        persistState: true,
    });

    // Calculate skip value for pagination
    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params for backend
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: 'templating', // Templating stage
        };

        if (tableState.searchQuery) {
            params.search = tableState.searchQuery;
        }

        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') {
            params.fab_type = tableState.fabTypeFilter;
        }

        // Add sales person filter using ID
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            if (tableState.salesPersonFilter === 'no_sales_person') {
                params.sales_person_id = 0; // Assuming 0 or null represents no sales person
            } else {
                const salesPersonId = salesPersonIdMap.get(tableState.salesPersonFilter);
                if (salesPersonId) {
                    params.sales_person_id = salesPersonId;
                }
            }
        }

        // Handle schedule status filter (scheduled/unscheduled)
        if (tableState.scheduleFilter && tableState.scheduleFilter !== 'all') {
            params.schedule_status = tableState.scheduleFilter;
        }

        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            // For custom date range, use schedule_start_date and schedule_due_date
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from) {
                    params.schedule_start_date = tableState.dateRange.from.toISOString().split('T')[0];
                }
                if (tableState.dateRange?.to) {
                    params.schedule_due_date = tableState.dateRange.to.toISOString().split('T')[0];
                }
                // Don't send date_filter when using custom range
            } else {
                // For other filters (today, this_week, etc.), use date_filter
                params.date_filter = tableState.dateFilter;
            }
        }

        console.log('Templating Query Params:', params); // Debug log
        return params;
    }, [
        skip,
        tableState.pagination.pageSize,
        tableState.searchQuery,
        tableState.fabTypeFilter,
        tableState.salesPersonFilter,
        tableState.scheduleFilter, // Add scheduleFilter dependency
        tableState.dateFilter,
        tableState.dateRange,
    ]);

    // Fetch data with backend pagination and filtering
    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const handleRowClick = (fabId: string) => {
        // Check if the job has a template technician assigned to determine the path
        const job = data?.data?.find(fab => fab.id.toString() === fabId);
        const hasTemplateTechnician = job?.technician_name && 
            job.technician_name !== '-' && 
            job.technician_name.trim() !== '';

        navigate(hasTemplateTechnician ? 
            `/job/templating-details/${fabId}` : 
            `/job/templating/${fabId}`
        );
    };

    // Transform Fab data to IJob format
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading && !data) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading
                        title="Template Scheduling"
                        description="Manage and track all Alpha Granite templating jobs"
                    />
                </Toolbar>
                <div className="space-y-4 mt-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading
                        title="Template Scheduling"
                        description="Manage and track all Alpha Granite templating jobs"
                    />
                </Toolbar>
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    console.log('Templating Data:', data); // Debug log

    // Calculate total square footage from the current page data
    const totalSqFt = jobsData.reduce((total, job) => total + (Number(job.total_sq_ft) || 0), 0);

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Template Scheduling"
                    description=""
                />
            </Toolbar>

            <Tabs defaultValue="all" className="mt-4">
                <TabsList className=" bg-transparent p-2 border  flex flex-wrap gap-1">
                    <TabsTrigger value="all">
                        <span className="flex items-center gap-2">
                            FabId
                            <span className=" bg-[#E1FCE9] text-base px-[6px] text-text rounded-[50px]" >
                                {data?.total || 0}
                            </span>
                        </span>
                    </TabsTrigger>
                    <div className='pl-5 text-[#4B5675] text-[14px]'>
                        Total SQ. FT: {totalSqFt}
                    </div>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <JobTable 
                        jobs={jobsData}
                        path="templating" // Add the missing path prop
                        showScheduleFilter={true}
                        isLoading={isLoading || isFetching}
                        // onRowClick={handleRowClick}
                        useBackendPagination={true}
                        totalRecords={data?.total || 0}
                        tableState={tableState}
                        showSalesPersonFilter={true}
                        salesPersons={salesPersons}
                        salesPersonFilterLabel="Filter by Templater"
                        visibleColumns={['fab_type', 'fab_id', 'job_no', 'fab_info', 'total_sq_ft', 'template_received', 'templater']}
                        getPath={(job) => {
                            // Check if THIS SPECIFIC job has a template technician assigned
                            const hasTemplateTechnician = job.templater &&
                                job.templater !== '-' &&
                                job.templater.trim() !== '';

                            return hasTemplateTechnician ? 'templating-details' : 'templating';
                        }}
                    />
                </TabsContent>
            </Tabs>
        </Container>
    );
}