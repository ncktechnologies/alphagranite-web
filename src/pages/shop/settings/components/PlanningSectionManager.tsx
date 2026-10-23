import { useState } from 'react';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useCreatePlanningSectionMutation,
} from '@/store/api/workstation';
import { MasterListPane, type StatusFilter } from '@/components/common/master-detail';

export interface PlanningSection {
  id: number;
  plan_name: string;
  plan_description?: string;
  status_id?: number;
  is_active?: boolean | number;
}

interface PlanningSectionManagerProps {
  planningSections: PlanningSection[];
  onRefresh: () => void;
  selectedActivityId?: number | null;
  onSelectActivity?: (id: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  workstationCounts: Record<number, number>;
}

export function PlanningSectionManager({
  planningSections,
  onRefresh,
  selectedActivityId,
  onSelectActivity,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
  workstationCounts,
}: PlanningSectionManagerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');

  const [createPlanningSection] = useCreatePlanningSectionMutation();

  const handleCreate = async () => {
    if (!newSectionName.trim()) {
      toast.error('Activity name is required');
      return;
    }

    try {
      await createPlanningSection({
        plan_name: newSectionName.trim(),
        plan_description: newSectionDescription.trim() || undefined,
        status_id: 1,
      }).unwrap();

      toast.success('Shop activity created successfully');
      setNewSectionName('');
      setNewSectionDescription('');
      setIsCreateModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to create planning section:', error);
      toast.error('Failed to create shop activity');
    }
  };

  return (
    <>
      <MasterListPane
        title="Shop Activities"
        noun="shop activities"
        onNew={() => setIsCreateModalOpen(true)}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search name, description"
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        counts={counts}
        isEmpty={planningSections.length === 0}
      >
        {planningSections.map((section) => (
          <ActivityCard
            key={section.id}
            id={section.id}
            plan_name={section.plan_name}
            plan_description={section.plan_description}
            is_active={section.is_active === true || section.is_active === 1}
            workstationCount={workstationCounts[section.id] ?? 0}
            isSelected={selectedActivityId === section.id}
            onClick={(id) => onSelectActivity && onSelectActivity(id)}
          />
        ))}
      </MasterListPane>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Shop Activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan_name">Activity Name *</Label>
              <Input
                id="plan_name"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g., Cutting, Polishing, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan_description">Description (Optional)</Label>
              <Textarea
                id="plan_description"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
                placeholder="Brief description of this activity..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Create Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
