import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';
import { useGetFabsByStageQuery, Fab, useGetFabsQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { AssignDrafterModal } from './components/AssignDrafterModal';

// Transform Fab data to match IJob interface
export const transformFabToJob = (fab: Fab): IJob => {
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: String(fab.id),
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        date: fab.predraft_completed_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        // Optional fields with default values
        acct_name: '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.job_details?.project_value || "-",
        gp: "-",
        draft_completed: fab.current_stage === 'completed' ? 'completed' : 'Not completed',
        drafter: fab.draft_data?.drafter_name || '-',
        template_received: '',
        revised: '',
        sct_completed: '',
        // Add material specification fields
        stone_type_name: fab.stone_type_name || '',
        stone_color_name: fab.stone_color_name || '',
        stone_thickness_value: fab.stone_thickness_value || '',
        edge_name: fab.edge_name || '',
        fab_notes: fab.fab_notes || [],
        job_id: fab.job_id,
        on_hold: fab.on_hold,
        status_id: fab.status_id,
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
        defaultPagination: { pageIndex: 0, pageSize: 25 },
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
                    // Use local date string (YYYY-MM-DD)
                    params.predraft_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                }
                if (tableState.dateRange?.to) {
                    params.predraft_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
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
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    // Create a mapping of FAB IDs to their square footage values
    const sqftPerFab = useMemo(() => {
        const mapping: { [key: string]: string } = {};
        if (data?.data) {
            data.data.forEach(fab => {
                mapping[String(fab.id)] = String(fab.total_sqft || '0');
            });
        }
        return mapping;
    }, [data]);

    // Create a mapping of FAB IDs to their template schedule dates (if available)
    const datePerFab = useMemo(() => {
        const startDateMapping: { [key: string]: string } = {};
        const endDateMapping: { [key: string]: string } = {};
        if (data?.data) {
            data.data.forEach(fab => {
                // Use templating schedule dates if available, otherwise fall back to draft_data
                startDateMapping[String(fab.id)] = fab.templating_schedule_start_date || (fab.draft_data?.scheduled_start_date || '');
                endDateMapping[String(fab.id)] = fab.templating_schedule_due_date || (fab.draft_data?.scheduled_end_date || '');
            });
        }
        return { startDateMapping, endDateMapping };
    }, [data]);

    const handleAssignDrafterClick = () => {
        if (selectedRows.length > 0) {
            setShowAssignModal(true);
        }
    };

    const handleCloseModal = () => {
        setShowAssignModal(false);
    };

    const handleAssignSuccess = () => {
        // Clear all selected rows after successful assignment
        setSelectedRows([]);
    };

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading title="Drafting" description="View and manage drafting tasks" />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path='draft'
                isLoading={isLoading}
                // onRowClick={handleRowClick}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                showScheduleFilter={false} // Remove separate schedule filter
                salesPersons={salesPersons}
                enableMultiSelect={true}
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                showAssignDrafterButton={true}
                onAssignDrafterClick={handleAssignDrafterClick}
                visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'no_of_pieces', 'total_sq_ft', 'revenue', 'gp', 'drafting_notes', 'draft_completed', 'drafter', 'on_hold']}
            />
            <AssignDrafterModal
                open={showAssignModal}
                onClose={handleCloseModal}
                selectedFabIds={selectedRows}
                initialSqftValues={sqftPerFab}
                initialStartDates={datePerFab.startDateMapping}
                initialEndDates={datePerFab.endDateMapping}
                onAssignSuccess={handleAssignSuccess}
            />
        </Container>
    );
}


export default DrafterPage;