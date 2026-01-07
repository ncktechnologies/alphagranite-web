import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetFabsByStageQuery } from '@/store/api/job';
import { FinalProgrammingTable } from '../../jobs/roles/production-coordinator/FinalProgrammingTable';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@/hooks/use-table-state';
import { useMemo } from 'react';

export function FinalProgrammingPage() {
  const navigate = useNavigate();

  // Use independent table state for this page
  const tableState = useTableState({
    tableId: 'final-programming-table',
    defaultPagination: { pageIndex: 0, pageSize: 10 },
    defaultDateFilter: 'all',
    defaultScheduleFilter: 'scheduled',
    persistState: true,
  });

  // Calculate skip value for pagination
  const skip = tableState.pagination.pageIndex * tableState.pagination.pageSize;

  // Build query params for backend
  const queryParams = useMemo(() => {
    const params: any = {
      skip,
      limit: tableState.pagination.pageSize,
    };

    if (tableState.searchQuery) {
      params.search = tableState.searchQuery;
    }

    if (tableState.fabTypeFilter && tableState.fabTypeFilter !== 'all') {
      params.fab_type = tableState.fabTypeFilter;
    }

    // Handle schedule status filter (scheduled/unscheduled)
    if (tableState.scheduleFilter && tableState.scheduleFilter !== 'all') {
      params.schedule_status = tableState.scheduleFilter;
    }

    if (tableState.dateFilter && tableState.dateFilter !== 'all') {
      params.date_filter = tableState.dateFilter;
    }

    if (tableState.dateRange?.from) {
      params.schedule_start_date = tableState.dateRange.from.toISOString();
    }

    if (tableState.dateRange?.to) {
      params.schedule_due_date = tableState.dateRange.to.toISOString();
    }

    return params;
  }, [
    skip,
    tableState.pagination.pageSize,
    tableState.searchQuery,
    tableState.fabTypeFilter,
    tableState.scheduleFilter, // Add scheduleFilter dependency
    tableState.dateFilter,
    tableState.dateRange,
  ]);

  // Fetch data with backend pagination and filtering
  const { data, isLoading, isFetching } = useGetFabsByStageQuery({
    stage_name: 'final_programming',
    params: queryParams,
  });

  const handleRowClick = (fabId: string) => {
    navigate(`/job/final-programming/${fabId}`);
  };

  return (
    <>
      <Container className="lg:mx-0">
        <Toolbar>
          <ToolbarHeading
            title="Final Programming"
            description="View and manage final programming tasks"
          />
        </Toolbar>
      </Container>

      <Container className="pt-6">
        <FinalProgrammingTable
          data={data?.data || []}
          totalRecords={data?.total || 0}
          isLoading={isLoading || isFetching}
          onRowClick={handleRowClick}
          tableState={tableState}
        />
      </Container>
    </>
  );
}

export default FinalProgrammingPage;
