import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router';
import { useGetFabsQuery, FabListParams } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';

/**
 * EXAMPLE: Sales Page with Role-Based Filtering
 * 
 * This shows how to:
 * 1. Use the job API to fetch fabs
 * 2. Filter by current_stage based on user role
 * 3. Show all stages for super admin
 * 4. Handle loading and error states
 */
export function SalesPageExample() {
    // Get current stage filter based on user role
    const { currentStageFilter, isSuperAdmin } = useJobStageFilter();
    const user = useSelector((state: RootState) => state.user?.user);
    
    // Pagination and filter states
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [scheduleStartDate, setScheduleStartDate] = useState<Date | undefined>(undefined);
    const [scheduleDueDate, setScheduleDueDate] = useState<Date | undefined>(undefined);

    // Build query params with pagination, search, and filters
    const queryParams: FabListParams = {
        current_stage: currentStageFilter,
        skip: page * pageSize,
        limit: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(scheduleStartDate && { schedule_start_date: scheduleStartDate.toISOString() }),
        ...(scheduleDueDate && { schedule_due_date: scheduleDueDate.toISOString() }),
    };
    
    // Fetch fabs with role-based filtering, pagination, and search
    const { data: fabs, isLoading, error } = useGetFabsQuery(queryParams);

    if (isLoading) {
        return (
            <Container>
                <div className="flex items-center justify-center h-64">
                    <p>Loading jobs...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <div className="flex items-center justify-center h-64">
                    <p className="text-red-500">Error loading jobs</p>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading 
                    title={isSuperAdmin ? "All Jobs (Super Admin)" : "Sales - New FAB IDs"} 
                    description={isSuperAdmin ? "Viewing all job stages" : "Manage new fabrication IDs"} 
                />
                <ToolbarActions>
                    <Link to="/jobs/sales/new-fab-id">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New FAB ID
                        </Button>
                    </Link>
                </ToolbarActions>
            </Toolbar>

            <div className="mt-6">
                {/* Search and Filters */}
                <div className="mb-6 bg-white rounded-lg shadow p-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search fabs..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setPage(0); // Reset to first page on search
                                    }}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        
                        <div className="min-w-[200px]">
                            <label className="text-sm font-medium mb-2 block">Template Start Date</label>
                            <DateTimePicker
                                mode="date"
                                value={scheduleStartDate}
                                onChange={(date) => {
                                    setScheduleStartDate(date);
                                    setPage(0);
                                }}
                                placeholder="Select start date"
                            />
                        </div>
                        
                        <div className="min-w-[200px]">
                            <label className="text-sm font-medium mb-2 block">Template Due Date</label>
                            <DateTimePicker
                                mode="date"
                                value={scheduleDueDate}
                                onChange={(date) => {
                                    setScheduleDueDate(date);
                                    setPage(0);
                                }}
                                placeholder="Select due date"
                            />
                        </div>
                        
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                setScheduleStartDate(undefined);
                                setScheduleDueDate(undefined);
                                setPage(0);
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                    <div className="p-4">
                        <h3 className="text-lg font-medium mb-4">
                            {isSuperAdmin ? `All Fabs (${fabs?.length || 0})` : `Sales Fabs (${fabs?.length || 0})`}
                        </h3>
                        
                        {/* Display user info for debugging */}
                        <div className="mb-4 p-3 bg-blue-50 rounded">
                            <p className="text-sm"><strong>User:</strong> {user?.first_name} {user?.last_name}</p>
                            <p className="text-sm"><strong>Role:</strong> {user?.role?.name || 'N/A'}</p>
                            <p className="text-sm"><strong>Is Super Admin:</strong> {isSuperAdmin ? 'Yes' : 'No'}</p>
                            <p className="text-sm"><strong>Stage Filter:</strong> {currentStageFilter || 'All Stages'}</p>
                        </div>

                        {/* Fab list */}
                        <div className="space-y-2">
                            {fabs && fabs.length > 0 ? (
                                fabs.map((fab) => (
                                    <div key={fab.id} className="p-4 border rounded hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium">FAB ID: {fab.id}</h4>
                                                <p className="text-sm text-gray-600">Type: {fab.fab_type}</p>
                                                <p className="text-sm text-gray-600">Stage: {fab.current_stage || 'N/A'}</p>
                                                <p className="text-sm text-gray-600">Total SqFt: {fab.total_sqft}</p>
                                            </div>
                                            <Link to={`/job/templating/${fab.id}`}>
                                                <Button variant="outline" size="sm">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No fabs found for this stage
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Pagination */}
                {fabs && fabs.length > 0 && (
                    <div className="mt-6 bg-white rounded-lg shadow p-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, page * pageSize + (fabs?.length || 0))}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center px-4 text-sm">
                                Page {page + 1}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={(fabs?.length || 0) < pageSize}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
}
