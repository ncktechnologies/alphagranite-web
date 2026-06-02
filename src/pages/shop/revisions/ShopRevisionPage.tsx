import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { ShopRevisionTable } from './components/table';

const ShopRevisionPage = () => {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading
          title="Shop Revision"
          description="Fabs with pending or completed shop revisions"
        />
      </Toolbar>

      <ShopRevisionTable />
    </Container>
  );
};

export default ShopRevisionPage;
