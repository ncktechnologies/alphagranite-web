// components/RoleCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Station } from '@/config/types';

interface StationCardProps {
  role: Station;
  isSelected: boolean;
  onClick: (role: Station) => void;
  
}

export const StationCard = ({ role, isSelected, onClick }: StationCardProps) => {
 

  // Get initials from operator names
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(p => p.trim().length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get color for avatar based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-1 ring-[#8BAD2B] bg-[#F0FDF4]' : ''
      }`}
      onClick={() => onClick(role)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={` ${isSelected  ? 'text-lg font-normal ' : 'font-bold text-[16px]'} text-black   `}>{role.workstationName}</h3>
            <div className="flex items-center gap-2">
              <Badge 
              //   variant={role.status === 'Active' ? 'default' : 'secondary'}
                className={`${role.status === 'Active'  ? 'bg-[#0BC33F33] text-[#0BC33F]' : 'bg-[#ED143B33] text-[#ED143B]'} px-2 py-1 rounded-[50px] text-sm `}
              >
                {role.status}
              </Badge>
              
            </div>
          </div>
          
          <p className="text-sm text-text">{role.description}</p>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">Assignees</span>
            <div className="flex -space-x-2">
              {role.operators && role.operators.length > 0 ? (
                role.operators.map((operator: string, index: number) => (
                  <Avatar key={index} className="w-6 h-6 border-2 border-white">
                    <AvatarFallback className={`text-xs font-medium text-white ${getAvatarColor(operator)}`}>
                      {getInitials(operator)}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No assignees</span>
              )}
            </div>
            {role.members !== undefined && (
              <span className="text-xs text-muted-foreground">({role.members})</span>
            )}
          </div>
        </div>
      </CardContent>
      
    </Card>
  );
};
