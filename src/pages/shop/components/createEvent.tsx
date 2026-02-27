import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Clock, Calendar, LoaderCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateShopPlansMutation, useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';

interface CreateEventFormProps {
  onClose: () => void;
  selectedDate: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  onEventCreated?: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onClose,
  selectedDate,
  selectedTimeSlot,
  selectedEvent,
  onEventCreated,
}) => {
  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  const [updateShopPlan] = useUpdateShopPlanMutation();

  const emptyEntry = () => ({
    id: undefined as number | undefined,
    fab_id: '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    start_time: selectedTimeSlot || '09:00',
    end_time: '',
    planning_section_id: undefined as string | undefined,
  });

  const [entries, setEntries] = useState(() => [emptyEntry()]);

  // Fetch workstations, planning sections and employees
  const { data: workstationsData } = useGetWorkstationsQuery();
  const workstations = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : planningSectionsData || []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees = employeesData?.data || (Array.isArray(employeesData) ? employeesData : employeesData || []);

  useEffect(() => {
    if ((selectedEvent as any) ) {
      const ev: any = (selectedEvent as any);
      const entry = {
        id: ev.id,
        fab_id: String(ev.fab_id || ''),
        workstation_id: String(ev.workstation_id || ''),
        operator_id: String(ev.operator_id || ''),
        notes: ev.notes || ev.plan_name || '',
        start_time: format(new Date(ev.scheduled_start_date), 'HH:mm'),
        end_time: ev.scheduled_end_date ? format(new Date(ev.scheduled_end_date), 'HH:mm') : '',
        planning_section_id: String(ev.planning_section_id || '') || undefined,
      } as any;
      setEntries([entry]);
    } else {
      setEntries([emptyEntry()]);
    }
  }, [selectedEvent, selectedTimeSlot, selectedDate]);

  const addEntry = () =>
    setEntries((p) => {
      const newEntry = emptyEntry();
      // if there's already a fab_id in first entry, copy it
      if (p[0]?.fab_id) {
        newEntry.fab_id = p[0].fab_id;
      }
      return [...p, newEntry];
    });
  const removeEntry = (idx: number) => setEntries((p) => p.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, patch: Partial<any>) =>
    setEntries((p) => {
      const updated = p.map((e, i) => (i === idx ? { ...e, ...patch } : e));
      // if first entry's fab_id changed, propagate to all others
      if (idx === 0 && patch.fab_id !== undefined) {
        return updated.map((e) => ({ ...e, fab_id: patch.fab_id }));
      }
      return updated;
    });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const scheduledDate = selectedDate
      ? format(selectedDate, 'yyyy-MM-dd')
      : new Date().toISOString().split('T')[0];
    // group entries by fab_id for creation; update entries separately
    const groups: Record<string, typeof entries> = {};
    const updates: typeof entries = [];

    for (const entry of entries) {
      // validation common to both create and update
      if (!entry.fab_id) {
        toast.error('FAB ID is required');
        return;
      }
      if (!entry.operator_id) {
        toast.error('Operator is required');
        return;
      }
      if (!entry.workstation_id) {
        toast.error('Workstation is required');
        return;
      }
      if (!entry.start_time) {
        toast.error('Start time is required');
        return;
      }
      if (!entry.end_time) {
        toast.error('End time is required');
        return;
      }

      if (entry.id) {
        updates.push(entry);
      } else {
        const key = String(entry.fab_id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
      }
    }

    // process creations grouped by fab_id; each group becomes a single payload
    for (const fabId in groups) {
      const groupEntries = groups[fabId];
      let totalEst = 0;
      const stages = groupEntries.map((entry) => {
        const scheduledStart = `${scheduledDate}T${entry.start_time}:00`;
        const scheduledEnd = `${scheduledDate}T${entry.end_time}:00`;
        const diffMs = new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime();
        const estimatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        totalEst += estimatedHours;
        return {
          workstation_id: Number(entry.workstation_id),
          planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
          operator_ids: [Number(entry.operator_id)],
          estimated_hours: estimatedHours,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          notes: entry.notes ? [entry.notes] : undefined,
        };
      });

      const planData = {
        fab_id: Number(fabId),
        estimated_hours: totalEst,
        status_id: 1,
        stages,
      } as any;
      await createShopPlan(planData).unwrap();
    }

    // updates - these still call individually since the API currently updates one stage at a time
    for (const entry of updates) {
      const scheduledStart = `${scheduledDate}T${entry.start_time}:00`;
      const scheduledEnd = `${scheduledDate}T${entry.end_time}:00`;
      const diffMs = new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime();
      const estimatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      const stageObj: any = {
        workstation_id: Number(entry.workstation_id),
        planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
        operator_ids: [Number(entry.operator_id)],
        estimated_hours: estimatedHours,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        notes: entry.notes ? [entry.notes] : undefined,
      };
      await updateShopPlan({ plan_id: Number(entry.id), data: { stage: stageObj } } as any).unwrap();
    }

    toast.success('Plans scheduled successfully');
    onEventCreated?.();
    onClose();
  } catch (error: any) {
    console.error('Error creating/updating event:', error);
    const errorMsg = error?.data?.detail?.message || 'Failed to create/update Plan';
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {entries.map((entry, idx) => (
            <div key={idx} className="p-3 border rounded space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Plan {idx + 1}</p>
                <div className="flex items-center gap-2">
                  {entries.length > 1 && (
                    <button type="button" onClick={() => removeEntry(idx)} className="p-1 hover:bg-gray-100 rounded">
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">FAB ID *</Label>
                {idx === 0 ? (
                  <Input
                    type="number"
                    placeholder="e.g., 37"
                    value={entry.fab_id}
                    onChange={(e) => updateEntry(idx, { fab_id: e.target.value })}
                    className="mt-2"
                  />
                ) : (
                  <Input
                    type="number"
                    value={entry.fab_id}
                    disabled
                    className="mt-2 bg-gray-100"
                  />
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-gray-700">Scheduled Time *</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-600">Start</p>
                    <Input
                      type="time"
                      value={entry.start_time}
                      onChange={(e) => updateEntry(idx, { start_time: e.target.value })}
                      className="mt-2"
                      required
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End</p>
                    <Input
                      type="time"
                      value={entry.end_time}
                      onChange={(e) => updateEntry(idx, { end_time: e.target.value })}
                      className="mt-2"
                      required
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'No date selected'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Planning Section</Label>
                <Select value={entry.planning_section_id} onValueChange={(value) => updateEntry(idx, { planning_section_id: value })}>
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

              <div>
                <Label className="text-sm font-medium">Workstation *</Label>
                <Select value={entry.workstation_id} onValueChange={(value) => updateEntry(idx, { workstation_id: value })}>
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

              <div>
                <Label className="text-sm font-medium">Operator *</Label>
                <Select value={entry.operator_id} onValueChange={(value) => updateEntry(idx, { operator_id: value })}>
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

              <div>
                <Label className="text-sm font-medium">Description / Notes</Label>
                <Textarea placeholder="Add any notes about this plan..." value={entry.notes} onChange={(e) => updateEntry(idx, { notes: e.target.value })} className="mt-2 min-h-24" />
              </div>
            </div>
          ))}

          {/* <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={addEntry} className="items-center gap-2">
              <Plus className="h-4 w-4" /> Add Plan
            </Button>
          </div> */}
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