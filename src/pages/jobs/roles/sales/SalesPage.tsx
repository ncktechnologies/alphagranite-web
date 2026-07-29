import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, Plus } from 'lucide-react';
import { IJob } from '../../components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { Fab } from '@/store/api/job';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NewFabIdForm } from './NewFabIdForm';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Can } from '@/components/permission';
import { useTableState } from '@/hooks';
import { useGetSalesPersonsQuery } from '@/store/api';
import { JobSalesTable } from './components/Table';

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
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        current_stage: fab.current_stage,
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        template_received: '',
        templater: fab.technician_name || '-',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
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
    const isSuperAdmin = useIsSuperAdmin();
    const permissions = usePermission('View all FABS'); 

    // Determine table action permissions
    const canAddNote = isSuperAdmin || permissions.can_create;
    const canToggleOnHold = isSuperAdmin || permissions.can_create;
    const canExport = isSuperAdmin || permissions.can_read;

    // Extract sales persons
    const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) rawData = salesPersonsData;
        else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData)
            rawData = (salesPersonsData as any).data || [];
        return rawData;
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
        };
        if (tableState.searchQuery) {
            params.search = tableState.searchQuery;
            params.type = (tableState as any).searchType || 'fab_id';
        }
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

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="All Fabs" description="View & track all Alpha granite FAB ID'S" />
                    <ToolbarActions>
                        <Can action="create" on="View all FABS">
                            <Link to="/sales/new-fab-id">
                                <Button className="">
                                    <Plus />
                                    New FAB ID
                                </Button>
                            </Link>
                        </Can>
                        {/* <Can action="rea" on="View all FABS"> */}
                            <Link to="/create-jobs">
                                <Button className="">
                                    <Eye />
                                    View Jobs
                                </Button>
                            </Link>
                        {/* </Can> */}
                    </ToolbarActions>
                </Toolbar>
                <JobSalesTable
                    jobs={jobsData}
                    path='sales'
                    isLoading={isLoading && !data}
                    useBackendPagination={true}
                    totalRecords={data?.total || 0}
                    tableState={tableState}
                    showSalesPersonFilter={true}
                    showScheduleFilter={false}
                    salesPersons={salesPersons}
                    visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'no_of_pieces', 'total_sq_ft', 'slabsmith_used', 'sct_notes', 'sct_completed', 'sales_person_name', 'draft_revision_notes', 'current_stage']}
                    // 👇 Pass permission props
                    canAddNote={canAddNote}
                    canToggleOnHold={canToggleOnHold}
                    canExport={canExport}
                />
            </Container>
        </div>
    );
}