import { Employee } from '@/store/api/employee';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EllipsisVertical } from 'lucide-react';
import { Can } from '@/components/permission';

interface EmployeeActionsProps {
    employee: Employee;
    onView: (employee: Employee) => void;
    onEdit: (employee: Employee) => void;
    onDelete: (employee: Employee) => void;
}

export const EmployeeActions = ({ employee, onView, onEdit, onDelete }: EmployeeActionsProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <EllipsisVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[157px]" side="bottom" align="end">
                <Can action="read" on="employees">
                    <DropdownMenuItem onClick={() => onView(employee)}>
                        <span>View</span>
                    </DropdownMenuItem>
                </Can>

                <Can action="update" on="employees">
                    <DropdownMenuItem onClick={() => onEdit(employee)}>
                        <span>Edit</span>
                    </DropdownMenuItem>
                </Can>

                <Can action="delete" on="employees">
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(employee)}
                    >
                        <span>Delete</span>
                    </DropdownMenuItem>
                </Can>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
