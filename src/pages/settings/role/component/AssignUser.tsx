'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetEmployeesQuery } from '@/store/api/employee';

interface UserAssignmentProps {
  selectedUsers: string[];
  onUserToggle: (userId: string) => void;
}

export const UserAssignment = ({ selectedUsers, onUserToggle }: UserAssignmentProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string | undefined>(undefined);
  
  // Fetch employees from API
  const { data: employeesData, isLoading } = useGetEmployeesQuery();
  const employees = employeesData?.data || [];

  const filteredUsers = employees.filter((employee) => {
    const fullName = `${employee.first_name} ${employee.last_name}`;
    return fullName.toLowerCase().includes(searchInput.toLowerCase()) ||
           employee.email.toLowerCase().includes(searchInput.toLowerCase());
  });

  const handleAddUser = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      onUserToggle(userId);
    }
    setSelectedToAdd(undefined);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-normal text-text text-lg">Assign Users</h3>

      <Card>
        <CardContent className="space-y-4 pt-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users..."
              className="ps-10 text-base shadow-none ring-0 focus-visible:ring-0 "
            />
          </div>

          {/* Selected Users Display */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2  rounded-lg  bg-background px-3 py-2',
              selectedUsers.length === 0 && 'text-muted-foreground',
            )}
          >
            {selectedUsers.length === 0 ? (
              <span className="text-sm text-muted-foreground">No users assigned</span>
            ) : (
              selectedUsers.map((userId) => {
                const employee = employees.find((emp) => emp.id === Number(userId));
                if (!employee) return null;

                const fullName = `${employee.first_name} ${employee.last_name}`;
                const initials = `${employee.first_name[0]}${employee.last_name[0]}`;

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    <Avatar className="size-6">
                      {employee.profile_image_id && (
                        <AvatarImage src={employee.profile_image_url} alt={fullName} />
                      )}
                      <AvatarFallback>
                        {initials.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{fullName}</span>
                    <button
                      onClick={() => onUserToggle(String(employee.id))}
                      className="text-muted-foreground hover:text-destructive transition"
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
              <SelectValue placeholder={isLoading ? "Loading employees..." : "Select users to add..."} />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((employee) => {
                const fullName = `${employee.first_name} ${employee.last_name}`;
                return (
                  <SelectItem key={employee.id} value={String(employee.id)}>
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
