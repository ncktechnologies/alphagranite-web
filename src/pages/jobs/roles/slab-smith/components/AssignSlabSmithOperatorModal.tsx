import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTodayDate } from '../../drafters/components/AssignDrafterModal';
import { useCreateSlabSmithMutation, useGetEmployeesQuery, useGetSlabSmithByFabIdQuery, useUpdateSlabSmithMutation } from '@/store/api';
import { toast } from 'sonner';

interface AssignSlabSmithOperatorModalProps {
  open: boolean;
  onClose: () => void;
  selectedFabIds?: string[];
  reassignFabId?: string | null;
  initialSqftValues?: Record<string, number>;
  onAssignSuccess: () => void;
}

const AssignSlabSmithOperatorModal: React.FC<AssignSlabSmithOperatorModalProps> = ({
  open,
  onClose,
  selectedFabIds = [],
  reassignFabId,
  initialSqftValues = {},
  onAssignSuccess,
}) => {
  const [selectedOperator, setSelectedOperator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery();
  const [createSlabSmith] = useCreateSlabSmithMutation();
  const [updateSlabSmith] = useUpdateSlabSmithMutation();

  const { data: slabSmithData, isFetching: slabSmithLoading } = useGetSlabSmithByFabIdQuery(
    reassignFabId ? parseInt(reassignFabId, 10) : 0,
    { skip: !reassignFabId || !open }
  );

  // Extract employees from the response
  const operators = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.data || [];

  const fabIdsToAssign = reassignFabId ? [reassignFabId] : selectedFabIds;
  const isReassignMode = !!reassignFabId;

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedOperator('');

      if (isReassignMode && slabSmithData) {
        setSelectedOperator(String(slabSmithData?.drafter_id || ''));
      }
    }
  }, [open, selectedFabIds, reassignFabId, slabSmithData, isReassignMode]);

  const getOperatorName = (operatorId: string) => {
    const operator = operators.find((op: any) => String(op.id) === operatorId);
    if (!operator) return operatorId;
    return `${operator.first_name || ''} ${operator.last_name || ''}`.trim() || operator.email;
  };

  const handleSubmit = async () => {
    if (!selectedOperator || fabIdsToAssign.length === 0) {
      toast.error('Please select a SlabSmith operator');
      return;
    }

    setIsSubmitting(true);

    try {
      const operator = operators.find((op: any) => String(op.id) === selectedOperator);
      const operatorName = `${operator?.first_name || ''} ${operator?.last_name || ''}`.trim();

      if (isReassignMode) {
        const slabSmithId = slabSmithData?.id;
        if (!slabSmithId) throw new Error('SlabSmith record not found');
        
        await updateSlabSmith({
          slabsmith_id: slabSmithId,
          data: {
            drafter_id: parseInt(selectedOperator, 10),
          }
        }).unwrap();
        
        toast.success(`SlabSmith Drafter reassigned for FAB ${reassignFabId}`);
      } else {
        // Create SlabSmith assignment for each FAB - send fields at root level
        for (const fabId of fabIdsToAssign) {
          await createSlabSmith({
            fab_id: parseInt(fabId, 10),
            slab_smith_type: 'slab_smith',
            drafter_id: parseInt(selectedOperator, 10),
            start_date: getTodayDate(),
          }).unwrap();
        }
        
        toast.success(`Successfully assigned SlabSmith Drafter to ${fabIdsToAssign.length} FAB(s)`);
      }

      onAssignSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning SlabSmith operator:', error);
      // toast.error(isReassignMode ? 'Failed to reassign SlabSmith operator' : 'Failed to assign SlabSmith operator');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-[12px] w-[500px] max-w-[90vw] shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-[20px] border-b border-[#ebedf3]">
          <h2 className="text-[1.22rem] font-semibold text-[#181c32]">
            {isReassignMode ? 'Reassign SlabSmith Operator' : `Assign SlabSmith Operator to ${fabIdsToAssign.length} FAB(s)`}
          </h2>
          <button onClick={onClose} className="text-[#99a1b7] hover:text-[#181c32]">
            <X size={18} />
          </button>
        </div>

        <div className="p-[20px] space-y-5">
          {/* Operator Selection */}
          <div className="space-y-2">
            <Label>Select SlabSmith Drafter</Label>
            <Select value={selectedOperator} onValueChange={setSelectedOperator}>
              <SelectTrigger>
                <SelectValue placeholder="Select SlabSmith Drafter" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {!employeesLoading &&
                  operators.map((operator: any) => {
                    const operatorId = String(operator.id);
                    const operatorName = `${operator.first_name || ''} ${operator.last_name || ''}`.trim() || operator.email;

                    return (
                      <SelectItem key={operatorId} value={operatorId}>
                        {operatorName}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          {/* FAB List (read-only) */}
          {fabIdsToAssign.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#7e8299]">FAB ID(s)</label>
              <div className="flex flex-wrap gap-2 p-3 bg-[#f5f8fa] rounded-[6px] max-h-32 overflow-y-auto">
                {fabIdsToAssign.map(fabId => (
                  <span
                    key={fabId}
                    className="inline-flex items-center px-2.5 py-1 rounded-[4px] text-[11px] font-medium bg-[#e8f3ff] text-[#5d70ea]"
                  >
                    {fabId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-[20px] border-t border-[#ebedf3]">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedOperator || fabIdsToAssign.length === 0 || isSubmitting}
            className="bg-[#5d70ea] hover:bg-[#4b5fd4] text-white"
          >
            {isSubmitting ? 'Assigning...' : (isReassignMode ? 'Reassign Drafter' : `Assign Drafter`)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignSlabSmithOperatorModal;
