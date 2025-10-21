import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import ShopTable from './components/table';

const ShopPage = () => {
    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Shop" description="View shop status list for jobs  " />


                </Toolbar>
                <ShopTable />
            </Container>
        </div>
    );
}

export default ShopPage;