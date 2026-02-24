'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAssignmentProps {
  selectedUsers: string[];
  onUserToggle: (userId: string) => void;
}

export const UserAssignment = ({ selectedUsers, onUserToggle }: UserAssignmentProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string | undefined>(undefined);

  // Fetch real employees from API
  const { data: employeesData, isLoading: isEmployeesLoading } = useGetEmployeesQuery();
  const employees = (employeesData && (employeesData as any).data) ? (employeesData as any).data : (Array.isArray(employeesData) ? employeesData : []);

  const filteredUsers = employees.filter((emp: any) => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    return name.toLowerCase().includes(searchInput.toLowerCase()) || (emp.email || '').toLowerCase().includes(searchInput.toLowerCase());
  });

  const handleAddUser = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      onUserToggle(userId);
    }
    setSelectedToAdd(undefined);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-text text-base leading-6">Assign Operator</h3>
      <Card>
        <CardContent className="space-y-4 pt-4">
          {/* Search input */}
          {/* <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users..."
              className="ps-10 text-base shadow-none ring-0 focus-visible:ring-0 "
            />
          </div> */}

          {/* Selected Users Display */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2  rounded-lg  bg-background px-3 py-2',
              selectedUsers.length === 0 && 'text-text',
            )}
          >
            {selectedUsers.length === 0 ? (
              <span className="text-sm text-text-foreground">No users assigned</span>
            ) : (
              selectedUsers.map((userId) => {
                const employee = employees.find((e: any) => String(e.id) === String(userId));
                if (!employee) return null;
                const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.name || employee.username || employee.email;

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-text"
                  >
                    <Avatar className="size-6">
                      {employee.profile_image_url ? (
                        <AvatarImage src={employee.profile_image_url} alt={fullName} />
                      ) : (
                        <AvatarFallback>
                          {fullName
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span>{fullName}</span>
                    <button
                      onClick={() => onUserToggle(String(employee.id))}
                      className="text-text hover:text-destructive transition"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Select to add new users */}
          <Select value={selectedToAdd} onValueChange={handleAddUser}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={isEmployeesLoading ? 'Loading employees...' : 'Select users to add...'} />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((emp: any) => {
                const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.username || emp.email;
                return (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {fullName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};
