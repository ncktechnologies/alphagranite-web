import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepartmentCard } from './DepartmentCard';
import DepartmentFormSheet from './components/departmentSheet';
import { Can } from '@/components/permission';

export function DepartmentPage() {
    return (
        <div className="">

            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title=" Department" description="Manage all Alpha Granite departments" />

                    <ToolbarActions>
                        <Can action="create" on="department">
                            <DepartmentFormSheet trigger={

                                <Button className="">
                                    <Plus />
                                    New Department
                                </Button>
                            } />
                        </Can>
                    </ToolbarActions>
                </Toolbar>
                <DepartmentCard />
            </Container>
        </div>
    );
}
