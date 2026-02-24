import { Container } from '@/components/common/container';
import { ShopTable } from './components/table';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings, Calendar } from 'lucide-react';
import { Link } from 'react-router';

const ShopPage = () => {
    return (
        <div>
            <Container>
                 <Toolbar className=' '>

                    <ToolbarHeading title="Shop" description="View shop status list for jobs  " />

                    <ToolbarActions>
                        <Link to='/shop/calendar'>
                            <Button variant="outline" className="gap-2">
                                <Calendar className="h-4 w-4" />
                                View Calendar
                            </Button>
                        </Link>
                        <Link to='/shop/settings'>
                            <Button className="gap-2">
                                <Settings className="h-4 w-4" />
                                Shop Settings
                            </Button>
                        </Link>
                    </ToolbarActions>
                </Toolbar>
                <ShopTable/>
            </Container>
        </div>
    );
}

export default ShopPage;
