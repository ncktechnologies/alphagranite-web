'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { availableUsers } from '@/config/menu.config';
import { cn } from '@/lib/utils';

interface UserAssignmentProps {
  selectedUsers: string[];
  onUserToggle: (userId: string) => void;
}

export const UserAssignment = ({ selectedUsers, onUserToggle }: UserAssignmentProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<string | undefined>(undefined);

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchInput.toLowerCase()),
  );

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
                const user = availableUsers.find((u) => u.id === userId);
                if (!user) return null;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm text-text"
                  >
                    {/* <Avatar className="size-6">
                      <AvatarFallback>
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar> */}
                    <span>{user.name}</span>
                    <button
                      onClick={() => onUserToggle(user.id)}
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
              <SelectValue placeholder="Select users to add..." />
            </SelectTrigger>
            <SelectContent>
              {filteredUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
};
