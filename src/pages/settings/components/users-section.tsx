import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Search, Filter } from 'lucide-react';

interface User {
  id: string;
  name: string;
  dateInvited: Date;
  status: 'Active' | 'Pending' | 'Inactive';
}

const UsersSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined
  });
  const [genderFilter, setGenderFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const users: User[] = [
    { id: '1', name: 'Cameron Williamson', dateInvited: new Date('2024-01-15'), status: 'Active' },
    { id: '2', name: 'Cameron Williamson', dateInvited: new Date('2024-01-16'), status: 'Active' },
    { id: '3', name: 'Cameron Williamson', dateInvited: new Date('2024-01-17'), status: 'Active' },
    { id: '4', name: 'Cameron Williamson', dateInvited: new Date('2024-01-18'), status: 'Active' },
    { id: '5', name: 'Cameron Williamson', dateInvited: new Date('2024-01-19'), status: 'Active' },
    { id: '6', name: 'Cameron Williamson', dateInvited: new Date('2024-01-20'), status: 'Active' },
    { id: '7', name: 'Cameron Williamson', dateInvited: new Date('2024-01-21'), status: 'Active' },
    { id: '8', name: 'Cameron Williamson', dateInvited: new Date('2024-01-22'), status: 'Active' },
    { id: '9', name: 'Cameron Williamson', dateInvited: new Date('2024-01-23'), status: 'Active' },
    { id: '10', name: 'Cameron Williamson', dateInvited: new Date('2024-01-24'), status: 'Active' },
  ];

  const totalUsers = 52;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Users</h2>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {dateRange.from ? format(dateRange.from, 'MMM dd') : 'Start date'} - 
              {dateRange.to ? format(dateRange.to, 'MMM dd') : 'End date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange({from: range?.from, to: range?.to})}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Gender
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <Button 
                variant={genderFilter === 'All' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setGenderFilter('All')}
                className="w-full justify-start"
              >
                All
              </Button>
              <Button 
                variant={genderFilter === 'Male' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setGenderFilter('Male')}
                className="w-full justify-start"
              >
                Male
              </Button>
              <Button 
                variant={genderFilter === 'Female' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setGenderFilter('Female')}
                className="w-full justify-start"
              >
                Female
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Button className="bg-green-600 hover:bg-green-700">
          Assign role
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EMPLOYEE NAME
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DATE INVITED
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="w-8 h-8 mr-3">
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(user.dateInvited, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={user.status === 'Active' ? 'default' : 'secondary'}
                        className={user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                      >
                        {user.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600">per page</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers}
          </span>
          
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { UsersSection };