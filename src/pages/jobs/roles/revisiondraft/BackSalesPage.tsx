import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { useGetFabsQuery, Fab } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


// Transform Fab data to match IJob interface
const transformFabToJob = (fab: Fab): IJob => {
    const fabData = fab as any; // Cast to any to access API-specific properties
    return {
        id: fab.id,
        fab_type: fab.fab_type,
        fab_id: String(fab.id),
        job_name: `${fab.job_details?.name}`,
        job_no: String(fab.job_details?.job_number),
        date: fab.draft_completed_date || '',
        current_stage: fab.current_stage,
        sales_person_name: fab.sales_person_name || '',
        // Optional fields with default values
        acct_name: '',
        no_of_pieces: fab.no_of_pieces ? `${fab.no_of_pieces}` : "-",
        total_sq_ft: String(fab.total_sqft || "-"),
        // revenue: fab.job_details?.project_value || "-",
        // gp: "-",
        revision_completed: fabData.sales_ct_data?.is_revision_completed ? 'Yes' : 'No',
        revisor: fabData.sales_ct_data?.updated_by_name || '',
        revision_number: fabData.sales_ct_data?.current_revision_count ? `#${fabData.sales_ct_data.current_revision_count}` : '#1',
        revision_reason: fabData.sales_ct_data?.revision_reason || fabData.sales_ct_data?.draft_note || 'N/A',
        revision_type: fabData.sales_ct_data?.revision_type || '-',
        sct_completed: '',
        // template_schedule: fab.templating_schedule_start_date ? formatDate(fab.templating_schedule_start_date) : '-',
        // template_received: '',
        // templater: fab.technician_name || '-',
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

    // Use independent table state for revision table
    const tableState = useTableState({
        tableId: 'revision-table',
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
            current_stage: 'revision', // Revision stage
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

        console.log('Revision Query Params:', params); // Debug log
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
    const { data, isLoading, isFetching, isError, error } = useGetFabsQuery(queryParams);

    const handleRowClick = (fabId: string) => {
        navigate(`/job/revision/${fabId}`);
    };

    // Transform Fab data to IJob format
    const jobsData: IJob[] = data?.data?.map(transformFabToJob) || [];

    if (isLoading && !data) {
        return (
            <div className="">
                <Container>
                    <Toolbar className=' '>
                        <ToolbarHeading title="Revision queue" description="" />
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
                        <ToolbarHeading title="Revision queue" description="" />
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

    console.log('Revision Data:', data); // Debug log

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Revision queue"
                    description="View and manage revision tasks"
                />
            </Toolbar>
            <JobTable
                jobs={jobsData}
                path='revision'
                isLoading={isLoading || isFetching}
                // onRowClick={handleRowClick}
                useBackendPagination={true}
                totalRecords={data?.total || 0}
                tableState={tableState}
                showSalesPersonFilter={true}
                salesPersons={salesPersons}
                visibleColumns={['date', 'fab_type', 'fab_id', 'job_no', 'fab_info', 'revision_reason', 'file', 'no_of_pieces', 'total_sq_ft', 'draft_notes', 'sales_person_name', 'revisor', 'revision_type', 'revision_notes', 'revision_completed', 'revision_note', 'on_hold']}
            />
        </Container>
    );
}