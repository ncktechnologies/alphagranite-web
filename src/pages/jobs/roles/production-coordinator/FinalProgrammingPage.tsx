import { useState, useEffect, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { FinalProgrammingTable } from './FinalProgrammingTable';
import { IJob } from '@/pages/jobs/components/job';
import { Fab, useGetFabsInFinalProgrammingPendingQuery, useGetFabsQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
// import { transformFabToJob } from '@/pages/jobs/roles/drafters/DrafterPage';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { JobTable } from '../../components/JobTable';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useLocation, useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useTableState } from '@/hooks/use-table-state';

const transformFabToJob = (fab: Fab): IJob => {
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: String(fab.id),
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        date: fab.templating_schedule_start_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        // Optional fields with default values
        acct_name: '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.job_details?.project_value || "-",
        gp: "-",
        draft_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
        // template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        template_received: '',
        // templater: fab.technician_name || '-',
        revised: '',
        sct_completed: '',
        // Final programming specific fields
        shop_date_scheduled: fab.templating_schedule_start_date || '',
        wj_time_minutes: fab.programming_time_minutes ? String(fab.programming_time_minutes) : null,
        final_programming_completed: fab.final_programming_complete ? 'Yes' : 'No',
        final_programmer: fab.final_programmer_name || '',
        stone_type_name: fab.stone_type_name || '',
        stone_color_name: fab.stone_color_name || '',
        stone_thickness_value: fab.stone_thickness_value || '',
        edge_name: fab.edge_name || '',
        fab_notes: fab.fab_notes || [],
        job_id: fab.job_id,
        on_hold: fab.on_hold,
    };
};
const FinalProgrammingPage = () => {
    const navigate = useNavigate();

    // Fetch sales persons data for filter dropdown
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

    // Use independent table state for final programming table
    const tableState = useTableState({
        tableId: 'final-programming-table',
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
            current_stage: 'final_programming',
        };

        if (tableState.searchQuery) {
            params.search = tableState.searchQuery;
        }

        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') {
            params.fab_type = tableState.fabTypeFilter;
        }

        // Add sales person filter using name
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            if (tableState.salesPersonFilter === 'no_sales_person') {
                params.sales_person_name = '';
            } else {
                params.sales_person_name = tableState.salesPersonFilter;
            }
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

    // Fetch data with backend pagination and filtering
    // const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const { data, isLoading, isFetching, isError, error } = useGetFabsInFinalProgrammingPendingQuery();
    if (isLoading) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Final Programming" description="" />
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
                        <ToolbarHeading title="Final Programming" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }

    // Transform Fab data to IJob format
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Final Programming" description="Jobs in final CNC programming stage" />
                </Toolbar>

                <JobTable
                    jobs={jobsData}
                    path='final-programming'
                    isLoading={isLoading || isFetching}
                    // useBackendPagination={true}
                    // totalRecords={data?.total || 0}
                    // tableState={tableState}
                    showSalesPersonFilter={true}
                    salesPersons={salesPersons}
                    visibleColumns={['date', 'shop_date_scheduled', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'no_of_pieces', 'total_sq_ft', 'wj_time_minutes', 'final_programming_notes', 'final_programming_completed', 'final_programmer', 'on_hold']}
                />

            </Container>

            {/* <div className="mt-6">
                <FinalProgrammingTable 
                    jobs={jobs}
                    path="/job/final-programming"
                    isLoading={isLoading}
                    onRowClick={handleRowClick}
                />
            </div> */}
        </>
    );
};

export default FinalProgrammingPage;