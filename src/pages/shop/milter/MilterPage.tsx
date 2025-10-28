import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Link } from 'react-router';
import { CuttingPlan } from './components/table';

const MilterPlanPage = () => {
    return (
        <div>
            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title="Miter planning" description=" " />

                    
                </Toolbar>
                <CuttingPlan />
            </Container>
        </div>
    );
}

export default MilterPlanPage;