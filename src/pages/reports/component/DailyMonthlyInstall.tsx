// components/modals/UpdateDailyInstallModal.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateDailyInstallCompletionMutation } from '@/store/api/report';
import { toast } from 'sonner';

interface UpdateDailyInstallModalProps {
  open: boolean;
  onClose: () => void;
  fabId: number;
  initialData?: {
    revenue?: number;
    sq_ft?: number;
    installer_name?: string;
  };
  onUpdateSuccess?: () => void;
}

export const UpdateDailyInstallModal: React.FC<UpdateDailyInstallModalProps> = ({
  open,
  onClose,
  fabId,
  initialData,
  onUpdateSuccess,
}) => {
  const [revenue, setRevenue] = useState<string>('');
  const [sqFt, setSqFt] = useState<string>('');
  const [installerName, setInstallerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateDailyInstall] = useUpdateDailyInstallCompletionMutation();

  useEffect(() => {
    if (open && initialData) {
      setRevenue(initialData.revenue?.toString() ?? '');
      setSqFt(initialData.sq_ft?.toString() ?? '');
      setInstallerName(initialData.installer_name ?? '');
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (!fabId) {
      toast.error('Invalid FAB ID');
      return;
    }

    const payload: any = {};
    if (revenue !== '') payload.revenue = parseFloat(revenue);
    if (sqFt !== '') payload.sq_ft = parseFloat(sqFt);
    if (installerName) payload.installer_name = installerName;

    if (Object.keys(payload).length === 0) {
      toast.error('Please enter at least one field to update');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDailyInstall({ fab_id: fabId, data: payload }).unwrap();
      toast.success(`Daily install record for FAB ${fabId} updated successfully`);
      onUpdateSuccess?.();
      onClose();
    } catch (error) {
      console.error('Update daily install failed:', error);
      toast.error('Failed to update daily install record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Daily Install Completion – FAB #{fabId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="revenue">Revenue</Label>
              <Input
                id="revenue"
                type="number"
                min="0"
                step="0.01"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="Revenue amount"
              />
            </div>
            <div>
              <Label htmlFor="sqFt">SQ FT</Label>
              <Input
                id="sqFt"
                type="number"
                min="0"
                step="0.01"
                value={sqFt}
                onChange={(e) => setSqFt(e.target.value)}
                placeholder="Square feet"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="installerName">Installer Name</Label>
            <Input
              id="installerName"
              value={installerName}
              onChange={(e) => setInstallerName(e.target.value)}
              placeholder="Installer name"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Daily Install'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};