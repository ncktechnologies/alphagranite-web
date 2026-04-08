import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';
import { useGetFabsQuery, Fab, useGetFabsCncQuery } from '@/store/api/job';
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
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : '-',
        total_sq_ft: String(fab.total_sqft || '-'),
        revenue: fab.job_details?.project_value || '-',
        gp: '-',
        draft_completed: fab.drafting_session?.status || 'Not started',
        cnc_operator: fab.cnc_data?.drafter_name || '-',
        template_received: '',
        revised: '',
        sct_completed: '',
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

const CNCPage = () => {
    const navigate = useNavigate();

    // Fetch sales persons
    const { data: salesPersonsData } = useGetSalesPersonsQuery();
    const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) rawData = salesPersonsData;
        else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData)
            rawData = (salesPersonsData as any).data || [];
        // Keep full objects with id and name
        return rawData;
    }, [salesPersonsData]);

    // Extract just names for display
    const salesPersonNames = useMemo(() => {
        return salesPersons.map((sp: any) => sp.name || String(sp));
    }, [salesPersons]);

    // Table state
    const tableState = useTableState({
        tableId: 'cnc-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: '',
        };
        if (tableState.searchQuery) params.search = tableState.searchQuery;
        if (tableState.searchType) params.type = tableState.searchType;
        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all')
            params.fab_type = tableState.fabTypeFilter;
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            if (tableState.salesPersonFilter === 'no_sales_person') params.sales_person_name = '';
            else {
                const selectedSalesPerson = salesPersons.find((sp: any) => sp.name === tableState.salesPersonFilter);
                if (selectedSalesPerson && selectedSalesPerson.id) params.sales_person_id = selectedSalesPerson.id;
            }
        }
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from)
                    params.predraft_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to)
                    params.predraft_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else {
                params.date_filter = tableState.dateFilter;
            }
        }
        return params;
    }, [
        skip,
        tableState.pagination.pageSize,
        tableState.searchQuery,
        tableState.searchType,
        tableState.fabTypeFilter,
        tableState.salesPersonFilter,
        tableState.dateFilter,
        tableState.dateRange,
    ]);

    const { data, isLoading } = useGetFabsCncQuery(queryParams);

    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [reassignJob, setReassignJob] = useState<any>(null);
    const [reassignFabId, setReassignFabId] = useState<string | null>(null);
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    // Mappings for bulk assign
    const sqftPerFab = useMemo(() => {
        const mapping: { [key: string]: string } = {};
        data?.data?.forEach((fab) => {
            mapping[String(fab.id)] = String(fab.total_sqft || '0');
        });
        return mapping;
    }, [data]);

    const datePerFab = useMemo(() => {
        const start: { [key: string]: string } = {};
        const end: { [key: string]: string } = {};
        data?.data?.forEach((fab) => {
            start[String(fab.id)] = fab.templating_schedule_start_date || fab.draft_data?.scheduled_start_date || '';
            end[String(fab.id)] = fab.templating_schedule_due_date || fab.draft_data?.scheduled_end_date || '';
        });
        return { startDateMapping: start, endDateMapping: end };
    }, [data]);

    const handleAssignCNCClick = () => {
        if (selectedRows.length > 0) {
            setReassignJob(null);
            setShowAssignModal(true);
        }
    };

    const handleReassignCNCClick = (job: IJob) => {
        setReassignFabId(job.fab_id); // just pass the FAB ID
        setSelectedRows([]);
        setShowAssignModal(true);
    };

    const handleCloseModal = () => {
        setShowAssignModal(false);
        setReassignFabId(null);
    };
    const handleAssignSuccess = () => {
        setSelectedRows([]);
        // Optionally refetch: tableState.refetch?.()
    };

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading title="CNC" description="View and manage CNC tasks" />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path="cnc"
                isLoading={isLoading}
                useBackendPagination
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter
                salesPersons={salesPersons}
                enableMultiSelect
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                showAssignCNCButton
                onAssignCNCClick={handleAssignCNCClick}
                onReassignCNCClick={handleReassignCNCClick}
                visibleColumns={[
                    'date',
                    'fab_type',
                    'fab_id',
                    'job_no',
                    'fab_info',
                    'no_of_pieces',
                    'total_sq_ft',
                    'revenue',
                    'gp',
                    'cnc_notes',
                    // 'draft_completed',
                    'on_hold',
                    'cnc_operator'
                ]}
            />
            <AssignDrafterModal
                open={showAssignModal}
                onClose={handleCloseModal}
                selectedFabIds={reassignFabId ? [] : selectedRows}
                reassignFabId={reassignFabId}
                initialSqftValues={sqftPerFab}
                initialStartDates={datePerFab.startDateMapping}
                initialEndDates={datePerFab.endDateMapping}
                onAssignSuccess={handleAssignSuccess}
            />
        </Container>
    );
};

export default CNCPage;
