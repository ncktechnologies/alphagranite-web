// components/modals/UpdateRedoModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateRedoMutation } from '@/store/api/report';
import { toast } from 'sonner';

interface UpdateRedoModalProps {
  open: boolean;
  onClose: () => void;
  fabId: number;
  initialData?: {
    no_of_pieces?: number;
    sqft?: number;
    cost_per_sqft?: number;
    total_cost?: number;
    department?: string;
    person_name?: string;
    reason?: string;
    department_options?: string[] | string; // allow string for safety
  };
  onUpdateSuccess?: () => void;
}

export const UpdateRedoModal: React.FC<UpdateRedoModalProps> = ({
  open,
  onClose,
  fabId,
  initialData,
  onUpdateSuccess,
}) => {
  const [noOfPieces, setNoOfPieces] = useState<string>('');
  const [sqft, setSqft] = useState<string>('');
  const [costPerSqft, setCostPerSqft] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [updateRedo] = useUpdateRedoMutation();

  const computedTotalCost = useMemo(() => {
    const sqftNum = parseFloat(sqft);
    const costNum = parseFloat(costPerSqft);
    if (!isNaN(sqftNum) && !isNaN(costNum) && sqftNum > 0 && costNum > 0) {
      return (costNum * sqftNum * 2.1).toFixed(2);
    }
    return '';
  }, [sqft, costPerSqft]);

  useEffect(() => {
    if (open && initialData) {
      setNoOfPieces(initialData.no_of_pieces?.toString() ?? '');
      setSqft(initialData.sqft?.toString() ?? '');
      setCostPerSqft(initialData.cost_per_sqft?.toString() ?? '');
      setDepartment(initialData.department ?? '');
      setPersonName(initialData.person_name ?? '');
      setReason(initialData.reason ?? '');
    }
  }, [open, initialData]);

  // Safely parse department_options to array
  const departmentOptions = useMemo(() => {
    const opts = initialData?.department_options;
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return [];
  }, [initialData?.department_options]);

  console.log('departmentOptions array:', departmentOptions); // debug

  const handleSubmit = async () => {
    if (!fabId) {
      toast.error('Invalid FAB ID');
      return;
    }

    const payload: any = {};
    if (noOfPieces !== '') payload.no_of_pieces = parseFloat(noOfPieces);
    if (sqft !== '') payload.sqft = parseFloat(sqft);
    if (costPerSqft !== '') payload.cost_per_sqft = parseFloat(costPerSqft);
    if (computedTotalCost !== '') payload.total_cost = parseFloat(computedTotalCost);
    if (department) payload.department = department;
    if (personName) payload.person_name = personName;
    if (reason) payload.reason = reason;

    if (Object.keys(payload).length === 0) {
      toast.error('Please enter at least one field to update');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRedo({ fab_id: fabId, data: payload }).unwrap();
      toast.success(`Redo record for FAB ${fabId} updated successfully`);
      onUpdateSuccess?.();
      onClose();
    } catch (error) {
      console.error('Update redo failed:', error);
      toast.error('Failed to update redo record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Redo – FAB #{fabId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="noOfPieces">No. of Pieces</Label>
              <Input
                id="noOfPieces"
                type="number"
                min="0"
                step="1"
                value={noOfPieces}
                onChange={(e) => setNoOfPieces(e.target.value)}
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <Label htmlFor="sqft">SQFT</Label>
              <Input
                id="sqft"
                type="number"
                min="0"
                step="0.01"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="Square feet"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPerSqft">Cost per SQFT</Label>
              <Input
                id="costPerSqft"
                type="number"
                min="0"
                step="0.01"
                value={costPerSqft}
                onChange={(e) => setCostPerSqft(e.target.value)}
                placeholder="Cost per sq ft"
              />
            </div>
            <div>
              <Label htmlFor="totalCost">Total Cost (calculated)</Label>
              <Input
                id="totalCost"
                type="text"
                value={computedTotalCost ? `$${computedTotalCost}` : '—'}
                disabled
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              {departmentOptions.length > 0 ? (
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department name"
                />
              )}
            </div>
            <div>
              <Label htmlFor="personName">Person Name</Label>
              <Input
                id="personName"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Assigned person"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for redo"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Redo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};