import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLocation, Link } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';


export function TechnicianPage() {
    const location = useLocation();
    const isNewFabForm = location.pathname.includes('/new-fab-id');

    const jobsData: IJob[] = [
        {
            id: 1,
            fab_type: 'Standard',
            fab_id: '14425',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            // acct_name: 'Waller 101',
            template_schedule: '-',
            template_received: 'No',
            templater: '-',
            date: '08 October, 2025',
        },
        {
            id: 2,
            fab_type: 'FAB only',
            fab_id: '5644',
            job_name: 'Preston kitchen floor',
            job_no: '4555',
            // acct_name: 'Waller 101',
            template_schedule: '08 Oct, 2025',
            template_received: 'Yes',
            templater: 'Jenny Wilson',
            date: '08 October, 2025',
        },
        {
            id: 3,
            fab_type: 'Standard',
            fab_id: '33034',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            // acct_name: 'Waller 101',
            template_schedule: '-',
            template_received: 'No',
            templater: '-',
            date: '10 October, 2025',
        },
    ]

  

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="Templating" description="" />
                    {/* <ToolbarActions>
                        <Link to="/jobs/sales/new-fab-id">
                            <Button className="">
                                <Plus/>
                                New FAB ID
                            </Button>
                        </Link>
                    </ToolbarActions> */}
                </Toolbar>
                < JobTable jobs={jobsData} path='technician'/>
            </Container>
        </div>
    );
}
