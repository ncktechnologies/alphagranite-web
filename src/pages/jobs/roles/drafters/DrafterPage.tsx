import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';
import { useGetFabsByStageQuery, Fab, useGetFabsQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo } from 'react';

// Transform Fab data to match IJob interface
export const transformFabToJob = (fab: Fab): IJob => {
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
        template_received: '',
        revised: '',
        sct_completed: '',
    };
};

const DrafterPage = () => {
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

    // Use independent table state for drafting table
    const tableState = useTableState({
        tableId: 'drafting-table',
        defaultPagination: { pageIndex: 0, pageSize: 10 },
        defaultDateFilter: 'today',
        persistState: true,
    });

    // Calculate skip value for pagination
    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params for backend
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: 'drafting',

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

        console.log('Query Params:', params); // Debug log
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
    const { data, isLoading, isFetching } = useGetFabsQuery(
        queryParams,
    );

    const handleRowClick = (fabId: string) => {
        navigate(`/job/draft/${fabId}`);
    };

    // Transform Fab data to IJob format
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading title="Drafting" description="View and manage drafting tasks" />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path='draft'
                isLoading={isLoading || isFetching}
                onRowClick={handleRowClick}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                salesPersons={salesPersons}
            />
        </Container>
    );
}



export default DrafterPage;