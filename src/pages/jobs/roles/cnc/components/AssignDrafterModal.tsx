// AssignCNCOperatorModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetRolesQuery } from '@/store/api/role';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useCreateCNCDraftingMutation, useUpdateCNCDraftingMutation, useGetCNCByFabIdQuery } from '@/store/api/job';
import { toast } from 'sonner';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split('T')[0];

interface AssignDrafterModalProps {
  open: boolean;
  onClose: () => void;
  selectedFabIds?: string[];
  reassignFabId?: string | null;
  initialSqftValues?: { [key: string]: string };
  initialStartDates?: { [key: string]: string };
  initialEndDates?: { [key: string]: string };
  onAssignSuccess?: () => void;
}

export const AssignDrafterModal: React.FC<AssignDrafterModalProps> = ({
  open,
  onClose,
  selectedFabIds = [],
  reassignFabId,
  initialSqftValues = {},
  initialStartDates = {},
  initialEndDates = {},
  onAssignSuccess,
}) => {
  const [operatorId, setOperatorId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [sqftPerFab, setSqftPerFab] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);

  // 1. Fetch roles to get the "CAD" / "Drafter" role ID
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();

  // Find the role ID for "CAD" (or "Drafter")
  const drafterRoleId = useMemo(() => {
    if (!rolesData) return null;
    const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
    if (!Array.isArray(roles)) return null;
    const role = roles.find((r: any) => {
      const name = (r.name || '').toLowerCase().trim();
      return name === 'cad' || name === 'drafter';
    });
    return role?.id ?? null;
  }, [rolesData]);

  // 2. Fetch employees filtered by drafterRoleId
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery(
    {
      role_id: drafterRoleId ?? undefined,
      sort_by: 'first_name',
      sort_order: 'asc',
      limit: 500,
    },
    {
      skip: !drafterRoleId, // don't fetch until we have the role ID
    }
  );

  // Extract employees from response
  const drafters = useMemo(() => {
    if (!employeesData) return [];
    const employees = employeesData?.data ?? employeesData;
    if (!Array.isArray(employees)) return [];
    return employees;
  }, [employeesData]);

  const [createCNCDrafting] = useCreateCNCDraftingMutation();
  const [updateCNCDrafting] = useUpdateCNCDraftingMutation();

  const { data: cncData, isFetching: cncLoading } = useGetCNCByFabIdQuery(
    reassignFabId ? parseInt(reassignFabId, 10) : 0,
    { skip: !reassignFabId || !open }
  );

  const isReassign = !!reassignFabId;
  const fabIds = isReassign ? [reassignFabId] : selectedFabIds;
  const isLoading = rolesLoading || employeesLoading;

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setOperatorId('');
      setStartDate(getTodayDate());
      setEndDate(getTodayDate());
      setSqftPerFab({});
    }
  }, [open]);

  // Reset and reinitialize when modal opens with different data
  useEffect(() => {
    if (!open) return;
    initializedRef.current = false;
    setOperatorId('');
    setStartDate(getTodayDate());
    setEndDate(getTodayDate());
    setSqftPerFab({});
  }, [open, reassignFabId, selectedFabIds]);

  // Initialize form when data is ready (for reassign) or immediately (for bulk)
  useEffect(() => {
    if (!open) return;
    if (initializedRef.current) return;

    if (isReassign && cncData) {
      const cnc = cncData?.data || cncData;
      setOperatorId(String(cnc.drafter_id || ''));
      setStartDate(cnc.scheduled_start_date || getTodayDate());
      setEndDate(cnc.scheduled_end_date || getTodayDate());
      setSqftPerFab({
        [reassignFabId]: String(cnc.total_sqft_required_to_draft || ''),
      });
      initializedRef.current = true;
    } else if (!isReassign && fabIds.length > 0) {
      const initialSqft: { [key: string]: string } = {};
      fabIds.forEach((id) => {
        initialSqft[id] = initialSqftValues[id] || '';
      });
      setSqftPerFab(initialSqft);
      initializedRef.current = true;
    }
  }, [open, isReassign, cncData, reassignFabId, fabIds, initialSqftValues]);

  const handleSqftChange = (fabId: string, value: string) => {
    setSqftPerFab((prev) => ({ ...prev, [fabId]: value }));
  };

  const handleSubmit = async () => {
    if (!operatorId) {
      toast.error('Please select a CNC Programmer');
      return;
    }

    const missingSqft = fabIds.filter((id) => !sqftPerFab[id] || sqftPerFab[id] === '');
    if (missingSqft.length > 0) {
      toast.error(`Please enter square footage for FAB ID(s): ${missingSqft.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isReassign) {
        const cncId = cncData?.data?.id || cncData?.id;
        if (!cncId) throw new Error('CNC record not found');
        await updateCNCDrafting({
          id: cncId,
          data: {
            drafter_id: parseInt(operatorId, 10),
            scheduled_start_date: startDate,
            scheduled_end_date: endDate,
            total_sqft_required_to_draft: parseFloat(sqftPerFab[reassignFabId] || '0'),
          },
        }).unwrap();
        toast.success(`CNC Programmer reassigned for FAB ${reassignFabId}`);
      } else {
        const requestData = {
          drafter_id: parseInt(operatorId, 10),
          items: fabIds.map((fabId) => ({
            fab_id: parseInt(fabId, 10),
            scheduled_start_date: startDate,
            scheduled_end_date: endDate,
            total_sqft_required_to_draft: parseFloat(sqftPerFab[fabId] || '0'),
          })),
        };
        await createCNCDrafting(requestData).unwrap();
        toast.success(`Successfully assigned CNC Programmer to ${fabIds.length} FAB(s)`);
      }

      onAssignSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error assigning CNC Programmer:', error);
      // toast.error(isReassign ? 'Failed to reassign CNC operator' : 'Failed to assign CNC operator');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReassign ? 'Reassign CNC Programmer' : `Assign CNC Programmer to ${fabIds.length} FAB(s)`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* CNC Operator selection */}
          <div>
            <Label>Select CNC Programmer</Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading CNC programmers..." : "Select CNC Programmer"} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {!isLoading &&
                  drafters.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                {!isLoading && drafters.length === 0 && (
                  <div className="px-2 py-1 text-sm text-muted-foreground">No CAD/Drafter employees found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date inputs – commented out, but you can uncomment if needed */}
          {/* <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Scheduled Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Scheduled End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div> */}

          {/* Square footage per FAB – commented out, but you can uncomment if needed */}
          {/* <div>
            <h3 className="font-semibold mb-3">{isReassign ? 'FAB Details' : `Selected FABs (${fabIds.length})`}</h3>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {fabIds.map((fabId) => (
                <div key={fabId} className="flex items-center justify-between p-3 border-b">
                  <span className="font-medium">FAB ID: {fabId}</span>
                  <div className="flex items-center space-x-2">
                    <Label>Sq Ft:</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={sqftPerFab[fabId] || ''}
                      onChange={(e) => handleSqftChange(fabId, e.target.value)}
                      placeholder="Enter sq ft"
                      className="w-32"
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div> */}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !operatorId || (isReassign && cncLoading)}>
            {isSubmitting ? (isReassign ? 'Reassigning...' : 'Assigning...') : isReassign ? 'Reassign CNC Programmer' : 'Assign CNC Programmer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};