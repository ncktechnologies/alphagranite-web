import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';

export function DraftRevisionPage() {

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
            revised: "no",
            sct_completed: "Yes",
            date: '08 October, 2025',
        },
        {
            id: 2,
            fab_type: 'FAB only',
            fab_id: '5644',
            job_name: 'Preston kitchen floor',
            job_no: '4555',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            revised: "no",
            sct_completed: "Yes",
            date: '08 October, 2025',
        },
        {
            id: 3,
            fab_type: 'Standard',
            fab_id: '33034',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            revised: "no",
            sct_completed: "Yes",
            date: '10 October, 2025',
        },
        {
            id: 4,
            fab_type: 'FAB only',
            fab_id: '60055',
            job_name: 'Preston kitchen floor',
            job_no: '5666',
            no_of_pieces: "91 Hug × 15 Hug",
            total_sq_ft: "—",
            revenue: "—",
            revised: "no",
            sct_completed: "Yes",
            date: '10 October, 2025',
        },
    ];


    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Revision que"
                    description=""
                />

            </Toolbar>
            < JobTable jobs={jobsData} path='revision' />
        </Container>
    );
}
