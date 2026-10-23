// components/RoleHeader.tsx
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Station } from '@/config/types';
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
      // toast.error(`Failed to ${action} workstation`);
    }
  };

  const active = role.status === 'Active';

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-semibold text-foreground">{role.workstationName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={active} onCheckedChange={handleSwitchToggle} aria-label="Toggle workstation active" />
          <span className={active ? 'text-green-700' : 'text-muted-foreground'}>{active ? 'Active' : 'Inactive'}</span>
        </label>
        <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
          <PenLine className="size-4" />
          Edit
        </Button>
      </div>
    </div>
  );
};