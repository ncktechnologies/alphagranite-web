import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Clock, Calendar, LoaderCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateShopPlansMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';

interface CreateEventFormProps {
  onClose: () => void;
  selectedDate: Date | null;
  selectedTimeSlot?: string | null;
  onEventCreated?: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onClose,
  selectedDate,
  selectedTimeSlot,
  onEventCreated,
}) => {
  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  
  const [formData, setFormData] = useState({
    fab_id: '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    start_time: selectedTimeSlot || '09:00',
    end_time: '',
    planning_section_id: undefined as string | undefined,
  });

  // Fetch workstations, planning sections and employees
  const { data: workstationsData } = useGetWorkstationsQuery();
  const workstations = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : planningSectionsData || []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees = employeesData?.data || (Array.isArray(employeesData) ? employeesData : employeesData || []);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate required fields
  if (!formData.fab_id) {
    toast.error('FAB ID is required');
    return;
  }
  if (!formData.operator_id) {
    toast.error('Operator is required');
    return;
  }
  if (!formData.workstation_id) {
    toast.error('Workstation is required');
    return;
  }
  if (!formData.start_time) {
    toast.error('Start time is required');
    return;
  }
  if (!formData.end_time) {
    toast.error('End time is required');
    return;
  }

  try {
    const scheduledDate = selectedDate 
      ? format(selectedDate, 'yyyy-MM-dd') 
      : new Date().toISOString().split('T')[0];

    const startTime = formData.start_time;
    const endTime = formData.end_time;

    // Construct full ISO datetime strings
    const scheduledStart = `${scheduledDate}T${startTime}:00`;
    const scheduledEnd = `${scheduledDate}T${endTime}:00`;

    // Validate that end time is after start time
    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      toast.error('End time must be after start time');
      return;
    }

    // Calculate estimated hours from start and end times
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    const diffMs = end.getTime() - start.getTime();
    const estimatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    // Build payload according to actual backend requirements
    const planData = {
      fab_id: Number(formData.fab_id),
      estimated_hours: estimatedHours,          // ✅ correct top-level field name
      notes: formData.notes || '',               // top-level string
      status_id: 1,                               // optional default
      stages: [
        {
          workstation_id: Number(formData.workstation_id),
          planning_section_id: Number(formData.planning_section_id) || (planningSections[0]?.id ?? 0),
          operator_ids: [Number(formData.operator_id)],
          estimated_hours: estimatedHours,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,            // keep if accepted; remove if not
        },
      ],
    };

    await createShopPlan(planData as any).unwrap();

    toast.success('Plan scheduled successfully');
    onEventCreated?.();
    onClose();
  } catch (error: any) {
    console.error('Error creating event:', error);
    const errorMsg = error?.data?.detail?.message || 'Failed to create Plan';
    toast.error(errorMsg);
  }
};
  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-center">
        <CardTitle>Create Plan</CardTitle>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Display */}
          <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Scheduled Date</p>
              <p className="font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'No date selected'}
              </p>
            </div>
          </div>

          {/* FAB ID */}
          <div>
            <Label htmlFor="fab_id" className="text-sm font-medium">
              FAB ID *
            </Label>
            <Input
              id="fab_id"
              type="number"
              placeholder="e.g., 37"
              value={formData.fab_id}
              onChange={(e) =>
                setFormData({ ...formData, fab_id: e.target.value })
              }
              className="mt-2"
            />
          </div>

          {/* Scheduled Date & Time */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-gray-700">Scheduled Time *</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm text-gray-600">Start</p>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <p className="text-sm text-gray-600">End</p>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}
            </p>
          </div>

          {/* Planning Section */}
          <div>
            <Label htmlFor="planning_section_id" className="text-sm font-medium">
              Planning Section
            </Label>
            <Select
              value={formData.planning_section_id}
              onValueChange={(value) => setFormData({ ...formData, planning_section_id: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {planningSections.map((ps: any) => (
                  <SelectItem key={ps.id} value={String(ps.id)}>
                    {ps.name || ps.plan_name || ps.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Workstation */}
          <div>
            <Label htmlFor="workstation_id" className="text-sm font-medium">
              Workstation *
            </Label>
            <Select
              value={formData.workstation_id}
              onValueChange={(value) =>
                setFormData({ ...formData, workstation_id: value })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select workstation" />
              </SelectTrigger>
              <SelectContent>
                {workstations.map((ws: any) => (
                  <SelectItem key={ws.id} value={String(ws.id)}>
                    {ws.name || ws.workstation_name || `WS ${ws.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          <div>
            <Label htmlFor="operator_id" className="text-sm font-medium">
              Operator *
            </Label>
            <Select
              value={formData.operator_id}
              onValueChange={(value) =>
                setFormData({ ...formData, operator_id: value })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {`${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.trim() || emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Description / Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this plan..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="mt-2 min-h-24"
            />
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="p-6 border-t bg-gray-50 flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            'Schedule Plan'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateEventForm;