import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActivityCardProps {
  id: number;
  plan_name: string;
  plan_description?: string;
  status_id?: number;
  isSelected: boolean;
  onClick: (id: number) => void;
}

export const ActivityCard = ({ 
  id,
  plan_name, 
  plan_description, 
  status_id, 
  isSelected, 
  onClick
}: ActivityCardProps) => {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-1 ring-[#8BAD2B] bg-[#F0FDF4]' : ''
      }`}
      onClick={() => onClick(id)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`${isSelected ? 'text-lg font-normal' : 'font-bold text-[16px]'} text-black`}>
              {plan_name}
            </h3>
            <Badge 
              className={`${status_id === 1 ? 'bg-[#0BC33F33] text-[#0BC33F]' : 'bg-[#ED143B33] text-[#ED143B]'} px-2 py-1 rounded-[50px] text-sm`}
            >
              {status_id === 1 ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          <p className="text-sm text-text">{plan_description || 'No description'}</p>
        </div>
      </CardContent>
    </Card>
  );
};
