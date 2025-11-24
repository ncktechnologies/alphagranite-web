import { useMemo } from 'react';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetDepartmentsQuery } from '@/store/api/department';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface DrafterSelectorProps {
  value?: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
}

export const DrafterSelector = ({ value, onValueChange, placeholder = "Select drafter" }: DrafterSelectorProps) => {
  // Fetch all employees
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery({});
  
  // Fetch departments to identify drafting department
  const { data: departmentsData, isLoading: departmentsLoading } = useGetDepartmentsQuery();

  // Find the drafting department (look for departments with "draft" in the name)
  const draftingDepartment = useMemo(() => {
    if (!departmentsData?.items) return null;
    return departmentsData.items.find(
      dept => dept.name.toLowerCase().includes('draft') || dept.name.toLowerCase().includes('pre')
    );
  }, [departmentsData]);

  // Filter employees who belong to the drafting department
  const drafters = useMemo(() => {
    if (!employeesData?.data || !draftingDepartment) return [];
    
    return employeesData.data.filter(
      employee => employee.department_id === draftingDepartment.id
    ).map(employee => ({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department_name || ''
    }));
  }, [employeesData, draftingDepartment]);

  if (employeesLoading || departmentsLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select 
      value={value?.toString() || ''} 
      onValueChange={(val) => onValueChange(parseInt(val))}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {drafters.map((drafter) => (
          <SelectItem key={drafter.id} value={drafter.id.toString()}>
            {drafter.name}
          </SelectItem>
        ))}
        {drafters.length === 0 && (
          <SelectItem value="" disabled>
            No drafters available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};