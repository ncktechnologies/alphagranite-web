// components/modals/UpdateRedoModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateRedoMutation } from '@/store/api/report';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface UpdateRedoModalProps {
  open: boolean;
  onClose: () => void;
  fabId: number;
  initialData?: {
    no_of_pieces?: number;
    sqft?: number;
    cost_per_sqft?: number;
    department?: string;
    person_name?: string;
    reason?: string;
    department_options?: string[] | string;
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

  // ✅ Only fetch employees when modal is open
  const { data: employeesData, isLoading: isEmployeesLoading } = useGetEmployeesQuery(
    // { limit: 1},
    // { skip: !open } 
  );


  // ─── Compute total cost ──────────────────────────────────────────────────
  const totalCost = useMemo(() => {
    const sqftNum = parseFloat(sqft) || 0;
    const costNum = parseFloat(costPerSqft) || 0;
    return sqftNum * costNum * 2.1;
  }, [sqft, costPerSqft]);

  // ─── Populate form from initialData ─────────────────────────────────────
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

  // ─── Department options ──────────────────────────────────────────────────
  const departmentOptions = useMemo(() => {
    const opts = initialData?.department_options;
    if (Array.isArray(opts)) return opts;
    if (typeof opts === 'string') return opts.split(',').map(s => s.trim());
    return [];
  }, [initialData?.department_options]);

  // ─── Employee options ──────────────────────────────────────────────────
  const employeeOptions = useMemo(() => {
    if (!employeesData?.data) return [];
    return employeesData.data.map((emp: any) => ({
      value: emp.id,
      label: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || `Employee ${emp.id}`,
    }));
  }, [employeesData]);

  // ─── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!fabId) {
      toast.error('Invalid FAB ID');
      return;
    }

    const payload: any = {};
    if (costPerSqft !== '') payload.cost_per_sqft = parseFloat(costPerSqft);
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
          <DialogTitle>Update Redo – FAB {fabId}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Person Name – dropdown of employees (fetched only when modal opens) */}
          <div>
            <Label htmlFor="personName">Person Name</Label>
            {isEmployeesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : employeeOptions.length > 0 ? (
              <Select value={personName} onValueChange={setPersonName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((emp) => (
                    <SelectItem key={emp.value} value={emp.label}>
                      {emp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="personName"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Type employee name"
              />
            )}
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