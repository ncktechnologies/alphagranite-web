import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { ShopTable } from '../components/resurface_table';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';


const ResurfacingStatusPage = () => {
    const isSuperAdmin = useIsSuperAdmin();
    const permissions = usePermission('Resurfacing Status');

    const canManageShopPlans = isSuperAdmin || permissions.can_create; // Create plan, auto schedule, view calendar in table
    const canAddNote = isSuperAdmin || permissions.can_create;
    const canExport = isSuperAdmin || permissions.can_read;


    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Resurfacing Status" description=" " />

                    {/* <ToolbarActions>
                        <Link to='/shop/settings'>
                            <Button className="">
                                <Settings />
                                Shop Settings
                            </Button>
                        </Link>
                    </ToolbarActions> */}
                </Toolbar>
                <ShopTable
                    canManageShopPlans={canManageShopPlans}
                    canAddNote={canAddNote}
                    canExport={canExport}
                />
            </Container>
        </div>
    );
}

export default ResurfacingStatusPage;