// components/RoleHeader.tsx
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Station } from '@/config/types';
import { Toolbar, ToolbarHeading } from './toolbar';
import { useToggleWorkstationStatusMutation } from '@/store/api/workstation';

interface StationHeaderProps {
  role: Station;
  onEdit: (role: Station) => void;
  onStatusChange?: () => void;
}

export const StationHeader = ({ role, onEdit, onStatusChange }: StationHeaderProps) => {
  const [toggleWorkstationStatus] = useToggleWorkstationStatusMutation();

  const handleSwitchToggle = async (newIsActive: boolean) => {
    const action = newIsActive ? 'activate' : 'deactivate';
    const id = typeof role.id === 'string' ? parseInt(role.id, 10) : role.id;

    if (isNaN(id)) {
      toast.error('Invalid workstation ID');
      return;
    }

    try {
      // Adjust payload according to your API
      await toggleWorkstationStatus({id, data: {is_active: newIsActive }}).unwrap();
      toast.success(`Workstation ${action}d successfully`);
      onStatusChange?.(); // refresh list
    } catch (error) {
      console.error('Failed to toggle workstation status:', error);
      toast.error(`Failed to ${action} workstation`);
    }
  };

  const statusText = role.status === 'Active' ? 'Active' : 'Inactive';
  const statusColor = role.status === 'Active'
    ? 'bg-[#0BC33F33] text-[#0BC33F]'
    : 'bg-[#ED143B33] text-[#ED143B]';

  return (
    <Toolbar>
      <div className="flex items-center justify-between w-full">
        <ToolbarHeading title={role.workstationName} description={role.description} />

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 items-center">
            <Switch
              checked={role.status === 'Active'}
              onCheckedChange={handleSwitchToggle}
              aria-label="Toggle status"
            />
            <Button variant="outline" size="sm" onClick={() => onEdit(role)} className='text-secondary'>
              <PenLine className="w-4 h-4 mr-1" />
              Edit
            </Button>
            
            <Badge className={`${statusColor} px-3 py-1 rounded-[50px]`}>
              {statusText}
            </Badge>
          </div>
        </div>
      </div>
    </Toolbar>
  );
};