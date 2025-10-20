import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';

export function PredraftPage() {

    const jobsData: IJob[] = [
        {
            id: 1,
            fab_type: 'Standard',
            fab_id: '14425',
            job_name: 'Preston kitchen floor',
            job_no: '9999',
            template_schedule: '-',
            template_received: 'Yes',
            templater: '-',
            date: '08 October, 2025',
        },
        {
            id: 2,
            fab_type: 'FAB only',
            fab_id: '5644',
            job_name: 'Preston kitchen floor',
            job_no: '4555',
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
            template_schedule: '-',
            template_received: 'No',
            templater: '-',
            date: '10 October, 2025',
        },
        {
            id: 4,
            fab_type: 'FAB only',
            fab_id: '60055',
            job_name: 'Preston kitchen floor',
            job_no: '5666',
            template_schedule: '08 Oct, 2025',
            template_received: 'Yes',
            templater: 'Darlene Robertson',
            date: '10 October, 2025',
        },
    ];


    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Pre-draft review"
                    description=""
                />

            </Toolbar>
                < JobTable jobs={jobsData} path='predraft'/>
        </Container>
    );
}
