import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { CuttingPlan } from './components/table';

const ShopPage = () => {
    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Shop" description="View shop status list for jobs  " />

                    <ToolbarActions>
                        <Link to='/shop/settings'>
                            <Button className="">
                                <Settings />
                                Shop Settings
                            </Button>
                        </Link>
                    </ToolbarActions>
                </Toolbar>
                <CuttingPlan />
            </Container>
        </div>
    );
}

export default ShopPage;