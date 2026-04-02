// AssignDrafterModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useBulkAssignDraftingMutation, useUpdateDraftingMutation, useGetDraftingByFabIdQuery } from '@/store/api/job';
import { toast } from 'sonner';

interface AssignDrafterModalProps {
  open: boolean;
  onClose: () => void;
  selectedFabIds?: string[];
  reassignFabId?: string | null; // for single reassign
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
  const [drafterId, setDrafterId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sqftPerFab, setSqftPerFab] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);

  const { data: employeesData, isLoading: employeesLoading } = useGetSalesPersonsQuery();
  const [bulkAssignDrafting] = useBulkAssignDraftingMutation();
  const [updateDrafting] = useUpdateDraftingMutation();

  // Fetch existing drafting data if reassigning
  const { data: draftingData, isFetching: draftingLoading } = useGetDraftingByFabIdQuery(
    reassignFabId ? parseInt(reassignFabId, 10) : 0,
    { skip: !reassignFabId || !open }
  );

  const drafters = Array.isArray(employeesData) ? employeesData : [];
  const isReassign = !!reassignFabId;
  const fabIds = isReassign ? [reassignFabId] : selectedFabIds;

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setDrafterId('');
      setStartDate('');
      setEndDate('');
      setSqftPerFab({});
    }
  }, [open]);

  // Initialize form when data is ready (for reassign) or immediately (for bulk)
  useEffect(() => {
    if (!open) return;
    if (initializedRef.current) return;

    if (isReassign && draftingData) {
      const drafting = draftingData?.data || draftingData;
      setDrafterId(String(drafting.drafter_id || ''));
      setStartDate(drafting.scheduled_start_date || '');
      setEndDate(drafting.scheduled_end_date || '');
      setSqftPerFab({
        [reassignFabId]: String(drafting.total_sqft_required_to_draft || ''),
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
  }, [open, isReassign, draftingData, reassignFabId, fabIds, initialSqftValues]);

  const handleSqftChange = (fabId: string, value: string) => {
    setSqftPerFab((prev) => ({ ...prev, [fabId]: value }));
  };

  const handleSubmit = async () => {
    if (!drafterId) {
      toast.error('Please select a drafter');
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
        const draftingId = draftingData?.data?.id || draftingData?.id;
        if (!draftingId) throw new Error('Drafting record not found');
        await updateDrafting({
          id: draftingId,
          data: {
            drafter_id: parseInt(drafterId, 10),
            scheduled_start_date: startDate,
            scheduled_end_date: endDate,
            total_sqft_required_to_draft: parseFloat(sqftPerFab[reassignFabId] || '0'),
          },
        }).unwrap();
        toast.success(`Drafter reassigned for FAB ${reassignFabId}`);
      } else {
        const requestData = {
          drafter_id: parseInt(drafterId, 10),
          items: fabIds.map((fabId) => ({
            fab_id: parseInt(fabId, 10),
            scheduled_start_date: initialStartDates[fabId] || '',
            scheduled_end_date: initialEndDates[fabId] || '',
            total_sqft_required_to_draft: parseFloat(sqftPerFab[fabId] || '0'),
          })),
        };
        await bulkAssignDrafting(requestData).unwrap();
        toast.success(`Successfully assigned drafter to ${fabIds.length} FAB(s)`);
      }

      onAssignSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error assigning drafter:', error);
      toast.error(isReassign ? 'Failed to reassign drafter' : 'Failed to assign drafter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isReassign ? 'Reassign Drafter' : `Assign Drafter to ${fabIds.length} FAB(s)`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label>Select Drafter</Label>
            <Select value={drafterId} onValueChange={setDrafterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select drafter" />
              </SelectTrigger>
              <SelectContent>
                {!employeesLoading &&
                  drafters.map((drafter) => (
                    <SelectItem key={drafter.id} value={drafter.id.toString()}>
                      {drafter.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* {isReassign && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>Scheduled End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          <div>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || !drafterId || (isReassign && draftingLoading)}>
            {isSubmitting ? (isReassign ? 'Reassigning...' : 'Assigning...') : isReassign ? 'Reassign Drafter' : 'Assign Drafter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};