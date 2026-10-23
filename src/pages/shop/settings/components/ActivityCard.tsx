// Compact shop activity row for the Shop Settings list.
import { MasterListItem } from '@/components/common/master-detail';

interface ActivityCardProps {
  id: number;
  plan_name: string;
  plan_description?: string;
  is_active: boolean;
  workstationCount: number;
  isSelected: boolean;
  onClick: (id: number) => void;
}

export const ActivityCard = ({
  id,
  plan_name,
  plan_description,
  is_active,
  workstationCount,
  isSelected,
  onClick
}: ActivityCardProps) => (
  <MasterListItem
    title={plan_name}
    active={is_active}
    isSelected={isSelected}
    onClick={() => onClick(id)}
    subtitle={plan_description || 'No description'}
    aside={
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {workstationCount === 0 ? 'No workstations' : `${workstationCount} workstation${workstationCount === 1 ? '' : 's'}`}
      </span>
    }
  />
);
