import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Calendar, ChevronDown, LoaderCircle, Plus, X } from 'lucide-react';
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
import { useCreateShopPlansMutation, useCreateShopSuggestionMutation, useUpdateShopPlanMutation } from '@/store/api';
import { useGetPlanningSectionsQuery, useGetWorkStationByPlanningSectionsQuery, useGetWorkstationsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetFabsQuery } from '@/store/api/job';

const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break;
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const value = `${hh}:${mm}`;
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      slots.push({ value, label: `${displayH}:${mm} ${period}` });
    }
  }
  return slots;
})();

interface PlanEntry {
  id?: number;
  fab_id: string;
  workstation_id: string;
  operator_id: string;
  notes: string;
  start_time: string;
  end_time: string;
  planning_section_id?: string;
  date: Date | undefined;
  sequence: string;
}

interface PlanEntryCardProps {
  entry: PlanEntry;
  idx: number;
  total: number;
  employees: any[];
  planningSections: any[];
  isExpanded: boolean;
  fabOptions: { value: string; label: string }[];
  isLoadingFabs: boolean;
  effectivePrefillFabId: string;
  isEditing: boolean;
  sequenceOptions: number[];
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<PlanEntry>) => void;
  onRemove: () => void;
}

const PlanEntryCard: React.FC<PlanEntryCardProps> = ({
  entry, idx, total, employees, planningSections,
  isExpanded, fabOptions, isLoadingFabs, effectivePrefillFabId, isEditing,
  sequenceOptions, onToggleExpand, onUpdate, onRemove,
}) => {
  const { data: workstationData, isLoading: isLoadingWorkstations } = useGetWorkStationByPlanningSectionsQuery(
    entry.planning_section_id ? Number(entry.planning_section_id) : 0,
    { skip: !entry.planning_section_id }
  );

  const [workstationReady, setWorkstationReady] = useState(false);

  const workstationsForSection: any[] = useMemo(() => {
    if (!workstationData) return [];
    if (Array.isArray(workstationData)) return workstationData;
    if (Array.isArray((workstationData as any)?.data)) return (workstationData as any).data;
    if (Array.isArray((workstationData as any)?.workstations)) return (workstationData as any).workstations;
    return [];
  }, [workstationData]);

  useEffect(() => {
    if (!isLoadingWorkstations && workstationsForSection.length > 0) {
      setWorkstationReady(true);
    }
  }, [isLoadingWorkstations, workstationsForSection.length]);

  const selectedWorkstation = workstationsForSection.find(w => String(w.id) === entry.workstation_id);
  const allowedOperatorIds: string[] = selectedWorkstation?.operator_ids?.map(String) || [];

  const filteredEmployees = useMemo(() => {
    if (!selectedWorkstation) return employees;
    if (!allowedOperatorIds.length) return employees;
    return employees.filter(emp => allowedOperatorIds.includes(String(emp.id)));
  }, [employees, selectedWorkstation, allowedOperatorIds]);

  // Only reset operator when user actively changes the workstation
  const prevWorkstationId = useRef(entry.workstation_id);
  useEffect(() => {
    const userChanged = prevWorkstationId.current !== entry.workstation_id;
    prevWorkstationId.current = entry.workstation_id;
    if (
      userChanged &&
      !isLoadingWorkstations &&
      workstationsForSection.length > 0 &&
      entry.operator_id &&
      allowedOperatorIds.length > 0 &&
      !allowedOperatorIds.includes(entry.operator_id)
    ) {
      onUpdate({ operator_id: '' });
    }
  }, [entry.workstation_id, isLoadingWorkstations, workstationsForSection.length]);

  const hasSlot = !!(entry.date && entry.start_time && entry.end_time);

  return (
    <Card className="border border-[#ecedf0] rounded-[12px] overflow-hidden">
      <CardHeader
        className="pb-3 border-b border-[#ecedf0] cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ChevronDown
              className={cn('h-4 w-4 text-[#7c8689] transition-transform shrink-0', !isExpanded && '-rotate-90')}
            />
            <CardTitle className="text-[16px] text-[#4b545d] font-semibold truncate">
              {entry.planning_section_id
                ? (planningSections.find(ps => String(ps.id) === entry.planning_section_id)?.plan_name
                  || planningSections.find(ps => String(ps.id) === entry.planning_section_id)?.name
                  || planningSections.find(ps => String(ps.id) === entry.planning_section_id)?.title
                  || `Plan Section ${idx + 1}`)
                : `Plan Section ${idx + 1}`}
            </CardTitle>
            {!isExpanded && hasSlot && (
              <span className="text-xs text-[#7c8689] shrink-0">
                {format(entry.date!, 'MMM d')} · {format(new Date(`1970-01-01T${entry.start_time}`), 'hh:mm a')}–{format(new Date(`1970-01-01T${entry.end_time}`), 'hh:mm a')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
            <Select value={entry.sequence} onValueChange={value => onUpdate({ sequence: value })}>
              <SelectTrigger className="h-7 w-auto text-xs border-[#e2e4ed] rounded-[4px]">
                <SelectValue placeholder="Seq" />
              </SelectTrigger>
              <SelectContent>
                {sequenceOptions.map(num => (
                  <SelectItem key={num} value={String(num)}>Seq: {num}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {total > 1 && (
              <button
                type="button"
                onClick={onRemove}
                className="h-7 w-7 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-5 space-y-5">
          {/* FAB ID */}
          <div>
            <Label className="text-[13px] text-[#4b545d]">FAB ID *</Label>
            {idx === 0 ? (
              <Select
                value={entry.fab_id}
                onValueChange={value => onUpdate({ fab_id: value })}
                disabled={isLoadingFabs || (!!effectivePrefillFabId && !isEditing)}
              >
                <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                  <SelectValue placeholder={isLoadingFabs ? 'Loading FABs…' : 'Select FAB ID'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {fabOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={entry.fab_id}
                disabled
                className="mt-2 h-[42px] bg-[#f9f9f9] border-[#e2e4ed] rounded-[6px] text-[13px]"
              />
            )}
          </div>

          {/* Date */}
          <div>
            <Label className="text-[13px] text-[#4b545d]">Date *</Label>
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
                  onSelect={date => date && onUpdate({ date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-[#7a9705]" />
              <Label className="text-[13px] text-[#4b545d]">Scheduled Time *</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[12px] text-[#7c8689] mb-1">Start</p>
                <Select value={entry.start_time} onValueChange={value => onUpdate({ start_time: value })}>
                  <SelectTrigger className="h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                    <SelectValue placeholder="Select start" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[12px] text-[#7c8689] mb-1">End</p>
                <Select value={entry.end_time} onValueChange={value => onUpdate({ end_time: value })}>
                  <SelectTrigger className="h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                    <SelectValue placeholder="Select end" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_SLOTS.filter(slot => !entry.start_time || slot.value > entry.start_time).map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Planning Section */}
          <div>
            <Label className="text-[13px] text-[#4b545d]">Shop Activity</Label>
            <Select
              value={entry.planning_section_id || undefined}
              onValueChange={value => onUpdate({ planning_section_id: value, workstation_id: '', operator_id: '' })}
            >
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
            <Label className="text-[13px] text-[#4b545d]">Workstation *</Label>
            <Select
              key={workstationReady ? 'ready' : 'loading'}
              value={workstationReady ? (entry.workstation_id || undefined) : undefined}
              onValueChange={value => onUpdate({ workstation_id: value, operator_id: '' })}
              disabled={!entry.planning_section_id || isLoadingWorkstations}
            >
              <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                <SelectValue
                  placeholder={
                    isLoadingWorkstations ? 'Loading workstations…' :
                      !entry.planning_section_id ? 'Select a section first' :
                        workstationsForSection.length === 0 ? 'No workstations for this section' :
                          'Select workstation'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {workstationsForSection.map((ws: any) => (
                  <SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          <div>
            <Label className="text-[13px] text-[#4b545d]">Operator *</Label>
            <Select
              value={entry.operator_id || undefined}
              onValueChange={value => onUpdate({ operator_id: value })}
              disabled={!entry.workstation_id}
            >
              <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                <SelectValue
                  placeholder={
                    !entry.workstation_id ? 'Select a workstation first' :
                      filteredEmployees.length === 0 ? 'No operators assigned to this workstation' :
                        'Select operator'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No operators assigned to this workstation
                  </div>
                ) : (
                  filteredEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {`${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.trim() || emp.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-[13px] text-[#4b545d]">Description / Notes</Label>
            <Textarea
              placeholder="Add any notes about this plan..."
              value={entry.notes}
              onChange={e => onUpdate({ notes: e.target.value })}
              className="mt-2 min-h-24 border-[#e2e4ed] rounded-[6px] text-[13px]"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

interface CreatePlanPageProps {
  onBack?: () => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  prefillPlanSectionId?: number;
  onEventCreated?: () => void;
  hideBackButton?: boolean;
}

const CreatePlanPage: React.FC<CreatePlanPageProps> = ({
  onBack,
  selectedDate: propSelectedDate,
  selectedTimeSlot,
  selectedEvent,
  prefillFabId: propPrefillFabId,
  prefillPlanSectionId,
  onEventCreated,
  hideBackButton = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFabId = searchParams.get('fabId');
  const effectivePrefillFabId = propPrefillFabId || urlFabId || '';

  const effectiveEvent = selectedEvent;

  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const prefillSectionIdStr = prefillPlanSectionId != null ? String(prefillPlanSectionId) : undefined;

  // ✅ FIX 1: Memoize emptyEntry with useCallback so it has a stable reference
  const emptyEntry = useCallback((): PlanEntry => ({
    fab_id: effectivePrefillFabId || '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    start_time: selectedTimeSlot || '',
    end_time: '',
    planning_section_id: prefillSectionIdStr,
    date: propSelectedDate ?? undefined,
    sequence: '1',
  }), [effectivePrefillFabId, selectedTimeSlot, prefillSectionIdStr, propSelectedDate]);

  // ✅ FIX 2: Use lazy initializer for useState to avoid calling emptyEntry on every render
  const [entries, setEntries] = useState<PlanEntry[]>(() => [emptyEntry()]);

  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  const [updateShopPlan] = useUpdateShopPlanMutation();
  const [, { isLoading: isAutoScheduling }] = useCreateShopSuggestionMutation();

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections: any[] = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees: any[] = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);

  const { data: allFabsData, isLoading: isLoadingFabs } = useGetFabsQuery({ limit: 1000, current_stage: 'cut_list' });

  const { data: allWorkstationsData } = useGetWorkstationsQuery();
  const allWorkstations: any[] = allWorkstationsData?.data || (Array.isArray(allWorkstationsData) ? allWorkstationsData : []);

  const fabOptions = useMemo(() => {
    const fabs = allFabsData?.data || (Array.isArray(allFabsData) ? allFabsData : []);
    return fabs.map((fab: any) => ({
      value: String(fab.id),
      label: `Fab ${fab.id} - (${fab.fab_type || 'N/A'})`,
    }));
  }, [allFabsData]);

  const selectedFabId = entries[0]?.fab_id;
  const selectedFab = useMemo(() => {
    if (!allFabsData || !selectedFabId) return null;
    const fabs = allFabsData?.data || (Array.isArray(allFabsData) ? allFabsData : []);
    return fabs.find((fab: any) => String(fab.id) === selectedFabId) || null;
  }, [allFabsData, selectedFabId]);

  // ✅ FIX 3: Use stable boolean flags instead of array/object references in useEffect deps
  const employeesLoaded = employees.length > 0;
  const workstationsLoaded = allWorkstations.length > 0;
  const sectionsLoaded = planningSections.length > 0;
  const fabsLoaded = !!allFabsData;

  useEffect(() => {
    if (!effectiveEvent) {
      setEntries([emptyEntry()]);
      return;
    }

    // Wait for ALL required data before populating edit form
    if (!employeesLoaded || !workstationsLoaded || !sectionsLoaded || !fabsLoaded) {
      return;
    }

    const ev: any = effectiveEvent;

    console.log('populating event with', ev);

    const fabId = ev.fab_id ?? '';
    const workstationId = ev.workstation_id ?? '';
    const operatorId = ev.operator_id ?? '';
    const planningSectionId = ev.planning_section_id ?? null;
    const scheduledStart = ev.scheduled_start_date ?? null;
    const scheduledEnd = ev.scheduled_end_date ?? null;
    const notes = ev.notes ?? '';
    const sequence = ev.sequence ?? 1;
    const estimatedHours = ev.estimated_hours ?? 0;

    const startDate = scheduledStart ? new Date(scheduledStart) : new Date();

    let endTime = '';
    if (scheduledEnd) {
      endTime = format(new Date(scheduledEnd), 'HH:mm');
    } else if (estimatedHours) {
      endTime = format(
        new Date(startDate.getTime() + estimatedHours * 3_600_000),
        'HH:mm'
      );
    }

    const finalEntry: PlanEntry = {
      id: ev.id,
      fab_id: fabId ? String(fabId) : '',
      workstation_id: workstationId ? String(workstationId) : '',
      operator_id: operatorId ? String(operatorId) : '',
      notes: notes ? String(notes) : '',
      start_time: format(startDate, 'HH:mm'),
      end_time: endTime || '',
      planning_section_id:
        planningSectionId !== null && planningSectionId !== undefined
          ? String(planningSectionId)
          : prefillSectionIdStr || '',
      date: startDate,
      sequence: sequence ? String(sequence) : '1',
    };

    setEntries([finalEntry]);
    setExpandedCards({ 0: true });

  }, [
    effectiveEvent,
    employeesLoaded,
    workstationsLoaded,
    sectionsLoaded,   // ✅ boolean — stable, no reference churn
    fabsLoaded,       // ✅ boolean — stable, no reference churn
    emptyEntry,       // ✅ stable via useCallback
  ]);

  const sequenceOptions = useMemo(
    () => Array.from({ length: Math.max(3, entries.length) }, (_, i) => i + 1),
    [entries.length]
  );

  // ✅ FIX 4: Memoize addEntry and resetForm so they use the stable emptyEntry
  const addEntry = useCallback(() => {
    setEntries(p => {
      const e = emptyEntry();
      if (p[0]?.fab_id) e.fab_id = p[0].fab_id;
      e.sequence = String(p.length + 1);
      return [...p, e];
    });
  }, [emptyEntry]);

  const removeEntry = useCallback((idx: number) => {
    setEntries(p => {
      const next = p.filter((_, i) => i !== idx);
      return next.map((e, i) => ({ ...e, sequence: String(i + 1) }));
    });
  }, []);

  const resetForm = useCallback(() => {
    setEntries([emptyEntry()]);
  }, [emptyEntry]);

  const handleBack = useCallback(() => {
    resetForm();
    if (onBack) onBack();
    else navigate(-1);
  }, [resetForm, onBack, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const entry of entries) {
      if (!entry.fab_id) { toast.error('FAB ID is required'); return; }
      if (!entry.operator_id) { toast.error('Operator is required'); return; }
      if (!entry.workstation_id) { toast.error('Workstation is required'); return; }
      if (!entry.start_time) { toast.error('Start time is required'); return; }
      if (!entry.end_time) { toast.error('End time is required'); return; }
      if (!entry.date) { toast.error('Date is required'); return; }
    }

    try {
      const groups: Record<string, PlanEntry[]> = {};
      const updates: PlanEntry[] = [];
      for (const entry of entries) {
        if (entry.id) { updates.push(entry); continue; }
        const key = String(entry.fab_id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
      }

      for (const fabId in groups) {
        let totalEst = 0;
        const stages = groups[fabId].map((entry, idx) => {
          const d = format(entry.date!, 'yyyy-MM-dd');
          const start = `${d}T${entry.start_time}:00`;
          const end = `${d}T${entry.end_time}:00`;
          const hrs = Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000) * 100) / 100;
          totalEst += hrs;
          return {
            workstation_id: Number(entry.workstation_id),
            planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
            operator_ids: [Number(entry.operator_id)],
            estimated_hours: hrs,
            scheduled_start: start,
            scheduled_end: end,
            notes: entry.notes || undefined,
            sequence: Number(entry.sequence) || (idx + 1),
          };
        });
        await createShopPlan({ fab_id: Number(fabId), estimated_hours: totalEst, status_id: 1, stages } as any).unwrap();
      }

      for (const entry of updates) {
        const d = format(entry.date!, 'yyyy-MM-dd');
        const start = `${d}T${entry.start_time}:00`;
        const end = `${d}T${entry.end_time}:00`;
        const hrs = Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000) * 100) / 100;
        await updateShopPlan({
          plan_id: Number(entry.id),
          data: {
            stage: {
              workstation_id: Number(entry.workstation_id),
              planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
              operator_ids: [Number(entry.operator_id)],
              estimated_hours: hrs,
              scheduled_start: start,
              scheduled_end: end,
              notes: entry.notes || undefined,
              sequence: Number(entry.sequence) || 1,
            },
          },
        } as any).unwrap();
      }

      toast.success('Plans scheduled successfully');
      resetForm();
      onEventCreated?.();
      handleBack();
    } catch (error: any) {
      const msg = error?.data?.detail?.message || 'Failed to create/update Plan';
      toast.error(msg);
    }
  };

  const isEditing = !!(effectiveEvent);

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[#dfdfdf]">
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <button
                onClick={handleBack}
                className="h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] bg-white flex items-center justify-center gap-2 text-[#4b545d] hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[14px] font-semibold">Back</span>
              </button>
            )}
            <p className="text-[28px] leading-[32px] text-black font-semibold">
              {isEditing ? 'Edit Plan' : 'Create Plan'}
            </p>
          </div>

          {entries[0]?.fab_id && (
            <div className="flex items-center gap-2 bg-[#f0f4e8] border border-[#9cc15e] rounded-[8px] px-4 py-2">
              <span className="text-[13px] text-[#4a4d59]">FAB ID</span>
              <span className="text-[20px] text-[#7a9705] font-semibold">#{entries[0].fab_id}</span>
            </div>
          )}

          <button
            onClick={() => navigate(`/shop/auto-schedule?fabId=${entries[0]?.fab_id || ''}`)}
            className="h-[44px] w-[150px] rounded-[8px] flex items-center justify-center gap-2 shrink-0 text-white font-semibold text-[14px]"
            style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
          >
            <Plus className="h-4 w-4" />
            Auto Schedule
          </button>
        </div>
      </div>

      <div className="px-10 py-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FAB Details */}
          {selectedFabId && selectedFab && (
            <Card className="border border-[#ecedf0] rounded-[12px] mb-6">
              <CardHeader className="pb-3 border-b border-[#ecedf0]">
                <CardTitle className="text-[16px] text-[#4b545d] font-semibold">FAB Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Job No', val: selectedFab.job_details?.job_number },
                    { label: 'Job Name', val: selectedFab.job_details?.name },
                    { label: 'Account Name', val: selectedFab.account_name },
                    { label: 'No. of Pieces', val: selectedFab.no_of_pieces || 0 },
                    { label: 'Total Sq Ft', val: selectedFab.total_sqft?.toFixed(2) || '0.00' },
                    { label: 'WJ LinFt', val: selectedFab.wj_linft?.toFixed(2) || '0.00' },
                    { label: 'Edging LinFt', val: selectedFab.edging_linft?.toFixed(2) || '0.00' },
                    { label: 'CNC LinFt', val: selectedFab.cnc_linft?.toFixed(2) || '0.00' },
                    { label: 'Miter LinFt', val: selectedFab.miter_linft?.toFixed(2) || '0.00' },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <Label className="text-xs text-[#7c8689]">{label}</Label>
                      <p className="text-sm font-medium text-[#4b545d]">{val || '-'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan entry cards */}
          {entries.map((entry, idx) => (
            <PlanEntryCard
              key={idx}
              entry={entry}
              idx={idx}
              total={entries.length}
              employees={employees}
              planningSections={planningSections}
              isExpanded={expandedCards[idx] !== false}
              fabOptions={fabOptions}
              isLoadingFabs={isLoadingFabs}
              effectivePrefillFabId={effectivePrefillFabId}
              isEditing={isEditing}
              sequenceOptions={sequenceOptions}
              onToggleExpand={() => setExpandedCards(p => ({ ...p, [idx]: !(p[idx] !== false) }))}
              onUpdate={patch => {
                setEntries(p => p.map((e, i) => {
                  if (i === idx) return { ...e, ...patch };
                  if (idx === 0 && patch.fab_id !== undefined) return { ...e, fab_id: patch.fab_id };
                  return e;
                }));
              }}
              onRemove={() => removeEntry(idx)}
            />
          ))}

          {/* Add stage */}
          <button
            type="button"
            onClick={addEntry}
            className="w-full h-[44px] border border-dashed border-[#e2e4ed] rounded-[8px] flex items-center justify-center gap-2 text-[#78829d] hover:border-[#9cc15e] hover:text-[#7a9705] hover:bg-[#f0f4e8] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[14px] font-semibold">Add Another Stage</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 pb-8">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 h-[44px] border border-[#e2e4ed] rounded-[8px] text-[14px] text-[#4b545d] hover:bg-gray-50 transition-colors"
              disabled={isLoading || isAutoScheduling}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center gap-2 text-white text-[14px] font-semibold disabled:opacity-60"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
              disabled={isLoading || isAutoScheduling}
            >
              {isLoading
                ? <><LoaderCircle className="h-4 w-4 animate-spin" />Scheduling…</>
                : isEditing ? 'Update Plan' : 'Schedule Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlanPage;