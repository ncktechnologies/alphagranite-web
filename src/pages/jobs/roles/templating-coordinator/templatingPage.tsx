import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetFabsQuery, Fab } from '@/store/api/job';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AssignTechnicianModal } from './components/AssignTech';
import { RescheduleTechnicianModal } from './components/RescheduleTechnicianModal';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';
import { useGetRolesQuery } from "@/store/api";

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
        fab_id: `${fab.id}`,
        job_name: fab.job_details?.name || `Job ${fab.job_id}`,
        job_no: fab.job_details?.job_number || String(fab.job_id),
        date: fab.templating_schedule_start_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        acct_name: fab.account_name || '',
        template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '',
        template_schedule_raw: fab.templating_schedule_start_date || '',
        template_received: fab.template_received ? 'Yes' : 'No',
        templater: fab.technician_name || '-',
        total_sq_ft: String(fab.total_sqft || "-"),
        revenue: fab.revenue?.toString() || "-",
        revised: '',
        sct_completed: '',
        draft_completed: '',
        fab_notes: fab.fab_notes || [],
        stone_type_name: fab.stone_type_name || '',
        stone_color_name: fab.stone_color_name || '',
        stone_thickness_value: fab.stone_thickness_value || '',
        edge_name: fab.edge_name || '',
        input_area: fab.input_area || '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        job_id: fab.job_id,
        on_hold: fab.on_hold,
        status_id: fab.status_id,
        templating_completed: fab?.is_complete,
        templating_id: fab.stage_data?.templating_id,
        rescheduled: fab.stage_data?.rescheduled,
        technician_id: fab.stage_data?.technician_id,
    };
};

export function TemplatingPage() {
    const navigate = useNavigate();

    const permissions = usePermission('templating');
    const isSuperAdmin = useIsSuperAdmin();

    const canReschedule = isSuperAdmin || permissions.can_create;
    const canAssignTemplater = isSuperAdmin || permissions.can_create;
    const canAddNote = isSuperAdmin || permissions.can_create;
    const canToggleOnHold = isSuperAdmin || permissions.can_create;

    // ─── Get templater role ID ──────────────────────────────────────────────
    const { data: rolesData } = useGetRolesQuery();
    const templaterRoleId = useMemo(() => {
        if (!rolesData) return null;
        const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
        if (!Array.isArray(roles)) return null;
        const role = roles.find((r: any) =>
            (r.name || '').toLowerCase() === 'templator' ||
            (r.name || '').toLowerCase() === 'template scheduler'
        );
        return role?.id ?? null;
    }, [rolesData]);

    // ─── Fetch employees with templater role ──────────────────────────────
    const { data: templaterEmployees, isLoading: templatersLoading } = useGetEmployeesQuery(
        {
            role_id: templaterRoleId ?? undefined,
            sort_by: 'first_name',
            sort_order: 'asc',
            limit: 500,
        },
        { skip: !templaterRoleId }
    );

    // ─── Build templater list and map ──────────────────────────────────────
    const templaters = useMemo(() => {
        if (!templaterEmployees) return [];
        const employees = templaterEmployees?.data ?? templaterEmployees;
        if (!Array.isArray(employees)) return [];
        return employees.map((emp: any) =>
            `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || String(emp.id)
        ).sort();
    }, [templaterEmployees]);

    const templaterIdMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!templaterEmployees) return map;
        const employees = templaterEmployees?.data ?? templaterEmployees;
        if (!Array.isArray(employees)) return map;
        employees.forEach((emp: any) => {
            const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || String(emp.id);
            map.set(name, emp.id);
        });
        return map;
    }, [templaterEmployees]);

    // ─── Filter state ──────────────────────────────────────────────────────
    const [templaterFilter, setTemplaterFilter] = useState<string>('all');

    // ─── Table state ──────────────────────────────────────────────────────
    const tableState = useTableState({
        tableId: 'templating-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
            current_stage: 'templating',
        };
        if (tableState.searchQuery) params.search = tableState.searchQuery;
        if (tableState.searchType) params.type = tableState.searchType;
        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') params.fab_type = tableState.fabTypeFilter;

        // ─── Templater filter ──────────────────────────────────────────────
        if (templaterFilter !== 'all') {
            if (templaterFilter === 'no_templater') params.templater_id = 0;
            else {
                const templaterId = templaterIdMap.get(templaterFilter);
                if (templaterId) params.templater_id = templaterId;
            }
        }

        if (tableState.scheduleFilter && tableState.scheduleFilter !== 'all') params.schedule_status = tableState.scheduleFilter;
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom') {
                if (tableState.dateRange?.from) params.schedule_start_date = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange?.to && tableState.dateRange.to !== tableState.dateRange.from) params.schedule_due_date = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else {
                params.date_filter = tableState.dateFilter;
            }
        }
        return params;
    }, [skip, tableState.pagination.pageSize, tableState.searchQuery, tableState.fabTypeFilter, templaterFilter, tableState.scheduleFilter, tableState.dateFilter, tableState.dateRange, tableState.searchType, templaterIdMap]);

    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const handleRowClick = (fabId: string) => {
        const job = data?.data?.find(fab => fab.id.toString() === fabId);
        const hasTemplateTechnician = job?.technician_name && job.technician_name !== '-' && job.technician_name.trim() !== '';
        navigate(hasTemplateTechnician ? `/job/templating-details/${fabId}` : `/job/templating/${fabId}`);
    };

    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    // ─── Modal states ──────────────────────────────────────────────────────
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<IJob | null>(null);

    const handleAssignClick = (job: IJob) => {
        setSelectedJob(job);
        setAssignModalOpen(true);
    };

    const handleRescheduleClick = (job: IJob) => {
        setSelectedJob(job);
        setRescheduleModalOpen(true);
    };

    if (isLoading && !data) {
        return (
            <Container>
                <Toolbar>
                    <ToolbarHeading title="Template Scheduling" description="View and manage templates and template schedule" />
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
                    <ToolbarHeading title="Template Scheduling" description="View and manage templates and template schedule" />
                </Toolbar>
                <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error ? `Failed to load FAB data: ${JSON.stringify(error)}` : "Failed to load FAB data"}</AlertDescription>
                </Alert>
            </Container>
        );
    }

    const totalSqFt = jobsData.reduce((total, job) => total + (Number(job.total_sq_ft) || 0), 0);

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading title="Template Scheduling" description="View and manage templates and template schedule" />
            </Toolbar>

            <Tabs defaultValue="all" className="mt-4">
                <TabsList className="bg-transparent p-2 border flex flex-wrap gap-1">
                    {/* your tabs content – unchanged */}
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <JobTable
                        jobs={jobsData}
                        path="templating"
                        showScheduleFilter={true}
                        isLoading={isLoading && !data}
                        useBackendPagination={true}
                        totalRecords={data?.total || 0}
                        tableState={tableState}
                        showTemplaterFilter={true}
                        templaters={templaters}
                        templaterFilter={templaterFilter}
                        setTemplaterFilter={setTemplaterFilter}
                        visibleColumns={['fab_type', 'fab_id', 'job_no', 'fab_info', 'total_sq_ft', 'templating_notes', 'templater']}
                        getPath={(job) => {
                            const hasTemplateTechnician = job.templater && job.templater !== '-' && job.templater.trim() !== '';
                            return hasTemplateTechnician ? 'templating-details' : 'templating';
                        }}
                        canReschedule={canReschedule}
                        canAssignTemplater={canAssignTemplater}
                        canAddNote={canAddNote}
                        onRescheduleClick={handleRescheduleClick}
                        onAssignClick={handleAssignClick}
                        pageRole="templater"
                        canViewTemplaterTimer={permissions.can_create}
                        canToggleOnHold={canToggleOnHold}
                    />

                    <AssignTechnicianModal
                        open={assignModalOpen}
                        onClose={() => { setAssignModalOpen(false); setSelectedJob(null); }}
                        fabData={selectedJob ? { fabId: selectedJob.fab_id, jobName: selectedJob.job_name, revenue: selectedJob.revenue, total_sqft: selectedJob.total_sqft } : undefined}
                    />

                    <RescheduleTechnicianModal
                        open={rescheduleModalOpen}
                        onClose={() => { setRescheduleModalOpen(false); setSelectedJob(null); }}
                        fabData={selectedJob ? {
                            fabId: selectedJob.fab_id,
                            jobName: selectedJob.job_name,
                            revenue: selectedJob.revenue,
                            technicianId: selectedJob.technician_id,
                            date: selectedJob.template_schedule_raw ? (() => {
                                if (/^\d{4}-\d{2}-\d{2}$/.test(selectedJob.template_schedule_raw)) return selectedJob.template_schedule_raw;
                                const d = new Date(selectedJob.template_schedule_raw);
                                if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
                                return '';
                            })() : ''
                        } : undefined}
                        templatingId={selectedJob?.templating_id}
                    />
                </TabsContent>
            </Tabs>
        </Container>
    );
}