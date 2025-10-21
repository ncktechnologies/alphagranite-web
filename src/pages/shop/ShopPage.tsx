import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import ShopTable from './components/table';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';

const ShopPage = () => {
    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Shop" description="View shop status list for jobs  " />

                    <ToolbarActions>
                            <Link to='' className="">
                                <Settings />
                                Shop Seetings
                            </Link>
                    </ToolbarActions>
                </Toolbar>
                <ShopTable />
            </Container>
        </div>
    );
}

export default ShopPage;