import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus } from 'lucide-react';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NewFabIdForm } from './NewFabIdForm';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Can } from '@/components/permission';
import { useTableState } from '@/hooks';
import { useGetSalesPersonsQuery } from '@/store/api';

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
        fab_id: String(fab.id), // Using fab.id as fab_id since there's no fab_id in Fab type
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        // date: fab.created_at, // Using created_at as date
        current_stage: fab.current_stage, // Add current_stage
        // Optional fields with default values
        acct_name: '',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        template_received: '',
        templater: fab.technician_name || '-',
        no_of_pieces: '',
        total_sq_ft: String(fab.total_sqft),
        revenue: '',
        revised: '',
        sct_completed: '',
        draft_completed: '',
        gp: '',
        stone_type_name: fab.stone_type_name || '',
        stone_color_name: fab.stone_color_name || '',
        stone_thickness_value: fab.stone_thickness_value || '',
        edge_name: fab.edge_name || '',
        fab_notes: fab.fab_notes || [],
        job_id: fab.job_id,
        status_id: fab.status_id,
        on_hold: fab.on_hold,
    };
};

export function SalesPage() {
    const location = useLocation();
    const isNewFabForm = location.pathname.includes('/new-fab-id');
    const { data: salesPersonsData } = useGetSalesPersonsQuery();

    // Extract sales persons
    const salesPersons = useMemo(() => {
        if (!salesPersonsData) {
            return [];
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) {
            rawData = salesPersonsData;
        } else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) {
            rawData = (salesPersonsData as any).data || [];
        }

        // Extract names from sales person objects
        const extractName = (item: { name: string } | string) => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null) {
                return item.name || String(item);
            }
            return String(item);
        };

        return rawData.map(extractName);
    }, [salesPersonsData]);
    const tableState = useTableState({
        tableId: 'sct-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });
    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            // current_stage: /'sales_ct', // Changed to SCT stage
        };

        if (tableState.searchQuery) {
            params.search = tableState.searchQuery;
        }

        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') {
            params.fab_type = tableState.fabTypeFilter;
        }

        // // Add sales person filter using name
        // if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
        //     if (tableState.salesPersonFilter === 'no_sales_person') {
        //         params.sales_person_name = '';
        //     } else {
        //         params.sales_person_name = tableState.salesPersonFilter;
        //     }
        // }

        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            // For custom date range, use schedule_start_date and schedule_due_date
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from) {
                    // Use local date string (YYYY-MM-DD)
                    params.draft_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                }
                if (tableState.dateRange?.to) {
                    params.draft_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
                }
                // Don't send date_filter when using custom range
            } else {
                // For other filters (today, this_week, etc.), use date_filter
                params.date_filter = tableState.dateFilter;
            }
        }

        return params;
    }, [
        skip,
        tableState.pagination.pageSize,
        tableState.searchQuery,
        tableState.fabTypeFilter,
        tableState.salesPersonFilter,
        tableState.dateFilter,
        tableState.dateRange,
    ]);
    const { data, isLoading, error, isError } = useGetFabsQuery(queryParams);

    if (isNewFabForm) {
        return <NewFabIdForm />;
    }

    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="All Fabs" description="" />
                    </Toolbar>
                    <div className="space-y-4 mt-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                </Container>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="All Fabs" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }
    // Transform Fab data to IJob format
    const jobsData: IJob[] = data ? data.data?.map(transformFabToJob) : [];

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="All Fabs" description="View & track all Alpha granite FAB ID'S" />
                    <ToolbarActions>
                        <Can action="update" on="FAB IDs">
                            <Link to="/jobs/sales/new-fab-id">
                                <Button className="">
                                    <Plus />
                                    New FAB ID
                                </Button>
                            </Link>
                        </Can>
                        <Can action="update" on="Jobs">
                            <Link to="/create-jobs">
                                <Button className="">
                                    <Plus />
                                    New Job
                                </Button>
                            </Link>
                        </Can>
                    </ToolbarActions>
                </Toolbar>
                {/* <JobTable jobs={transformedJobs} path='sales' /> */}
                <JobTable
                    jobs={jobsData}
                    path='sales'
                    isLoading={isLoading}
                    // onRowClick={handleRowClick}
                    useBackendPagination={true}
                    totalRecords={data?.total || 0}
                    tableState={tableState}
                    showSalesPersonFilter={true}
                    showScheduleFilter={false} // Remove separate schedule filter
                    salesPersons={salesPersons}
                    visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'no_of_pieces', 'total_sq_ft', 'slabsmith_used', 'sct_notes', 'sct_completed', 'sales_person_name', 'draft_revision_notes', 'on_hold']}
                />
            </Container>
        </div>
    );
}