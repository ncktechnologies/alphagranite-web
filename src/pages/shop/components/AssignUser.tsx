'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetRolesQuery } from '@/store/api/role';
import { useGetEmployeesQuery } from '@/store/api/employee';

interface UserAssignmentProps {
  selectedUsers: string[];
  onUserToggle: (userId: string) => void;
}

export const UserAssignment = ({ selectedUsers, onUserToggle }: UserAssignmentProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string | undefined>(undefined);

  // 1. Fetch roles to get the "Operator" role ID
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();

  // Extract Operator role ID
  const operatorRoleId = useMemo(() => {
    if (!rolesData) return null;
    const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
    if (!Array.isArray(roles)) return null;
    const operatorRole = roles.find((role: any) => 
      (role.name || '').toLowerCase().trim() === 'operator'
    );
    return operatorRole?.id ?? null;
  }, [rolesData]);

  // 2. Fetch employees filtered by operatorRoleId, sorted by first_name ascending
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery(
    {
      role_id: operatorRoleId ?? undefined,
      sort_by: 'first_name',
      sort_order: 'asc',
      limit: 500, // or whatever limit you need
    },
    {
      skip: !operatorRoleId, // don't fetch until we have the role ID
    }
  );

  const operators = useMemo(() => {
    if (!employeesData) return [];
    const employees = employeesData?.data ?? employeesData;
    if (!Array.isArray(employees)) return [];
    // Already sorted by API; but we can also sort again for safety
    return employees;
  }, [employeesData]);

  // Filter operators based on search input (client-side)
  const filteredUsers = operators.filter((employee) => {
    const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`;
    return fullName.toLowerCase().includes(searchInput.toLowerCase()) ||
           (employee.email || '').toLowerCase().includes(searchInput.toLowerCase());
  });

  const isLoading = rolesLoading || employeesLoading;

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
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search operators..."
              className="ps-10 text-base shadow-none ring-0 focus-visible:ring-0 "
            />
          </div>

          <div
            className={cn(
              'flex flex-wrap items-center gap-2 rounded-lg bg-background px-3 py-2',
              selectedUsers.length === 0 && 'text-muted-foreground',
            )}
          >
            {selectedUsers.length === 0 ? (
              <span className="text-sm text-muted-foreground">No users assigned</span>
            ) : (
              selectedUsers.map((userId) => {
                const employee = operators.find((emp) => emp.id === Number(userId));
                if (!employee) return null;

                const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`;
                const initials = `${(employee.first_name || '')[0]}${(employee.last_name || '')[0]}`;

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    <Avatar className="size-6">
                      {employee.profile_image_url && (
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

          <Select value={selectedToAdd} onValueChange={handleAddUser}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={isLoading ? "Loading operators..." : "Select operators to add..."} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">No operators found</div>
              ) : (
                filteredUsers.map((employee) => {
                  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`;
                  return (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {fullName}
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};