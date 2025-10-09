import { Container } from '@/components/common/container';
import { Employees } from './components/employer';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';

export function EmployeePage() {
    return (
        <div className="">

            <Container>
                <Toolbar className=' '>

                    <ToolbarHeading title=" Employees" description="Manage all Alpha Granite employees here" />

                    <ToolbarActions>
                        <Button className="">Add Employer</Button>
                    </ToolbarActions>
                </Toolbar>
                <Employees />
            </Container>
        </div>
    );
}
