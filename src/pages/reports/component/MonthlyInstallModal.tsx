// components/modals/UpdateMonthlyInstallModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateMonthlyInstallCompletionMutation } from '@/store/api/report';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { toast } from 'sonner';

interface UpdateMonthlyInstallModalProps {
  open: boolean;
  onClose: () => void;
  fabId: number;
  initialData?: {
    revenue?: number;
    sq_ft?: number;
    revenue_per_sq_ft?: number;
    installer_name?: string;
    installer_id?: number;   // optional: if the row already contains the ID
  };
  onUpdateSuccess?: () => void;
}

export const UpdateMonthlyInstallModal: React.FC<UpdateMonthlyInstallModalProps> = ({
  open,
  onClose,
  fabId,
  initialData,
  onUpdateSuccess,
}) => {
  const [revenue, setRevenue] = useState<string>('');
  const [sqFt, setSqFt] = useState<string>('');
  const [revenuePerSqFt, setRevenuePerSqFt] = useState<string>('');
  const [selectedInstallerId, setSelectedInstallerId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateMonthlyInstall] = useUpdateMonthlyInstallCompletionMutation();
  const { data: salesPersonsData, isLoading: isLoadingSalesPersons } = useGetSalesPersonsQuery();

  // Build installer options (employees with id and name)
  const installerOptions = useMemo(() => {
    if (!salesPersonsData) return [];
    let rawData: any[] = [];
    if (Array.isArray(salesPersonsData)) rawData = salesPersonsData;
    else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) rawData = (salesPersonsData as any).data || [];
    return rawData.map((emp: any) => ({
      id: emp.id,
      name: emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || String(emp),
    }));
  }, [salesPersonsData]);

  // Set initial values when modal opens
  useEffect(() => {
    if (open && initialData) {
      setRevenue(initialData.revenue?.toString() ?? '');
      setSqFt(initialData.sq_ft?.toString() ?? '');
      setRevenuePerSqFt(initialData.revenue_per_sq_ft?.toString() ?? '');
      
      // Pre-select installer by ID if available, otherwise try to match by name
      if (initialData.installer_id) {
        setSelectedInstallerId(initialData.installer_id);
      } else if (initialData.installer_name && installerOptions.length > 0) {
        const matched = installerOptions.find(opt => opt.name === initialData.installer_name);
        setSelectedInstallerId(matched?.id ?? null);
      } else {
        setSelectedInstallerId(null);
      }
    }
  }, [open, initialData, installerOptions]);

  const handleSubmit = async () => {
    if (!fabId) {
      toast.error('Invalid FAB ID');
      return;
    }

    const payload: any = {};
    if (revenue !== '') payload.revenue = parseFloat(revenue);
    if (sqFt !== '') payload.sq_ft = parseFloat(sqFt);
    if (revenuePerSqFt !== '') payload.revenue_per_sq_ft = parseFloat(revenuePerSqFt);
    if (selectedInstallerId) payload.installer_id = selectedInstallerId; // Send ID to backend

    if (Object.keys(payload).length === 0) {
      toast.error('Please enter at least one field to update');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateMonthlyInstall({ fab_id: fabId, data: payload }).unwrap();
      toast.success(`Monthly install record for FAB ${fabId} updated successfully`);
      onUpdateSuccess?.();
      onClose();
    } catch (error) {
      console.error('Update monthly install failed:', error);
      toast.error('Failed to update monthly install record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Monthly Install Completion – FAB #{fabId}</DialogTitle>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="revenuePerSqFt">Revenue per SQ FT</Label>
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
            <div>
              <Label htmlFor="installer">Installer</Label>
              <Select
                value={selectedInstallerId ? String(selectedInstallerId) : ''}
                onValueChange={(value) => setSelectedInstallerId(value ? Number(value) : null)}
                disabled={isLoadingSalesPersons}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSalesPersons ? "Loading installers..." : "Select installer"} />
                </SelectTrigger>
                <SelectContent>
                  {installerOptions.map(opt => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Monthly Install'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};