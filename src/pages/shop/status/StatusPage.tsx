import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { ShopStatusTable } from '../components/statustable';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';


const ShopStatusPage = () => {
    const isSuperAdmin = useIsSuperAdmin();
    const permissions = usePermission('Shop Status');

    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Shop Status" description="View shop status list for jobs" />


                </Toolbar>
                <ShopStatusTable
                    canAddNote={isSuperAdmin || permissions.can_create}
                    canExport={isSuperAdmin || permissions.can_read}
                />
            </Container>
        </div>
    );
}

export default ShopStatusPage;