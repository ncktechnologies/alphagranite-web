import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsCompletionQuery, Fab, useGetFabsQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin } from '@/hooks/use-permission';

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
        date: (fab as any).shop_est_completion_date || (fab as any).estimated_completion_date,
        shop_est_completion_date: (fab as any).shop_est_completion_date
            ? formatDate((fab as any).shop_est_completion_date)
            : (fab as any).estimated_completion_date
                ? formatDate((fab as any).estimated_completion_date)
                : '-',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        template_received: fab.template_received ? 'Yes' : 'No',
        template_needed: fab.template_needed ? 'No' : 'Yes',
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.job_details?.project_value || "-",
        gp: (fab as any).gp ?? "-",
        revised: '',
        sct_completed: '',
        draft_completed: '',
        review_completed: fab.current_stage === 'completed' ? 'Yes' : 'No',
        template_schedule: fab.templating_schedule_start_date
            ? formatDate(fab.templating_schedule_start_date)
            : '-',
        templater: fab.technician_name || '-',
        stone_type_name: fab.stone_type_name || '',
        stone_color_name: fab.stone_color_name || '',
        stone_thickness_value: fab.stone_thickness_value || '',
        edge_name: fab.edge_name || '',
        fab_notes: fab.fab_notes || [],
        job_id: fab.job_id,
        on_hold: fab.on_hold,
        status_id: fab.status_id,
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",

        // ── Install scheduling fields ──
        est_completion_date: (fab as any).est_completion_date
            ? formatDate((fab as any).est_completion_date)
            : '-',
        percent_complete: (fab as any).percent_complete ?? undefined,
        completion_date: (fab as any).completion_date
            ? formatDate((fab as any).completion_date)
            : undefined,
        installer: (fab as any).install_details.installer_name || (fab as any).installer || undefined,
        install_date: (fab as any).install_details.scheduled_install_date
            ? formatDate((fab as any).install_details.scheduled_install_date)
            : undefined,
        install_confirmed: (fab as any).install_details.is_completed ?? undefined,
        shop_status: (fab as any).shop_status || undefined,
    };
};

export function InstallCompletionPage() {
    const navigate = useNavigate();
    const isUserSuperAdmin = useIsSuperAdmin();
    const [dateGrouping, setDateGrouping] = useState<'date' | 'month' | 'none'>('month');

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

        // Extract sales persons - keep full objects with id and name
        return rawData;
    }, [salesPersonsData]);

    // Extract just names for display
    const salesPersonNames = useMemo(() => {
        return salesPersons.map((sp: any) => sp.name || String(sp));
    }, [salesPersons]);
    // Use independent table state for predraft table
    const tableState = useTableState({
        tableId: 'install-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    // Calculate skip value for pagination
    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params for backend
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: 'install_completion', // Pre-draft review stage
        };

        if (tableState.searchQuery) {
            params.search = tableState.searchQuery;
            params.type = (tableState as any).searchType || 'fab_id'; // Add search type
        }
        if (tableState.searchType) {
            params.type = tableState.searchType;
        }
        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') {
            params.fab_type = tableState.fabTypeFilter;
        }

        // Add sales person filter using ID
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            if (tableState.salesPersonFilter === 'no_sales_person') {
                // Filter for fabs without a sales person
                params.sales_person_name = '';
            } else {
                // Find the sales person object by name and get the ID
                const selectedSalesPerson = salesPersons.find((sp: any) => sp.name === tableState.salesPersonFilter);
                if (selectedSalesPerson && selectedSalesPerson.id) {
                    params.sales_person_id = selectedSalesPerson.id;
                }
            }
        }

        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            // For custom date range, use schedule_start_date and schedule_due_date
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from) {
                    // Use local date string (YYYY-MM-DD)
                    params.template_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                }
                if (tableState.dateRange?.to) {
                    params.template_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
                }
                // Don't send date_filter when using custom range
            } else {
                // For other filters (today, this_week, etc.), use date_filter
                params.date_filter = tableState.dateFilter;
            }
        }

        console.log('Pre-draft Query Params:', params); // Debug log
        return params;
    }, [
        skip,
        tableState.pagination.pageSize,
        tableState.searchQuery,
        tableState.fabTypeFilter,
        tableState.salesPersonFilter,
        tableState.dateFilter,
        tableState.dateRange,
        tableState.searchType
    ]);

    // Fetch data with backend pagination and filtering
    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);


    const handleDetails = (id: string) => {
        navigate(`/app/jobs/install-scheduling/${id}`);
    };
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading) {
        return (
            <Container className="border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-80 mt-2" />
                    </div>
                </div>

                <div className="mt-6">
                    <Skeleton className="h-96 w-full" />
                </div>
            </Container>
        );
    }

    return (
        <Container className="border-t">
            <Toolbar>
                <ToolbarHeading
                    title="Install Completion"
                    description="Manage installation schedules and operations"
                />
            </Toolbar>

            {isError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load install scheduling data. Please try again later.
                    </AlertDescription>
                </Alert>
            )}

            <JobTable
                jobs={jobsData}
                path="install-completion"
                isLoading={isLoading}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                showScheduleFilter={false} // Remove separate schedule filter
                salesPersons={salesPersons}
                dateGrouping={dateGrouping}
                onDateGroupingChange={setDateGrouping}
                visibleColumns={[
                    'fab_type',
                    'fab_id',
                    'job_no',
                    'fab_info',
                    'total_sq_ft',
                    'revenue',
                    'gp',
                    'est_completion_date',
                    'percent_complete',
                    // 'completion_date',
                    'install_notes',
                    'installer',
                    'install_date',
                    'install_confirmed',
                    'shop_status',
                    'on_hold',
                ]}
            />
        </Container>
    );
}
