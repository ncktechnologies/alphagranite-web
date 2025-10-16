import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepartmentTable } from './DepartmentTable';
import { useLocation } from 'react-router';

export function DepartmentDetailsPage() {
    const {state} = useLocation();
    const department = state?.department;
    console.log(department)
    return (
        <div className="">

            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title={department?.name} description={department?.description} />

                    {/* <ToolbarActions>
                        <Button className="">
                            <Plus/>
                            New Department
                        </Button>
                    </ToolbarActions> */}
                </Toolbar>
                < DepartmentTable employees={department?.users || []}/>
            </Container>
        </div>
    );
}
