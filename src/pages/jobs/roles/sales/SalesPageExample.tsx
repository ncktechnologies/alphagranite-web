import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useGetFabsQuery } from '@/store/api/job';
import { useJobStageFilter } from '@/hooks/use-job-stage';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

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
    
    // Fetch fabs with role-based filtering
    // Super admin: currentStageFilter is undefined, so gets ALL fabs
    // Sales role: currentStageFilter is 'sales', so gets only sales fabs
    const { data: fabs, isLoading, error } = useGetFabsQuery({
        current_stage: currentStageFilter,
        limit: 100,
    });

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
            </div>
        </Container>
    );
}
