import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PenLine } from 'lucide-react';
import { DetailField, DetailStickyHeader, StatusIndicator } from '@/components/common/master-detail';
import type { PlanningSection } from './PlanningSectionManager';

interface ActivityDetailsViewProps {
  activity: PlanningSection;
  workstations: { id: string; workstationName: string; status?: string }[];
  onEdit: () => void;
  onToggleStatus: () => void;
}

export function ActivityDetailsView({ activity, workstations, onEdit, onToggleStatus }: ActivityDetailsViewProps) {
  const active = activity.is_active === true || activity.is_active === 1;

  return (
    <div className="space-y-6">
      <DetailStickyHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{activity.plan_name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Shop activity</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={active} onCheckedChange={onToggleStatus} aria-label="Toggle shop activity active" />
              <span className={active ? 'text-green-700' : 'text-muted-foreground'}>{active ? 'Active' : 'Inactive'}</span>
            </label>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <PenLine className="size-4" />
              Edit
            </Button>
          </div>
        </div>
      </DetailStickyHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailField label="Activity name" value={activity.plan_name} />
        <DetailField label="Status" value={active ? 'Active' : 'Inactive'} />
        <DetailField
          label="Description"
          value={activity.plan_description || <span className="font-normal text-muted-foreground">No description</span>}
          className="sm:col-span-2"
        />
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workstations</p>
          <span className="text-xs text-muted-foreground">{workstations.length}</span>
        </div>
        {workstations.length > 0 ? (
          <div className="mt-3 space-y-1">
            {workstations.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                <span className="truncate text-sm font-medium text-foreground">{ws.workstationName}</span>
                <StatusIndicator active={ws.status === 'Active'} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No workstations use this activity. Assign one from the Workstations tab.</p>
        )}
      </div>
    </div>
  );
}
