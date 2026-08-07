import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery, Fab } from '@/store/api/job';
import { useGetEmployeeSalesPersonsQuery, useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission'; // 👈 import usePermission

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
        date: fab.templating_actual_end_date ? fab.templating_actual_end_date : fab.template_completed_date,
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        template_received: fab.template_received ? 'Yes' : 'No',
        template_needed: fab.template_needed ? 'No' : 'Yes',
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.job_details?.project_value || "-",
        gp: "-",
        revised: '',
        sct_completed: '',
        draft_completed: '',
        review_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        templater: fab.technician_name || '-',
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

export function PredraftPage() {
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();

    const permissions = usePermission('Pre-Draft Review');

    // Determine what actions the user is allowed to do
    const canAddNote = isSuperAdmin || permissions.can_create;      // Add Note menu item
    const canToggleOnHold = isSuperAdmin || permissions.can_create; // On Hold toggle column

    // Fetch sales persons data for filter dropdown
   const { data: salesPersonsData } = useGetEmployeeSalesPersonsQuery();
     const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        return Array.isArray(salesPersonsData)
          ? salesPersonsData.map((sp: any) => ({
            id: sp.id || sp.user_id,
            name: sp.name || `${sp.first_name} ${sp.last_name}`,
          }))
          : [];
      }, [salesPersonsData]);
    // Extract just names for display
    const salesPersonNames = useMemo(() => {
        return salesPersons.map((sp: any) => sp.name || String(sp));
    }, [salesPersons]);

    // Use independent table state for predraft table
    const tableState = useTableState({
        tableId: 'predraft-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: 'pre_draft_review',
        };
        if (tableState.searchQuery) params.search = tableState.searchQuery;
        if (tableState.searchType) params.type = tableState.searchType;
        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') params.fab_type = tableState.fabTypeFilter;
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            if (tableState.salesPersonFilter === 'no_sales_person') params.sales_person_name = '';
            else {
                const selectedSalesPerson = salesPersons.find((sp: any) => sp.name === tableState.salesPersonFilter);
                if (selectedSalesPerson?.id) params.sales_person_id = selectedSalesPerson.id;
            }
        }
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from) params.template_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to) params.template_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else {
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
        tableState.searchType,
        salesPersons
    ]);

    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const handleRowClick = (fabId: string) => {
        navigate(`/job/predraft/${fabId}`);
    };

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading && !data) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading title="Pre-Draft Review" description="View and manage pre-draft review tasks" />
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
                    <ToolbarHeading title="Pre-Draft review" description="" />
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

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Pre-Draft review"
                    description="View and manage pre-draft review tasks"
                />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path='predraft'
                isLoading={isLoading && !data}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                showScheduleFilter={false}
                salesPersons={salesPersons}
                visibleColumns={['template_needed', 'template_received', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'total_sq_ft', 'pre_draft_notes', 'review_completed']}
                canAddNote={canAddNote}
                canToggleOnHold={canToggleOnHold}
            
            />
        </Container>
    );
}