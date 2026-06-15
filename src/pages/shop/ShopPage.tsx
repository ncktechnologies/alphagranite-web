import { Container } from '@/components/common/container';
import { ShopTable } from './components/table';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings, Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';

const ShopPage = () => {
    const isSuperAdmin = useIsSuperAdmin();
    const permissions = usePermission('Shop Planning'); 

    // Permissions for toolbar buttons
    const canViewCalendar = isSuperAdmin || permissions.can_read;
    const canViewSettings = isSuperAdmin || permissions.can_create;

    // Permissions for the ShopTable (actions, plan cells, export)
    const canManageShopPlans = isSuperAdmin || permissions.can_create; // Create plan, auto schedule, view calendar in table
    const canAddNote = isSuperAdmin || permissions.can_create;
    const canExport = isSuperAdmin || permissions.can_read;

    return (
        <div>
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="Shop Planning" description="View shop status list for jobs" />
                    <ToolbarActions>
                        {canViewCalendar && (
                            <Link to='/shop/calendar'>
                                <Button variant="outline" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    View Calendar
                                </Button>
                            </Link>
                        )}
                        {canViewSettings && (
                            <Link to='/shop/settings'>
                                <Button className="gap-2">
                                    <Settings className="h-4 w-4" />
                                    Shop Settings
                                </Button>
                            </Link>
                        )}
                    </ToolbarActions>
                </Toolbar>
                <ShopTable
                    canManageShopPlans={canManageShopPlans}
                    canAddNote={canAddNote}
                    canExport={canExport}
                />
            </Container>
        </div>
    );
};

export default ShopPage;