// components/EditStoneCostModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateFabCostOfStoneMutation } from '@/store/api/job';  // reuse the updateFab mutation
import { toast } from 'sonner';

interface EditStoneCostModalProps {
  open: boolean;
  onClose: () => void;
  fab: {
    fab_id: string;
    cost_of_stone: number;
    job_no?: string;
    job_name?: string;
  };
  onSuccess?: () => void;
}

export const EditStoneCostModal: React.FC<EditStoneCostModalProps> = ({
  open,
  onClose,
  fab,
  onSuccess,
}) => {
  const [costOfStone, setCostOfStone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateFabCostOfStone] = useUpdateFabCostOfStoneMutation();

  useEffect(() => {
    if (open && fab) {
      setCostOfStone(fab.cost_of_stone?.toString() ?? '0');
    }
  }, [open, fab]);

  const handleSubmit = async () => {
    const costValue = parseFloat(costOfStone);
    if (isNaN(costValue)) {
      toast.error('Please enter a valid number for stone cost');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFabCostOfStone({
        id: Number(fab.fab_id),
        data: { cost_of_stone: costValue },
      }).unwrap();
      toast.success(`Stone cost updated for FAB ${fab.fab_id}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating stone cost:', error);
      toast.error('Failed to update stone cost');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Stone Cost</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* <div className="text-sm text-muted-foreground">
            <div>FAB ID: {fab?.fab_id}</div>
            {fab.job_no && <div>Job No: {fab?.job_no}</div>}
            {fab.job_name && <div>Job Name: {fab?.job_name}</div>}
          </div> */}

          <div>
            <Label htmlFor="stoneCost">Cost of Stone ($)</Label>
            <Input
              id="stoneCost"
              type="number"
              step="0.01"
              min="0"
              value={costOfStone}
              onChange={(e) => setCostOfStone(e.target.value)}
              placeholder="Enter stone cost"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};