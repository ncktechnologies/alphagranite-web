import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { ShopTable } from '../components/resurface_table';

const ResurfacingStatusPage = () => {
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
                <ShopTable />
            </Container>
        </div>
    );
}

export default ResurfacingStatusPage;