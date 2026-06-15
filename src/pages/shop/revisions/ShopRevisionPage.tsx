import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { ShopRevisionTable } from './components/table';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';

const ShopRevisionPage = () => {
  const isSuperAdmin = useIsSuperAdmin();
  const permissions = usePermission('Shop Revision'); 

  // Determine permissions
  const canViewDetails = isSuperAdmin || permissions.can_read;
  const canExport = isSuperAdmin || permissions.can_read;

  return (
    <Container>
      <Toolbar>
        <ToolbarHeading
          title="Shop Revision"
          description="Fabs with pending or completed shop revisions"
        />
      </Toolbar>

      <ShopRevisionTable
        canViewDetails={canViewDetails}
        canExport={canExport}
      />
    </Container>
  );
};

export default ShopRevisionPage;