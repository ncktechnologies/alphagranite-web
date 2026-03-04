import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Calendar, LoaderCircle, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateShopPlansMutation, useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';

interface CreatePlanPageProps {
  onBack?: () => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  onEventCreated?: () => void;
}

const CreatePlanPage: React.FC<CreatePlanPageProps> = ({
  onBack,
  selectedDate: propSelectedDate,
  selectedTimeSlot,
  selectedEvent,
  prefillFabId: propPrefillFabId,
  onEventCreated,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFabId = searchParams.get('fabId');

  // Use prop first, then URL param
  const effectivePrefillFabId = propPrefillFabId || urlFabId || '';

  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  const [updateShopPlan] = useUpdateShopPlanMutation();

  const { data: workstationsData } = useGetWorkstationsQuery();
  const workstations = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : planningSectionsData || []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees = employeesData?.data || (Array.isArray(employeesData) ? employeesData : employeesData || []);

  // Helper to create an empty entry, optionally with a specific date
  const emptyEntry = (date?: Date) => ({
    id: undefined as number | undefined,
    fab_id: effectivePrefillFabId || '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    start_time: selectedTimeSlot || '09:00',
    end_time: '',
    planning_section_id: undefined as string | undefined,
    date: date || propSelectedDate || new Date(), // per‑stage date
  });

  const [entries, setEntries] = useState(() => [emptyEntry()]);

  // When editing an event, populate the form
  useEffect(() => {
    if (selectedEvent) {
      const ev: any = selectedEvent;
      setEntries([{
        id: ev.id,
        fab_id: String(ev.fab_id || effectivePrefillFabId || ''),
        workstation_id: String(ev.workstation_id || ''),
        operator_id: String(ev.operator_id || ''),
        notes: ev.notes || ev.plan_name || '',
        start_time: format(new Date(ev.scheduled_start_date), 'HH:mm'),
        end_time: ev.scheduled_end_date ? format(new Date(ev.scheduled_end_date), 'HH:mm') : '',
        planning_section_id: String(ev.planning_section_id || '') || undefined,
        date: new Date(ev.scheduled_start_date), // use the event's date
      }]);
    } else {
      setEntries([emptyEntry()]);
    }
  }, [selectedEvent, selectedTimeSlot, effectivePrefillFabId]);

  const addEntry = () =>
    setEntries((p) => {
      // New stage inherits the fab_id from the first stage, but date can be independent
      const newEntry = emptyEntry();
      if (p[0]?.fab_id) newEntry.fab_id = p[0].fab_id;
      return [...p, newEntry];
    });

  const removeEntry = (idx: number) => setEntries((p) => p.filter((_, i) => i !== idx));

  const updateEntry = (idx: number, patch: Partial<any>) =>
    setEntries((p) => {
      const updated = p.map((e, i) => (i === idx ? { ...e, ...patch } : e));
      // If first entry's fab_id changes, propagate to all others
      if (idx === 0 && patch.fab_id !== undefined) {
        return updated.map((e) => ({ ...e, fab_id: patch.fab_id }));
      }
      return updated;
    });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate each entry
    for (const entry of entries) {
      if (!entry.fab_id) { toast.error('FAB ID is required'); return; }
      if (!entry.operator_id) { toast.error('Operator is required'); return; }
      if (!entry.workstation_id) { toast.error('Workstation is required'); return; }
      if (!entry.start_time) { toast.error('Start time is required'); return; }
      if (!entry.end_time) { toast.error('End time is required'); return; }
      if (!entry.date) { toast.error('Date is required for each stage'); return; }
    }

    try {
      const groups: Record<string, typeof entries> = {};
      const updates: typeof entries = [];

      for (const entry of entries) {
        const scheduledDate = format(entry.date, 'yyyy-MM-dd');

        if (entry.id) {
          updates.push(entry);
        } else {
          const key = String(entry.fab_id);
          if (!groups[key]) groups[key] = [];
          groups[key].push(entry);
        }
      }

      // Create new plans (grouped by fab_id)
      for (const fabId in groups) {
        const groupEntries = groups[fabId];
        let totalEst = 0;
        const stages = groupEntries.map((entry) => {
          const scheduledDate = format(entry.date, 'yyyy-MM-dd');
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
            notes: entry.notes ? entry.notes : undefined,
          };
        });
        const planData = { fab_id: Number(fabId), estimated_hours: totalEst, status_id: 1, stages } as any;
        await createShopPlan(planData).unwrap();
      }

      // Update existing plans (editing)
      for (const entry of updates) {
        const scheduledDate = format(entry.date, 'yyyy-MM-dd');
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
          notes: entry.notes ? entry.notes : undefined,
        };
        await updateShopPlan({ plan_id: Number(entry.id), data: { stage: stageObj } } as any).unwrap();
      }

      toast.success('Plans scheduled successfully');
      onEventCreated?.();
      handleBack();
    } catch (error: any) {
      console.error('Error creating/updating event:', error);
      const errorMsg = error?.data?.detail?.message || 'Failed to create/update Plan';
      // toast.error(errorMsg);
    }
  };

  const isEditing = !!selectedEvent;

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <div className="border-b border-[#dfdfdf]">
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] bg-white flex items-center gap-2 text-[#4b545d] hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-['Proxima_Nova:Semibold',sans-serif] text-[14px]">Back to Calendar</span>
            </button>
            <div className="flex flex-col gap-1">
              <p className="font-['Proxima_Nova:Semibold',sans-serif] text-[28px] leading-[32px] text-black font-semibold">
                {isEditing ? 'Edit Plan' : 'Create Plan'}
              </p>
            </div>
          </div>

          {/* FAB ID badge */}
          {entries[0]?.fab_id && (
            <div className="flex items-center gap-2 bg-[#f0f4e8] border border-[#9cc15e] rounded-[8px] px-4 py-2">
              <span className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4a4d59]">FAB ID</span>
              <span className="font-['Proxima_Nova:Semibold',sans-serif] text-[20px] text-[#7a9705] font-semibold">
                #{entries[0].fab_id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="px-10 py-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan entries */}
          {entries.map((entry, idx) => (
            <Card key={idx} className="border border-[#ecedf0] rounded-[12px]">
              <CardHeader className="pb-3 border-b border-[#ecedf0]">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-['Proxima_Nova:Semibold',sans-serif] text-[16px] text-[#4b545d] font-semibold">
                    Plan Stage {idx + 1}
                  </CardTitle>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(idx)}
                      className="h-7 w-7 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {/* FAB ID */}
                <div>
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">FAB ID *</Label>
                  {idx === 0 ? (
                    <Input
                      type="number"
                      placeholder="e.g., 37"
                      value={entry.fab_id}
                      onChange={(e) => updateEntry(idx, { fab_id: e.target.value })}
                      className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]"
                      disabled={!!effectivePrefillFabId && !isEditing}
                    />
                  ) : (
                    <Input
                      type="number"
                      value={entry.fab_id}
                      disabled
                      className="mt-2 h-[42px] bg-[#f9f9f9] border-[#e2e4ed] rounded-[6px] text-[13px]"
                    />
                  )}
                </div>

                {/* Date picker per stage */}
                <div>
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'mt-2 w-full h-[42px] px-3 text-left border border-[#e2e4ed] rounded-[6px] text-[13px] flex items-center gap-2',
                          !entry.date && 'text-muted-foreground'
                        )}
                      >
                        <Calendar className="h-4 w-4 text-[#7a9705]" />
                        {entry.date ? format(entry.date, 'PPP') : <span>Pick a date</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={entry.date}
                        onSelect={(date) => date && updateEntry(idx, { date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-[#7a9705]" />
                    <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Scheduled Time *</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-['Proxima_Nova:Regular',sans-serif] text-[12px] text-[#7c8689] mb-1">Start</p>
                      <Input
                        type="time"
                        value={entry.start_time}
                        onChange={(e) => updateEntry(idx, { start_time: e.target.value })}
                        className="h-[42px] border-[#e2e4ed] rounded-[6px]"
                        required
                      />
                    </div>
                    <div>
                      <p className="font-['Proxima_Nova:Regular',sans-serif] text-[12px] text-[#7c8689] mb-1">End</p>
                      <Input
                        type="time"
                        value={entry.end_time}
                        onChange={(e) => updateEntry(idx, { end_time: e.target.value })}
                        className="h-[42px] border-[#e2e4ed] rounded-[6px]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Planning Section */}
                <div>
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Planning Section</Label>
                  <Select value={entry.planning_section_id} onValueChange={(value) => updateEntry(idx, { planning_section_id: value })}>
                    <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
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
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Workstation *</Label>
                  <Select value={entry.workstation_id} onValueChange={(value) => updateEntry(idx, { workstation_id: value })}>
                    <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
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
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Operator *</Label>
                  <Select value={entry.operator_id} onValueChange={(value) => updateEntry(idx, { operator_id: value })}>
                    <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
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

                {/* Notes */}
                <div>
                  <Label className="font-['Proxima_Nova:Semibold',sans-serif] text-[13px] text-[#4b545d]">Description / Notes</Label>
                  <Textarea
                    placeholder="Add any notes about this plan..."
                    value={entry.notes}
                    onChange={(e) => updateEntry(idx, { notes: e.target.value })}
                    className="mt-2 min-h-24 border-[#e2e4ed] rounded-[6px] text-[13px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add another stage */}
          <button
            type="button"
            onClick={addEntry}
            className="w-full h-[44px] border border-dashed border-[#e2e4ed] rounded-[8px] flex items-center justify-center gap-2 text-[#78829d] hover:border-[#9cc15e] hover:text-[#7a9705] hover:bg-[#f0f4e8] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="font-['Proxima_Nova:Semibold',sans-serif] text-[14px]">Add Another Stage</span>
          </button>

          {/* Footer actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 h-[44px] border border-[#e2e4ed] rounded-[8px] font-['Proxima_Nova:Semibold',sans-serif] text-[14px] text-[#4b545d] hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center gap-2 text-white font-['Proxima_Nova:Semibold',sans-serif] text-[14px] font-semibold disabled:opacity-60"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                isEditing ? 'Update Plan' : 'Schedule Plan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlanPage;