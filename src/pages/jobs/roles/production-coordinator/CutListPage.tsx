import { useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { CutListTableWithCalculations } from './CutListTableWithCalculations';
import { useGetFabsQuery } from '@/store/api/job';

const CutListPage = () => {
    const [fabs, setFabs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Fetch FABs in cut_list stage
    const { data: fabsData, isLoading: isFabsLoading, refetch } = useGetFabsQuery({ 
        current_stage: 'cut_list' 
    });

    useEffect(() => {
        if (fabsData && !isFabsLoading) {
            // Handle both possible response formats
            const fabsArray = Array.isArray(fabsData) 
                ? fabsData 
                : fabsData && typeof fabsData === 'object' && 'data' in fabsData 
                    ? fabsData.data 
                    : [];
                
            setFabs(fabsArray);
            setIsLoading(false);
        }
    }, [fabsData, isFabsLoading]);

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Cut List" description="Jobs scheduled for shop cut date" />
                </Toolbar>
            </Container>

            <Container className="mt-6">
                <CutListTableWithCalculations 
                    fabs={fabs}
                    path="/job/cut-list"
                    isLoading={isLoading}
                />
            </Container>
        </>
    );
};

export default CutListPage;