import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useLocation, Link, useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';
import { useGetFabsQuery, Fab, useGetFabsInSlabSmithPendingQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import  AssignSlabSmithOperatorModal  from './components/AssignSlabSmithOperatorModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { CurrentStageProvider } from '../sales/action';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission'; // 👈 import permission hooks

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
        fab_id: String(fab.id),
        job_name: fab.job_details?.name || '',
        job_no: String(fab.job_details?.job_number || ''),
        date: fab.draft_data?.drafter_end_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.job_details?.project_value || "-",
        gp: "-",
        draft_completed: fab.draft_completed ? 'Yes' : 'No',
        slabsmith_completed: (fab as any).slab_smith_data?.is_completed ? 'Yes' : 'No',
        slabsmith_clock_complete: (fab as any).slab_smith_data?.end_date ? 'Yes' : 'No',
        slabsmith_operator: (fab as any).slabsmith_data?.drafter_name || '-',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        template_received: '',
        templater: fab.technician_name || '-',
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

const SlabSmithPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();
    const permissions = usePermission('SlabSmith Request');

    // Determine what actions the user is allowed to do
    const canAddNote = isSuperAdmin || permissions.can_create;          
    const canToggleOnHold = isSuperAdmin || permissions.can_create;     
    const canAssignSlabSmith = isSuperAdmin || permissions.can_create;  
    const canReassignSlabSmith = isSuperAdmin || permissions.can_create; 

    // Fetch sales persons data for filter dropdown
    const { data: salesPersonsData } = useGetSalesPersonsQuery();

    // Extract sales persons
    const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) rawData = salesPersonsData;
        else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData)
            rawData = (salesPersonsData as any).data || [];
        return rawData;
    }, [salesPersonsData]);

    // Extract just names for display
    const salesPersonNames = useMemo(() => {
        return salesPersons.map((sp: any) => sp.name || String(sp));
    }, [salesPersons]);

    // Use independent table state for slab smith table
    const tableState = useTableState({
        tableId: 'slab-smith-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params for backend
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
                if (selectedSalesPerson?.id) params.sales_person_id = selectedSalesPerson.id;
            }
        }
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from)
                    params.draft_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to)
                    params.draft_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else {
                params.date_filter = tableState.dateFilter;
            }
        }
        // console.log('Slab Smith Query Params:', params);
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
        salesPersons,
    ]);

    // Fetch data with backend pagination and filtering
    const { data, isLoading, isFetching, isError, error } = useGetFabsInSlabSmithPendingQuery(queryParams);

    // Modal and selection state
    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [reassignFabId, setReassignFabId] = useState<string | null>(null);

    const handleRowClick = (fabId: string) => {
        navigate(`/job/slab-smith/${fabId}`);
    };

    const handleAssignSlabSmithClick = () => {
        if (selectedRows.length > 0) {
            setReassignFabId(null);
            setShowAssignModal(true);
        }
    };

    const handleReassignSlabSmithClick = (job: IJob) => {
        setReassignFabId(job.fab_id);
        setSelectedRows([]);
        setShowAssignModal(true);
    };

    const handleCloseModal = () => {
        setShowAssignModal(false);
        setReassignFabId(null);
    };

    const handleAssignSuccess = () => {
        setSelectedRows([]);
    };

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading && !data) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="SlabSmith" description="" />
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
                        <ToolbarHeading title="SlabSmith" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify((error as any)?.data || error)}` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="SlabSmith" description="View and manage slab smith requests" />
                </Toolbar>
                <CurrentStageProvider
                    value={{
                        currentStage: 'slab_smith_request',
                        openCurrentStageView: (fabId, jobName) => {
                            // console.log('openCurrentStageView called', fabId, jobName);
                        }
                    }}
                >
                    <JobTable
                        jobs={jobsData}
                        path='slab-smith'
                        isLoading={isLoading && !data}
                        totalRecords={data?.total || 0}
                        useBackendPagination={true}
                        tableState={tableState}
                        showSalesPersonFilter={false}
                        showScheduleFilter={false}
                        salesPersons={salesPersons}
                        enableMultiSelect
                        selectedRows={selectedRows}
                        setSelectedRows={setSelectedRows}
                        showAssignSlabSmithButton
                        onAssignSlabSmithClick={handleAssignSlabSmithClick}
                        onReassignSlabSmithClick={handleReassignSlabSmithClick}
                        visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'total_sq_ft', 'slabsmith_completed', 'slabsmith_notes', 'slabsmith_operator', 'slabsmith_clock_complete']}
                        // 👇 Pass permission props
                        canAddNote={canAddNote}
                        canToggleOnHold={canToggleOnHold}
                        canAssignSlabSmith={canAssignSlabSmith}
                        canReassignSlabSmith={canReassignSlabSmith}
                    />
                </CurrentStageProvider>

                <AssignSlabSmithOperatorModal
                    open={showAssignModal}
                    onClose={handleCloseModal}
                    selectedFabIds={reassignFabId ? [] : selectedRows}
                    reassignFabId={reassignFabId}
                    onAssignSuccess={handleAssignSuccess}
                />
            </Container>
        </div>
    );
}

export default SlabSmithPage;