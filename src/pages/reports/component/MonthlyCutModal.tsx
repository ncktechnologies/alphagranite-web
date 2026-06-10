// components/modals/UpdateMonthlyCutModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateMonthlyCutCompletionMutation } from '@/store/api/report';
import { toast } from 'sonner';

interface UpdateMonthlyCutModalProps {
  open: boolean;
  onClose: () => void;
  cutId: number; // changed from fabId
  initialData?: {
    revenue?: number;
    cost_of_stone?: number;
    revenue_per_sq_ft?: number;
  };
  onUpdateSuccess?: () => void;
}

export const UpdateMonthlyCutModal: React.FC<UpdateMonthlyCutModalProps> = ({
  open,
  onClose,
  cutId,
  initialData,
  onUpdateSuccess,
}) => {
  const [revenue, setRevenue] = useState<string>('');
  const [costOfStone, setCostOfStone] = useState<string>('');
  const [revenuePerSqFt, setRevenuePerSqFt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateMonthlyCut] = useUpdateMonthlyCutCompletionMutation();

  useEffect(() => {
    if (open && initialData) {
      setRevenue(initialData.revenue?.toString() ?? '');
      setCostOfStone(initialData.cost_of_stone?.toString() ?? '');
      setRevenuePerSqFt(initialData.revenue_per_sq_ft?.toString() ?? '');
    } else {
      setRevenue('');
      setCostOfStone('');
      setRevenuePerSqFt('');
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!cutId) {
      toast.error('Invalid cut ID');
      return;
    }
    if (revenue === '' || costOfStone === '' || revenuePerSqFt === '') {
      toast.error('Please fill in all fields (enter 0 if not applicable)');
      return;
    }

    const payload = {
      revenue: parseFloat(revenue),
      cost_of_stone: parseFloat(costOfStone),
      revenue_per_sq_ft: parseFloat(revenuePerSqFt),
    };

    setIsSubmitting(true);
    try {
      await updateMonthlyCut({ cut_id: cutId, data: payload }).unwrap();
      toast.success(`Monthly cut record updated successfully`);
      onUpdateSuccess?.();
      onClose();
    } catch (error) {
      console.error('Update monthly cut failed:', error);
      toast.error('Failed to update monthly cut record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Monthly Cut – ID #{cutId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="revenue">Revenue *</Label>
              <Input
                id="revenue"
                type="number"
                min="0"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="Revenue"
              />
            </div>
            <div>
              <Label htmlFor="costOfStone">Cost of Stone *</Label>
              <Input
                id="costOfStone"
                type="number"
                min="0"
                step="0.01"
                value={costOfStone}
                onChange={(e) => setCostOfStone(e.target.value)}
                placeholder="Cost of stone"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="revenuePerSqFt">Revenue per SQ FT *</Label>
            <Input
              id="revenuePerSqFt"
              type="number"
              min="0"
              step="0.01"
              value={revenuePerSqFt}
              onChange={(e) => setRevenuePerSqFt(e.target.value)}
              placeholder="Revenue per sq ft"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Monthly Cut'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};