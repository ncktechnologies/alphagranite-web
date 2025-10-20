import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useLocation, Link } from 'react-router';
import { JobTable } from '../../components/JobTable';
import { IJob } from '../../components/job';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function TemplatingPage() {

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
        {
            id: 4,
            fab_type: 'FAB only',
            fab_id: '60055',
            job_name: 'Preston kitchen floor',
            job_no: '5666',
            // acct_name: 'Waller 101',
            template_schedule: '08 Oct, 2025',
            template_received: 'Yes',
            templater: 'Darlene Robertson',
            date: '10 October, 2025',
        },
    ];



    // Filter logic
    const unscheduledJobs = jobsData.filter(job => job.template_schedule === '-' || job.template_schedule === '');
    const incompleteJobs = jobsData.filter(job => job.template_received === 'No');
    const completedJobs = jobsData.filter(job => job.template_received === 'Yes');

    return (
        <Container>
            <Toolbar>
                <ToolbarHeading
                    title="Templating"
                    description="Manage and track all Alpha Granite templating jobs"
                />

            </Toolbar>

            <Tabs defaultValue="all" className="mt-4">
                <TabsList className=" bg-transparent p-2 border  flex flex-wrap gap-1">
                    <TabsTrigger value="all">
                         
                        <span className="flex items-center gap-2">
                            FabId
                            <span className=" bg-[#E1FCE9] text-base px-[6px] text-text rounded-[50px]" >
                            {jobsData.length}
                            </span>
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="unscheduled">
                        Unscheduled
                    </TabsTrigger>
                    <TabsTrigger value="incomplete">
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            Incomplete
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            Completed ({completedJobs.length})
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <JobTable jobs={jobsData} path='templating' />
                </TabsContent>

                <TabsContent value="unscheduled" className="mt-4">
                    <JobTable jobs={unscheduledJobs} path='templating'/>
                </TabsContent>

                <TabsContent value="incomplete" className="mt-4">
                    <JobTable jobs={incompleteJobs} path='templating'/>
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                    <JobTable jobs={completedJobs} path='templating'/>
                </TabsContent>
            </Tabs>
        </Container>
    );
}
