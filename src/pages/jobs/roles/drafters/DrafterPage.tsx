import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useLocation, Link } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Container } from '@/components/common/container';

const DrafterPage = () => {
    const location = useLocation();
    const isNewFabForm = location.pathname.includes('/new-fab-id');

    const jobsData: IJob[] = [
        {
            id: 1,
            fab_type: 'Standard',
            fab_id: '14425',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            gp: "-",
            draft_completed: "Yes",
            date: '08 October, 2025',
        },
        {
            id: 2,
            fab_type: 'FAB only',
            fab_id: '5644',
            job_name: 'Preston kitchen floor',
            job_no: '4555',
            // acct_name: 'Waller 101',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            gp: "-",
            draft_completed: "Yes",
            date: '08 October, 2025',

        },
        {
            id: 3,
            fab_type: 'Standard',
            fab_id: '33034',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            // acct_name: 'Waller 101',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            gp: "-",
            draft_completed: "Yes",
            date: '10 October, 2025',
        },
    ]
    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title="Drafting" description="" />
                    {/* <ToolbarActions>
                               <Link to="/jobs/sales/new-fab-id">
                                   <Button className="">
                                       <Plus/>
                                       New FAB ID
                                   </Button>
                               </Link>
                           </ToolbarActions> */}
                </Toolbar>
                < JobTable jobs={jobsData} path='draft' />
            </Container>
        </div>
    );
}

export default DrafterPage;