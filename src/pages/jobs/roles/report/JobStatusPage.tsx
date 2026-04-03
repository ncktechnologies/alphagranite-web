import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';

import { JobStatusTable } from './JobStatus';

const JobStatusPage = () => {
    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Job Status" description=" " />

                    {/* <ToolbarActions>
                        <Link to='/shop/settings'>
                            <Button className="">
                                <Settings />
                                Shop Settings
                            </Button>
                        </Link>
                    </ToolbarActions> */}
                </Toolbar>
                <JobStatusTable/>
            </Container>
        </div>
    );
}

export default JobStatusPage;