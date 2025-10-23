// components/RoleCard.tsx
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Station } from '@/config/types';

interface StationCardProps {
  role: Station;
  isSelected: boolean;
  onClick: (role: Station) => void;
}

export const StationCard = ({ role, isSelected, onClick }: StationCardProps) => {
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
            <h3 className={` ${isSelected  ? 'text-lg font-normal ' : 'font-bold text-[16px]'} text-black   `}>{role.name}</h3>
            {/* <Badge 
            //   variant={role.status === 'Active' ? 'default' : 'secondary'}
              className={`${role.status === 'Active'  ? 'bg-[#0BC33F33] text-[#0BC33F]' : 'bg-[#ED143B33] text-[#ED143B]'} px-2 py-1 rounded-[50px] text-sm `}
            >
              {role.status}
            </Badge> */}
          </div>
          
          <p className="text-sm text-text">{role.description}</p>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">Assignees</span>
            <div className="flex -space-x-2">
              {role.avatars.map((avatar, index) => (
                <Avatar key={index} className="w-6 h-6 border-2 border-white">
                  <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                    {avatar}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      
    </Card>
  );
};