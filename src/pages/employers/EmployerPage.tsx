import { Container } from '@/components/common/container';
import { Employees } from './components/employer';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import EmployeeFormSheet from './components/employeeSheet';
import { useState } from 'react';
import { Can } from '@/components/permission';

export function EmployeePage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    return (
        <div className="">
            <Container>
                <Toolbar className=' '>
                    <ToolbarHeading title=" Employees" description="Manage all Alpha Granite employees here" />

                    <ToolbarActions>
                        <Can action="create" on="employees">
                            <EmployeeFormSheet 
                                trigger={
                                    <Button className="" onClick={() => setIsSheetOpen(true)}>
                                        <Plus/>
                                        New employee
                                    </Button>
                                }
                                mode="create"
                                open={isSheetOpen}
                                onOpenChange={setIsSheetOpen}
                            />
                        </Can>
                    </ToolbarActions>
                </Toolbar>
                <Employees />
            </Container>
        </div>
    );
}
