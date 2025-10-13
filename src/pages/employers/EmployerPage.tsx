import { Container } from '@/components/common/container';
import { Employees } from './components/employer';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EmploymentFormSheet from './components/employmentFormSheet';

export function EmployeePage() {
    return (
        <div className="">

            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title=" Employees" description="Manage all Alpha Granite employees here" />

                    <ToolbarActions>
                        <EmploymentFormSheet trigger={
                        <Button className="">
                            <Plus/>
                            New employee
                        </Button>
                        }/>
                    </ToolbarActions>
                </Toolbar>
                <Employees />
            </Container>
        </div>
    );
}
