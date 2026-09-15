import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery, Fab, useGetFabsCompletionQuery } from '@/store/api/job';
import { useGetEmployeesQuery, useGetEmployeeSalesPersonsQuery, useGetSalesPersonsQuery } from '@/store/api/employee';
import { useGetRolesQuery } from '@/store/api/role';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useIsSuperAdmin, usePermission } from '@/hooks/use-permission';
import { safeFormatDate } from '@/pages/shop/components/statusDetails';

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
        date: (fab as any).shop_est_completion_date ? (fab as any).shop_est_completion_date : (fab as any).estimated_completion_date,
        shop_est_completion_date: (fab as any).shop_est_completion_date
            ? safeFormatDate((fab as any).shop_est_completion_date, 'MM/dd/yyyy')
            : (fab as any).estimated_completion_date
                ? safeFormatDate((fab as any).estimated_completion_date, 'MM/dd/yyyy')
                : '-',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        input_area: fab.input_area || '',
        template_received: fab.template_received ? 'Yes' : 'No',
        template_needed: fab.template_needed ? 'No' : 'Yes',
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.revenue ? String(fab.revenue) : "-",
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

        // Install scheduling fields
        est_completion_date: (fab as any).est_completion_date
            ? formatDate((fab as any).est_completion_date)
            : '-',
        percent_complete: (fab as any).percentage_completion ?? undefined,
        completion_date: (fab as any).completion_date
            ? formatDate((fab as any).completion_date)
            : undefined,
        installer: (fab as any).install_details?.installer_name || (fab as any).installer || undefined,
        extra_crew: [
            (fab as any).install_details?.extra_crew_1,
            (fab as any).install_details?.extra_crew_2,
            (fab as any).install_details?.extra_crew_3,
        ]
            .filter((value): value is string => !!value && value !== '0' && value !== 0)
            .join(', ') || '-',
        install_date: (fab as any).install_details?.scheduled_install_date
            ? formatDate((fab as any).install_details?.scheduled_install_date)
            : undefined,
        install_confirmed: (fab as any).install_details?.install_confirmed ?? undefined,
        shop_status: (fab as any).shop_current_stage || undefined,
    };
};

export function InstallSchedulingPage() {
    const navigate = useNavigate();
    const isSuperAdmin = useIsSuperAdmin();

    // 👇 Get permissions for the 'install_scheduling' menu
    const permissions = usePermission('Install to Schedule');

    // Determine what actions the user is allowed to do
    const canAddNote = isSuperAdmin || permissions.can_create;
    const canToggleOnHold = isSuperAdmin || permissions.can_create;

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

    const { data: rolesData } = useGetRolesQuery();
    const installerRoleId = useMemo(() => {
        if (!rolesData) return null;
        const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
        if (!Array.isArray(roles)) return null;
        const installerRole = roles.find((role: any) => (role.name || '').toLowerCase().trim() === 'installer');
        return installerRole?.id ?? null;
    }, [rolesData]);

    const { data: installersData } = useGetEmployeesQuery(
        {
            role_id: installerRoleId ?? undefined,
            sort_by: 'first_name',
            sort_order: 'asc',
            limit: 500,
        },
        {
            skip: !installerRoleId,
        }
    );

    const installers = useMemo(() => {
        if (!installersData) return [];
        const employees = installersData?.data ?? installersData;
        if (!Array.isArray(employees)) return [];
        return employees;
    }, [installersData]);

    const installerOptions = useMemo(
        () => installers.map((installer: any) => ({
            id: String(installer.id),
            name: `${installer.first_name || ''} ${installer.last_name || ''}`.trim() || installer.email || 'Unknown Installer',
        })),
        [installers]
    );

    const [installerFilter, setInstallerFilter] = useState('all');

    // Use independent table state
    const tableState = useTableState({
        tableId: 'install-scheduling-table',
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
        if (installerFilter && installerFilter !== 'all') {
            const selectedInstaller = installerOptions.find((installer) => String(installer.id) === String(installerFilter));
            if (selectedInstaller?.id) params.installer_id = Number(selectedInstaller.id);
        }
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from)
                    params.template_completed_start = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to)
                    params.template_completed_end = format(tableState.dateRange.to, 'yyyy-MM-dd');
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
        installerFilter,
        installerOptions,
        tableState.dateFilter,
        tableState.dateRange,
        salesPersons,
    ]);

    const [dateGrouping, setDateGrouping] = useState<'date' | 'month' | 'none'>('month');

    const { data, isLoading, isFetching, isError, error } = useGetFabsCompletionQuery(queryParams);
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
                    title="Install To Schedule"
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
                path="install-to-schedule"
                isLoading={isLoading && !data}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                showInstallerFilter={false}
                installers={installerOptions}
                installerFilter={installerFilter}
                setInstallerFilter={setInstallerFilter}
                showScheduleFilter={false}
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
                    // 'extra_crew',
                    'install_scheduling_notes',
                    'shop_status',
                    'shop_est_completion_date'
                ]}
                pageRole="installer"
                canViewInstallerTimer={permissions.can_create}
                canAddNote={canAddNote}
                canToggleOnHold={canToggleOnHold}
                noteStage="install_scheduling"
            />
        </Container>
    );
}