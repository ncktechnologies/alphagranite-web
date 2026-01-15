import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { useCreateDraftingMutation, useBulkAssignDraftingMutation, BulkDraftingAssignment } from '@/store/api/job';
import { toast } from 'sonner';

interface AssignDrafterModalProps {
  open: boolean;
  onClose: () => void;
  selectedFabIds: string[];
  initialSqftValues?: {[key: string]: string};
  initialStartDates?: {[key: string]: string};
  initialEndDates?: {[key: string]: string};
}

interface DraftingAssignmentData {
  fab_id: number;
  drafter_id: number;
  scheduled_start_date: string;
  scheduled_end_date: string;
  total_sqft_required_to_draft: string;
}

export const AssignDrafterModal: React.FC<AssignDrafterModalProps> = ({ 
  open, 
  onClose, 
  selectedFabIds,
  initialSqftValues,
  initialStartDates,
  initialEndDates
}) => {
  const [drafterId, setDrafterId] = useState<string>('SELECT_DRAFTER');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sqftPerFab, setSqftPerFab] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: employeesData, isLoading: employeesLoading } = useGetSalesPersonsQuery();
  const [createDrafting] = useCreateDraftingMutation();
  const [bulkAssignDrafting] = useBulkAssignDraftingMutation();
  
  // Initialize sqft values when modal opens
  useEffect(() => {
    if (open && selectedFabIds.length > 0) {
      const initialSqft: {[key: string]: string} = {};
      selectedFabIds.forEach(id => {
        // Use provided initial values if available, otherwise default to empty string
        initialSqft[id] = initialSqftValues?.[id] || '';
      });
      setSqftPerFab(initialSqft);
    }
  }, [open, selectedFabIds, initialSqftValues]);

  const handleSqftChange = (fabId: string, value: string) => {
    setSqftPerFab(prev => ({
      ...prev,
      [fabId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!drafterId || drafterId === 'SELECT_DRAFTER') {
      toast.error('Please select a drafter');
      return;
    }



    // Validate that all FABs have sqft values
    const missingSqft = selectedFabIds.filter(id => !sqftPerFab[id] || sqftPerFab[id] === '');
    if (missingSqft.length > 0) {
      toast.error(`Please enter square footage for FAB ID(s): ${missingSqft.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create bulk assignment data in the format expected by backend
      const requestData = {
        drafter_id: parseInt(drafterId, 10),
        items: selectedFabIds.map(fabId => ({
          fab_id: parseInt(fabId, 10),
          scheduled_start_date: initialStartDates?.[fabId] || '',
          scheduled_end_date: initialEndDates?.[fabId] || '',
          total_sqft_required_to_draft: parseFloat(sqftPerFab[fabId] || '0')
        }))
      };

      // Use the bulk assignment endpoint
      await bulkAssignDrafting(requestData).unwrap();
      
      toast.success(`Successfully assigned drafter to ${selectedFabIds.length} FAB(s)`);
      onClose();
    } catch (error) {
      console.error('Error assigning drafter:', error);
      toast.error('Failed to assign drafter to FAB(s)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const drafters = Array.isArray(employeesData) ? employeesData : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Drafter to Selected FABs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="drafter">Select Drafter</Label>
              <Select value={drafterId} onValueChange={setDrafterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select drafter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELECT_DRAFTER">
                    Select Drafter
                  </SelectItem>
                  {!employeesLoading && drafters.map((drafter) => (
                    <SelectItem key={drafter.id} value={drafter.id.toString()}>
                      {drafter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-3">Selected FABs ({selectedFabIds.length})</h3>
            <div className="border rounded-md max-h-60 overflow-y-auto">
              {selectedFabIds.map((fabId) => (
                <div key={fabId} className="flex items-center justify-between p-3 border-b">
                  <span className="font-medium">FAB ID: {fabId}</span>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`sqft-${fabId}`} className="whitespace-nowrap mr-2">Sq Ft:</Label>
                    <Input
                      id={`sqft-${fabId}`}
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
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting || !drafterId || drafterId === 'SELECT_DRAFTER'}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Drafter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};