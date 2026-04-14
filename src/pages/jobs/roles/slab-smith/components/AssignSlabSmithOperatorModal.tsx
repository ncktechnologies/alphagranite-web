import React, { useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayDate } from '../../drafters/components/AssignDrafterModal';
import { useCreateSlabSmithMutation, useGetEmployeesQuery, useGetSlabSmithByFabIdQuery, useUpdateSlabSmithMutation } from '@/store/api';

const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

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
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const initializedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter operators based on search
  const filteredOperators = operators.filter((op: any) => {
    const name = `${op.first_name || ''} ${op.last_name || ''}`.trim() || op.email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const fabIdsToAssign = reassignFabId ? [reassignFabId] : selectedFabIds;
  const isReassignMode = !!reassignFabId;

  // Reset form when modal opens
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      setSelectedOperator('');
      setSearchQuery('');
      setShowDropdown(false);

      if (isReassignMode && slabSmithData) {
        setSelectedOperator(String(slabSmithData?.drafter_id || ''));
      }
    }

    if (!open) {
      initializedRef.current = false;
    }
  }, [open, selectedFabIds, reassignFabId, slabSmithData, isReassignMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const getOperatorName = (operatorId: string) => {
    const operator = operators.find((op: any) => String(op.id) === operatorId);
    if (!operator) return operatorId;
    return `${operator.first_name || ''} ${operator.last_name || ''}`.trim() || operator.email;
  };

  const handleSubmit = async () => {
    if (!selectedOperator || fabIdsToAssign.length === 0) return;

    setIsSubmitting(true);

    try {
      const operator = operators.find((op: any) => String(op.id) === selectedOperator);
      const operatorName = `${operator?.first_name || ''} ${operator?.last_name || ''}`.trim();

      if (isReassignMode) {
        await updateSlabSmith({
          fab_id: parseInt(fabIdsToAssign[0], 10),
          data: {
            drafter_id: parseInt(selectedOperator, 10),
            drafter_name: operatorName,
            start_date: getTodayDate(),
          }
        }).unwrap();
      } else {
        for (const fabId of fabIdsToAssign) {
          await createSlabSmith({
            fab_id: parseInt(fabId, 10),
            data: {
              fab_id: parseInt(fabId, 10),
              drafter_id: parseInt(selectedOperator, 10),
              drafter_name: operatorName,
              start_date: getTodayDate(),
            }
          }).unwrap();
        }
      }

      onAssignSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign SlabSmith operator:', error);
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
          {/* Operator Search Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#7e8299]">Select Operator *</label>
            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border border-[#ebedf3] rounded-[6px] cursor-pointer hover:border-[#c9c9d8] focus:border-[#b5b5c3] transition-colors"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span className={selectedOperator ? 'text-[#181c32]' : 'text-[#99a1b7]'}>
                  {selectedOperator ? getOperatorName(selectedOperator) : 'Search and select operator...'}
                </span>
                <Search size={14} className="text-[#99a1b7]" />
              </div>

              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-[#ebedf3] rounded-[6px] shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 border-b border-[#ebedf3]">
                    <input
                      type="text"
                      placeholder="Search operators..."
                      className="w-full h-8 px-2 text-xs border border-[#ebedf3] rounded-[4px] focus:outline-none focus:border-[#b5b5c3]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="py-1">
                    {employeesLoading ? (
                      <div className="px-3 py-2 text-xs text-[#99a1b7]">Loading operators...</div>
                    ) : filteredOperators.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#99a1b7]">No operators found</div>
                    ) : (
                      filteredOperators.map((operator: any) => {
                        const operatorId = String(operator.id);
                        const operatorName = `${operator.first_name || ''} ${operator.last_name || ''}`.trim() || operator.email;

                        return (
                          <div
                            key={operatorId}
                            className={`px-3 py-2 cursor-pointer transition-colors ${selectedOperator === operatorId
                              ? 'bg-[#f1f0ff] text-[#5d70ea]'
                              : 'text-[#181c32] hover:bg-[#f5f8fa]'
                              }`}
                            onClick={() => {
                              setSelectedOperator(operatorId);
                              setShowDropdown(false);
                              setSearchQuery('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${selectedOperator === operatorId ? 'bg-[#5d70ea]' : 'bg-transparent'
                                }`} />
                              <span className="text-xs">{operatorName}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
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
            {isSubmitting ? 'Assigning...' : (isReassignMode ? 'Reassign Operator' : `Assign Operator`)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignSlabSmithOperatorModal;
