import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ActivityDetailsViewProps {
  activity: {
    id: number;
    plan_name: string;
    plan_description?: string;
    status_id?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function ActivityDetailsView({ activity, onEdit, onDelete, onToggleStatus }: ActivityDetailsViewProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{activity.plan_name}</h2>
              <p className="text-sm text-gray-500 mt-1">Shop Activity Details</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Badge 
                  className={`${activity.is_active ? 'bg-[#0BC33F33] text-[#0BC33F]' : 'bg-[#ED143B33] text-[#ED143B]'} px-3 py-1 rounded-[50px]`}
                >
                  {activity.is_active  ? 'Active' : 'Inactive'}
                </Badge>
                <Switch
                  checked={activity.is_active}
                  onCheckedChange={onToggleStatus}
                  aria-label="Toggle status"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={onEdit}
                  className="bg-[#8BAD2B] hover:bg-[#7a9b25] text-white"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                {/* <Button 
                  size="sm"
                  onClick={onDelete}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button> */}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Description</h3>
            <p className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg">
              {activity.plan_description || 'No description provided'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
