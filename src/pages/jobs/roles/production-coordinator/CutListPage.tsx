import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { CutListTable } from './CutListTable';
import { IJob } from '@/pages/jobs/components/job';
import { useGetFabsQuery } from '@/store/api/job';
import { transformFabToJob } from '@/pages/jobs/roles/drafters/DrafterPage';

const CutListPage = () => {
    const [jobs, setJobs] = useState<IJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Fetch FABs in cut_list stage
    const { data: fabsData, isLoading: isFabsLoading, refetch } = useGetFabsQuery({ 
        current_stage: 'cut_list' 
    });

    useEffect(() => {
        if (fabsData && !isFabsLoading) {
            // Transform FAB data to IJob format
            const transformedJobs = fabsData.map((fab: any) => transformFabToJob(fab));
            setJobs(transformedJobs);
            setIsLoading(false);
        }
    }, [fabsData, isFabsLoading]);

    const handleRowClick = (fabId: string) => {
        // Handle row click - navigate to job details
        console.log('Clicked on FAB ID:', fabId);
    };

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Cut List" description="Jobs scheduled for shop cut date" />
                </Toolbar>
            </Container>

            <div className="mt-6">
                <CutListTable 
                    jobs={jobs}
                    path="/job/cut-list"
                    isLoading={isLoading}
                    onRowClick={handleRowClick}
                />
            </div>
        </>
    );
};

export default CutListPage;