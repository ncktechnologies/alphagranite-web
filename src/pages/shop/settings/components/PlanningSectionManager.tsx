import React, { useState } from 'react';
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
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreatePlanningSectionMutation,
} from '@/store/api/workstation';

interface PlanningSection {
  id: number;
  plan_name: string;
  plan_description?: string;
  status_id?: number;
  is_active?: boolean;
}

interface PlanningSectionManagerProps {
  planningSections: PlanningSection[];
  onRefresh: () => void;
  selectedActivityId?: number | null;
  onSelectActivity?: (id: number) => void;
}

export function PlanningSectionManager({ 
  planningSections, 
  onRefresh,
  selectedActivityId,
  onSelectActivity
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Shop Activities</h3>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#8BAD2B] hover:bg-[#7a9b25] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
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
              <Button onClick={handleCreate} className="bg-[#8BAD2B] hover:bg-[#7a9b25]">
                Create Activity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activity Cards List */}
      <div className="grid gap-3">
        {planningSections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No shop activities yet. Click "Add Activity" to create one.
          </div>
        ) : (
          planningSections.map((section) => (
            <ActivityCard
              key={section.id}
              id={section.id}
              plan_name={section.plan_name}
              plan_description={section.plan_description}
              status_id={section.status_id}
              is_active={section.is_active}
              isSelected={selectedActivityId === section.id}
              onClick={(id) => onSelectActivity && onSelectActivity(id)}
            />
          ))
        )}
      </div>

      {/* Selected Activity Details View - Removed, handled by parent */}
    </div>
  );
}
