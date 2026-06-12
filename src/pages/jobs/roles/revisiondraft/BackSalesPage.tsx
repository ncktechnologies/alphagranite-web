import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery, Fab } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AssignDrafterModal } from '../drafters/components/AssignDrafterModal';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission'; // 👈 import permission hooks

// Transform Fab data to match IJob interface
const transformFabToJob = (fab: Fab): IJob => {
    const fabData = fab as any;
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: String(fab.id),
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        date: fab.draft_completed_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        revision_completed: fabData.sales_ct_data?.is_revision_completed ? 'Yes' : 'No',
        revisor: fabData.draft_data?.drafter_name || '',
        revision_number: fabData.sales_ct_data?.current_revision_count ? `#${fabData.sales_ct_data.current_revision_count}` : '#1',
        revision_reason: fabData.sales_ct_data?.revision_reason || fabData.sales_ct_data?.draft_note || 'N/A',
        revision_type: fabData.sales_ct_data?.revision_type || '-',
        sct_completed: '',
        draft_completed: '',
        review_completed: '',
        file: (fabData.files && fabData.files.length > 0) ? fabData.files[0]?.name || 'File' : 'No File',
        notes: fabData.notes?.length > 0 ? fabData.notes[0] || 'Notes' : 'No Notes',
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

export function DraftRevisionPage() {
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();

    const permissions = usePermission('Revisions');

    const canAddNote = isSuperAdmin || permissions.can_create;           // Add Note menu item
    const canToggleOnHold = isSuperAdmin || permissions.can_create;      // On Hold toggle column
    const canAssignDrafter = isSuperAdmin || permissions.can_create;     // Toolbar "Assign Drafter" button
    const canReassignDrafter = isSuperAdmin || permissions.can_create;   // Reassign button inside drafter column
    const canReassignRevisor = isSuperAdmin || permissions.can_create;   // Reassign button inside revisor column

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

    // Use independent table state for revision table
    const tableState = useTableState({
        tableId: 'revision-table',
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
            current_stage: 'revision',
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
                    params.sct_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to)
                    params.sct_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else {
                params.date_filter = tableState.dateFilter;
            }
        }
        console.log('Revision Query Params:', params);
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

    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [reassignJob, setReassignJob] = useState<any>(null);
    const [reassignFabId, setReassignFabId] = useState<string | null>(null);

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

    const handleAssignDrafterClick = () => {
        if (selectedRows.length > 0) {
            setReassignJob(null);
            setShowAssignModal(true);
        }
    };

    const handleReassignDrafterClick = (job: IJob) => {
        setReassignFabId(job.fab_id);
        setSelectedRows([]);
        setShowAssignModal(true);
    };

    const handleReassignRevisorClick = (job: IJob) => {
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

    const handleRowClick = (fabId: string) => {
        navigate(`/job/revision/${fabId}`);
    };

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading && !data) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Revision" description="" />
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
                        <ToolbarHeading title="Revision" description="" />
                    </Toolbar>
                    <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify((error as any)?.data || (error as any) || 'Unknown error')}` : "Failed to load FAB data"}
                        </AlertDescription>
                    </Alert>
                </Container>
            </div>
        );
    }

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Revision"
                    description="View and manage revision tasks"
                />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path='revision'
                isLoading={isLoading && !data}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                salesPersons={salesPersons}
                enableMultiSelect
                selectedRows={selectedRows}
                setSelectedRows={setSelectedRows}
                showAssignDrafterButton
                onAssignDrafterClick={handleAssignDrafterClick}
                onReassignDrafterClick={handleReassignDrafterClick}
                onReassignRevisorClick={handleReassignRevisorClick}
                visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'revision_reason', 'total_sq_ft', 'draft_notes', 'sales_person_name', 'revisor', 'revision_type', 'revision_notes', 'revision_completed', 'revision_note']}
                canAddNote={canAddNote}
                canToggleOnHold={canToggleOnHold}
                canAssignDrafter={canAssignDrafter}
                canReassignDrafter={canReassignDrafter}
                canReassignRevisor={canReassignRevisor}
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
}