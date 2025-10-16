import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepartmentCard } from './DepartmentCard';
import DepartmentFormSheet from './components/departmentSheet';

export function DepartmentPage() {
    return (
        <div className="">

            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title=" Department" description="Manage all Alpha Granite departments" />

                    <ToolbarActions>
                        <DepartmentFormSheet trigger={

                            <Button className="">
                                <Plus />
                                New Department
                            </Button>
                        } />
                    </ToolbarActions>
                </Toolbar>
                <DepartmentCard />
            </Container>
        </div>
    );
}
