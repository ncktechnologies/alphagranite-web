import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { Container } from '@/components/common/container';
import { useGetFabsCostOfStoneQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { EditStoneCostModal } from './EditCostOfStone';

// Transform the actual API response to match IJob
const transformToJob = (item: any): IJob => ({
    id: item.fab_id,
    fab_id: String(item.fab_id),
    job_no: item.job_number || '',
    job_name: item.fab_info || '',           // fab_info acts as job name
    date: item.sct_completed_date?.split('T')[0] || '',
    fab_type: item.fab_type || '',
    sales_person_name: '',                   // not provided in this endpoint
    total_sq_ft: String(item.total_sqft ?? '0'),
    revenue: String(item.revenue ?? '0'),
    stone_cost: item.cost_of_stone ?? 0,
    // consumed field is not in response; we'll pass false and handle consume via mutation
    // Add required IJob fields with defaults
    acct_name: '',
    no_of_pieces: '-',
    gp: '-',
    draft_completed: '',
    cnc_operator: '',
    template_received: '',
    revised: '',
    sct_completed: '',
    stone_type_name: '',
    stone_color_name: '',
    stone_thickness_value: '',
    edge_name: '',
    fab_notes: [],
    job_id: 0,
    on_hold: false,
    status_id: 1,
    // Store extra field for editability
    is_cost_of_stone_editable: item.is_cost_of_stone_editable ?? true,
});

// Mutation for consuming stone cost – create this if needed


const CostOfStonePage = () => {
    const { data: salesPersonsData } = useGetSalesPersonsQuery();
    const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        let raw: any[] = [];
        if (Array.isArray(salesPersonsData)) raw = salesPersonsData;
        else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData)
            raw = (salesPersonsData as any).data || [];
        return raw;
    }, [salesPersonsData]);

    const tableState = useTableState({
        tableId: 'cost-of-stone-table',
        defaultPagination: { pageIndex: 0, pageSize: 25 },
        defaultDateFilter: 'all',
        persistState: false,
    });

    const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

    // Build query params (adjust to your endpoint's expected filters)
    const queryParams = useMemo(() => {
        const params: any = {
            skip,
            limit: tableState.pagination.pageSize,
        };
        if (tableState.searchQuery) params.search = tableState.searchQuery;
        if (tableState.searchType) params.type = tableState.searchType;
        if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all')
            params.fab_type = tableState.fabTypeFilter;
        if (tableState.salesPersonFilter && tableState.salesPersonFilter !== 'all') {
            // Sales person filter may not be supported by this endpoint; ignore or adapt
        }
        if (tableState.dateFilter && tableState.dateFilter !== 'all') {
            if (tableState.dateFilter === 'custom' && tableState.dateRange?.from) {
                params.start_date = format(tableState.dateRange.from, 'yyyy-MM-dd');
                if (tableState.dateRange.to)
                    params.end_date = format(tableState.dateRange.to, 'yyyy-MM-dd');
            } else if (tableState.dateFilter !== 'custom') {
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

    // The query hook – adjust based on how your RTK query returns data
    const { data, isLoading, refetch } = useGetFabsCostOfStoneQuery(queryParams);

    // Extract the actual data array from the nested response
    const rawData = data?.data || [];
    const totalRecords = data?.total || 0;

    const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [editingFab, setEditingFab] = useState<any>(null);

    const jobsData = useMemo(() => rawData.map(transformToJob), [rawData]);

    // Totals (only for current page)
    const totalStoneCost = jobsData.reduce((sum, job) => sum + (job.stone_cost || 0), 0);
  

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading title="Cost of Stone" description="" />
                <div className="ml-auto flex items-center gap-4">
                    {/* <div className="text-sm">
                        Total Stone Cost: <strong>${totalStoneCost.toFixed(2)}</strong>
                    </div> */}
                 
                </div>
            </Toolbar>

            <JobTable
                jobs={jobsData as IJob[]}
                path="cost-of-stone"
                isLoading={isLoading && !data}
                useBackendPagination
                totalRecords={totalRecords}
                tableState={tableState}
                showSalesPersonFilter={false}   // endpoint may not support it
                // enableMultiSelect
                // selectedRows={selectedRows}
                // setSelectedRows={setSelectedRows}
                visibleColumns={['fab_id', 'job_no', 'job_name', 'total_sq_ft', 'revenue', 'stone_cost']}
                customActionsColumn={(job) => {
                    const isEditable = (job as any).is_cost_of_stone_editable;
                    return (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingFab(job)}
                            disabled={!isEditable}
                            title={!isEditable ? "Stone cost cannot be edited for this FAB" : "Edit cost"}
                        >
                            Edit Cost
                        </Button>
                    );
                }}
            />

            <EditStoneCostModal
                open={!!editingFab}
                onClose={() => setEditingFab(null)}
                fab={editingFab}
                onSuccess={() => refetch()}
            />
        </Container>
    );
};

export default CostOfStonePage;