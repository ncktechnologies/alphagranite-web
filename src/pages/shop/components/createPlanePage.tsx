import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, ChevronDown, LoaderCircle, Plus, X } from 'lucide-react';
import { format, addHours, differenceInMinutes, setHours, setMinutes } from 'date-fns';
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
import { useGetFabsQuery, useGetFabByIdQuery } from '@/store/api/job';

export const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    if (h === 12) continue;
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

// Field-to-keyword mapping
const FAB_STAGE_FIELDS: { keyword: string; field: string; label: string }[] = [
  { keyword: 'cut', field: 'total_sqft', label: 'Cut' },
  { keyword: 'wj', field: 'wj_linft', label: 'WJ' },
  { keyword: 'edg', field: 'edging_linft', label: 'Edging' },
  { keyword: 'mit', field: 'miter_linft', label: 'Miter' },
  { keyword: 'cnc', field: 'cnc_linft', label: 'CNC' },
  { keyword: 'resurface', field: 'resurface_linft', label: 'Resurfacing' },
];

const RESURFACE_FAB_TYPE = 'RESURFACE';
const RESURFACE_SECTION_NAME = 'RESURFACING';

interface PlanEntry {
  id?: number;
  fab_id: string;
  workstation_id: string;
  operator_id: string;
  notes: string;
  start_date: Date | undefined;
  start_time: string;
  end_date: Date | undefined;
  end_time: string;
  estimated_hours: string;
  planning_section_id?: string;
  sequence: string;
}

// -----------------------------------------------------------------------------
// Helper: create a Date object that represents the local datetime
// (no UTC conversion – the date will be interpreted as local time)
// -----------------------------------------------------------------------------
function createLocalDateTime(date: Date | undefined, time: string): Date | null {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // Using the local‑time constructor: year, monthIndex, day, hours, minutes
  return new Date(year, month, day, hours, minutes);
}

// -----------------------------------------------------------------------------
// Helper: parse an API datetime string (e.g., "2025-03-15T10:30:00") as local time
// -----------------------------------------------------------------------------
function parseLocalDateTime(dateTimeStr: string): Date | null {
  if (!dateTimeStr) return null;
  const [datePart, timePart] = dateTimeStr.split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

// -----------------------------------------------------------------------------
// PlanEntryCard component (unchanged except using the new helper)
// -----------------------------------------------------------------------------
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
  disableShopActivity: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<PlanEntry>) => void;
  onRemove: () => void;
}

const PlanEntryCard: React.FC<PlanEntryCardProps> = ({
  entry, idx, total, employees, planningSections,
  isExpanded, fabOptions, isLoadingFabs, effectivePrefillFabId, isEditing,
  sequenceOptions, disableShopActivity, onToggleExpand, onUpdate, onRemove,
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

  const hasSlot = !!(entry.start_date && entry.start_time && entry.end_date && entry.end_time);

  // Recalculate estimated hours using local datetime helper
  const recalcEstimatedHours = useCallback((startDate: Date | undefined, startTime: string, endDate: Date | undefined, endTime: string): string => {
    const startDateTime = createLocalDateTime(startDate, startTime);
    const endDateTime = createLocalDateTime(endDate, endTime);
    if (startDateTime && endDateTime && endDateTime > startDateTime) {
      const minutes = differenceInMinutes(endDateTime, startDateTime);
      const hours = (minutes / 60).toFixed(2);
      return hours;
    }
    return '';
  }, []);

  const updateFromEndDateTime = useCallback((newEndDate: Date | undefined, newEndTime: string) => {
    const newHours = recalcEstimatedHours(entry.start_date, entry.start_time, newEndDate, newEndTime);
    onUpdate({ end_date: newEndDate, end_time: newEndTime, estimated_hours: newHours });
  }, [entry.start_date, entry.start_time, onUpdate, recalcEstimatedHours]);

  const handleStartDateTimeChange = useCallback((newStartDate: Date | undefined, newStartTime: string) => {
    const newHours = recalcEstimatedHours(newStartDate, newStartTime, entry.end_date, entry.end_time);
    onUpdate({ start_date: newStartDate, start_time: newStartTime, estimated_hours: newHours });
  }, [entry.end_date, entry.end_time, onUpdate, recalcEstimatedHours]);

  const onEndTimeChange = useCallback((value: string) => {
    updateFromEndDateTime(entry.end_date, value);
  }, [entry.end_date, updateFromEndDateTime]);

  const onEndDateChange = useCallback((date: Date | undefined) => {
    updateFromEndDateTime(date, entry.end_time);
  }, [entry.end_time, updateFromEndDateTime]);

  const onStartTimeChange = useCallback((value: string) => {
    handleStartDateTimeChange(entry.start_date, value);
  }, [entry.start_date, handleStartDateTimeChange]);

  const onStartDateChange = useCallback((date: Date | undefined) => {
    handleStartDateTimeChange(date, entry.start_time);
  }, [entry.start_time, handleStartDateTimeChange]);

  return (
    <Card className="border border-[#ecedf0] rounded-[12px] overflow-hidden">
      <CardHeader
        className="pb-3 border-b border-[#ecedf0] cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
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
                {format(entry.start_date!, 'MMM d')} {format(new Date(`1970-01-01T${entry.start_time}`), 'hh:mm a')} – {format(entry.end_date!, 'MMM d')} {format(new Date(`1970-01-01T${entry.end_time}`), 'hh:mm a')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto pl-4" onClick={e => e.stopPropagation()}>
            <Select value={entry.sequence} onValueChange={value => onUpdate({ sequence: value })}>
              <SelectTrigger className="h-7 w-auto text-[13px] border-[#e2e4ed] rounded-[4px] font-bold">
                <SelectValue placeholder="Seq" />
              </SelectTrigger>
              <SelectContent>
                {sequenceOptions.map(num => (
                  <SelectItem key={num} value={String(num)}>Seq: {num}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {total > 1 && !disableShopActivity && (
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
          {!effectivePrefillFabId && (
            <div>
              <Label className="text-[13px] text-[#4b545d]">FAB ID *</Label>
              <Select
                value={entry.fab_id}
                onValueChange={value => onUpdate({ fab_id: value })}
                disabled={isLoadingFabs}
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
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-[13px] text-[#4b545d]">Shop Activity</Label>
              <Select
                value={entry.planning_section_id || undefined}
                onValueChange={value => onUpdate({ planning_section_id: value, workstation_id: '', operator_id: '' })}
                disabled={disableShopActivity}
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

            {/* Estimated hours hidden – read‑only, calculated automatically */}
            <div className="hidden">
              <Label className="text-[13px] text-[#4b545d]">Est. Hours (auto)</Label>
              <Input
                type="text"
                value={entry.estimated_hours || ''}
                readOnly
                className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px] bg-gray-50"
              />
            </div>

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
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {workstationsForSection.map((ws: any) => (
                    <SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <SelectContent className="max-h-[200px] overflow-y-auto">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[13px] text-[#4b545d]">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'mt-2 w-full h-[42px] px-3 text-left border border-[#e2e4ed] rounded-[6px] text-[13px] flex items-center gap-2',
                      !entry.start_date && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="h-4 w-4 text-[#7a9705]" />
                    {entry.start_date ? format(entry.start_date, 'PPP') : <span>Pick start date</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={entry.start_date}
                    onSelect={onStartDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-[13px] text-[#4b545d]">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'mt-2 w-full h-[42px] px-3 text-left border border-[#e2e4ed] rounded-[6px] text-[13px] flex items-center gap-2',
                      !entry.end_date && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="h-4 w-4 text-[#7a9705]" />
                    {entry.end_date ? format(entry.end_date, 'PPP') : <span>Pick end date</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={entry.end_date}
                    onSelect={onEndDateChange}
                    initialFocus
                    disabled={date => entry.start_date ? date < entry.start_date : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[13px] text-[#4b545d]">Start Time</Label>
              <Select value={entry.start_time} onValueChange={onStartTimeChange}>
                <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                  <SelectValue placeholder="Select start" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[13px] text-[#4b545d]">End Time</Label>
              <Select value={entry.end_time} onValueChange={onEndTimeChange}>
                <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                  <SelectValue placeholder="Select end" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------
interface CreatePlanPageProps {
  onBack?: () => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  prefillPlanSectionId?: number;
  onEventCreated?: () => void;
  hideBackButton?: boolean;
  hideAddStageButton?: boolean;
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
  hideAddStageButton = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFabId = searchParams.get('fabId');
  const effectivePrefillFabId = propPrefillFabId || urlFabId || '';
  const effectiveEvent = selectedEvent;
  const prefillSectionIdStr = prefillPlanSectionId != null ? String(prefillPlanSectionId) : undefined;

  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [entries, setEntries] = useState<PlanEntry[]>([]);

  const { data: fabData } = useGetFabByIdQuery(
    effectivePrefillFabId ? Number(effectivePrefillFabId) : 0,
    { skip: !effectivePrefillFabId }
  );
  const fabDetails = fabData?.data ?? fabData;

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections: any[] = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees: any[] = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);

  const { data: allFabsData, isLoading: isLoadingFabs } = useGetFabsQuery({ limit: 1000 });
  const { data: allWorkstationsData } = useGetWorkstationsQuery();
  const allWorkstations: any[] = allWorkstationsData?.data || (Array.isArray(allWorkstationsData) ? allWorkstationsData : []);

  const allFabsList = useMemo(() => {
    return allFabsData?.data || (Array.isArray(allFabsData) ? allFabsData : []);
  }, [allFabsData]);

  const fabOptions = useMemo(() => {
    return allFabsList.map((fab: any) => ({
      value: String(fab.id),
      label: `Fab ${fab.id} - (${fab.fab_type || 'N/A'})`,
    }));
  }, [allFabsList]);

  const employeesLoaded = employees.length > 0;
  const workstationsLoaded = allWorkstations.length > 0;
  const sectionsLoaded = planningSections.length > 0;
  const fabsLoaded = !!allFabsData;
  const dataReady = !isLoadingFabs && sectionsLoaded && fabsLoaded;

  const isResurfaceFab = useCallback((fab: any) => {
    return fab && (fab.fab_type || '').toUpperCase() === RESURFACE_FAB_TYPE;
  }, []);

  const getResurfaceSection = useCallback((sections: any[]) => {
    return sections.find(ps =>
      (ps.plan_name || ps.name || '').toUpperCase() === RESURFACE_SECTION_NAME
    ) || null;
  }, []);

  const findSectionByKeyword = useCallback((keyword: string) => {
    return planningSections.find(ps => {
      const name = (ps.name || ps.plan_name || ps.title || '').toLowerCase();
      return name.includes(keyword);
    }) || null;
  }, [planningSections]);

  const getActiveStagesFromFab = useCallback((fab: any) => {
    if (!fab || !planningSections.length) return [];
    if (isResurfaceFab(fab)) {
      const resurfaceSection = getResurfaceSection(planningSections);
      if (!resurfaceSection) return [];
      return [{
        keyword: 'resurface',
        field: 'total_sqft',
        label: resurfaceSection.name || resurfaceSection.plan_name || resurfaceSection.title || 'Resurfacing',
        section_id: resurfaceSection.id,
      }];
    }
    return FAB_STAGE_FIELDS
      .map(s => {
        const section = findSectionByKeyword(s.keyword);
        return section ? { ...s, section_id: section.id } : null;
      })
      .filter((s): s is NonNullable<typeof s> =>
        s !== null && typeof fab?.[s.field] === 'number' && fab[s.field] > 0
      );
  }, [planningSections, isResurfaceFab, getResurfaceSection, findSectionByKeyword]);

  // Recalculate estimated hours using local helper
  const recalcEntryHours = useCallback((entry: PlanEntry): string => {
    const start = createLocalDateTime(entry.start_date, entry.start_time);
    const end = createLocalDateTime(entry.end_date, entry.end_time);
    if (start && end && end > start) {
      const minutes = (end.getTime() - start.getTime()) / 60000;
      return (minutes / 60).toFixed(2);
    }
    return '';
  }, []);

  const createEmptyEntry = useCallback((fabIdOverride?: string): PlanEntry => {
    let sectionId = prefillSectionIdStr;
    const fabIdToUse = fabIdOverride !== undefined ? fabIdOverride : effectivePrefillFabId;
    if (fabIdToUse && allFabsList.length && planningSections.length) {
      const fab = allFabsList.find(f => String(f.id) === fabIdToUse);
      if (fab && isResurfaceFab(fab)) {
        const resurfaceSection = getResurfaceSection(planningSections);
        if (resurfaceSection) sectionId = String(resurfaceSection.id);
      }
    }
    return {
      fab_id: fabIdToUse || '',
      workstation_id: '',
      operator_id: '',
      notes: '',
      start_date: propSelectedDate ?? undefined,
      start_time: selectedTimeSlot || '',
      end_date: undefined,
      end_time: '',
      estimated_hours: '',
      planning_section_id: sectionId,
      sequence: '1',
    };
  }, [effectivePrefillFabId, selectedTimeSlot, prefillSectionIdStr, propSelectedDate, allFabsList, planningSections, isResurfaceFab, getResurfaceSection]);

  useEffect(() => {
    if (!effectiveEvent && dataReady && entries.length === 0) {
      if (effectivePrefillFabId && fabDetails && !hideAddStageButton) {
        const activeStages = getActiveStagesFromFab(fabDetails);
        if (activeStages.length > 0) {
          const autoEntries = activeStages.map((s, i) => ({
            ...createEmptyEntry(effectivePrefillFabId),
            planning_section_id: String(s.section_id),
            sequence: String(i + 1),
          }));
          setEntries(autoEntries);
          const expandedState: Record<number, boolean> = {};
          autoEntries.forEach((_, i) => { expandedState[i] = true; });
          setExpandedCards(expandedState);
          return;
        }
      }
      setEntries([createEmptyEntry(effectivePrefillFabId)]);
    }
  }, [effectiveEvent, dataReady, entries.length, createEmptyEntry, effectivePrefillFabId, fabDetails, hideAddStageButton, getActiveStagesFromFab]);

  // Edit mode: parse API datetime strings as local
  useEffect(() => {
    if (!effectiveEvent) return;
    if (!employeesLoaded || !workstationsLoaded || !sectionsLoaded || !fabsLoaded) return;

    const ev = effectiveEvent;
    const startDate = ev.scheduled_start_date ? parseLocalDateTime(ev.scheduled_start_date) : undefined;
    let endDate: Date | undefined = undefined;
    if (ev.scheduled_end_date) {
      endDate = parseLocalDateTime(ev.scheduled_end_date);
    } else if (startDate && ev.estimated_hours) {
      endDate = new Date(startDate.getTime() + ev.estimated_hours * 3_600_000);
    } else if (startDate) {
      endDate = startDate;
    }

    let planningSectionId = ev.planning_section_id != null ? String(ev.planning_section_id) : '';
    if (!planningSectionId) {
      const fab = allFabsList.find(f => String(f.id) === String(ev.fab_id));
      if (fab && isResurfaceFab(fab)) {
        const resurfaceSection = getResurfaceSection(planningSections);
        if (resurfaceSection) planningSectionId = String(resurfaceSection.id);
      }
    }

    const startTimeStr = startDate ? format(startDate, 'HH:mm') : '';
    const endTimeStr = endDate ? format(endDate, 'HH:mm') : '';

    const finalEntry: PlanEntry = {
      id: ev.id,
      fab_id: ev.fab_id != null ? String(ev.fab_id) : '',
      workstation_id: ev.workstation_id != null ? String(ev.workstation_id) : '',
      operator_id: ev.operator_id != null ? String(ev.operator_id) : '',
      notes: ev.notes || '',
      start_date: startDate,
      start_time: startTimeStr,
      end_date: endDate,
      end_time: endTimeStr,
      estimated_hours: ev.estimated_hours != null ? String(ev.estimated_hours) : '',
      planning_section_id: planningSectionId || prefillSectionIdStr || '',
      sequence: ev.sequence != null ? String(ev.sequence) : '1',
    };

    setEntries([finalEntry]);
    setExpandedCards({ 0: true });
  }, [effectiveEvent, employeesLoaded, workstationsLoaded, sectionsLoaded, fabsLoaded, allFabsList, planningSections, isResurfaceFab, getResurfaceSection, prefillSectionIdStr]);

  const getNextAvailableSequence = useCallback((used: Set<number>) => {
    let seq = 1;
    while (used.has(seq)) seq++;
    return seq;
  }, []);

  const selectedFab = useMemo(() => {
    if (!allFabsList.length || !entries[0]?.fab_id) return null;
    return allFabsList.find(f => String(f.id) === entries[0].fab_id) || null;
  }, [allFabsList, entries[0]?.fab_id]);

  const currentIsResurface = selectedFab ? isResurfaceFab(selectedFab) : false;

  const updateEntry = useCallback((idx: number, patch: Partial<PlanEntry>) => {
    setEntries(prev => {
      const newEntries = [...prev];
      const target = newEntries[idx];

      if (patch.sequence !== undefined) {
        const newSeq = Number(patch.sequence);
        if (!isNaN(newSeq)) {
          const conflictIdx = newEntries.findIndex((e, i) =>
            i !== idx && Number(e.sequence) === newSeq
          );
          if (conflictIdx !== -1) {
            const oldSeq = Number(target.sequence);
            newEntries[conflictIdx] = { ...newEntries[conflictIdx], sequence: String(oldSeq) };
            newEntries[idx] = { ...newEntries[idx], sequence: String(newSeq) };
            const sortedEntries = [...newEntries].sort((a, b) => {
              const seqA = Number(a.sequence) || 0;
              const seqB = Number(b.sequence) || 0;
              return seqA - seqB;
            });
            return sortedEntries;
          }
        }
      }

      if (idx === 0 && patch.fab_id !== undefined) {
        const newFab = allFabsList.find(f => String(f.id) === patch.fab_id) ?? null;
        let newSectionId = target.planning_section_id;
        if (newFab && isResurfaceFab(newFab)) {
          const resurfaceSection = getResurfaceSection(planningSections);
          newSectionId = resurfaceSection ? String(resurfaceSection.id) : newSectionId;
        } else if (!newFab || !isResurfaceFab(newFab)) {
          newSectionId = prefillSectionIdStr ?? newSectionId;
        }
        if (newFab && !hideAddStageButton) {
          const activeStages = getActiveStagesFromFab(newFab);
          if (activeStages.length > 0) {
            const autoEntries = activeStages.map((s, i) => ({
              ...createEmptyEntry(patch.fab_id),
              planning_section_id: String(s.section_id),
              sequence: String(i + 1),
            }));
            const expandedState: Record<number, boolean> = {};
            autoEntries.forEach((_, i) => { expandedState[i] = true; });
            setExpandedCards(expandedState);
            return autoEntries;
          }
        }
        const updated = newEntries.map(e => ({
          ...e,
          fab_id: patch.fab_id!,
          planning_section_id: newSectionId ?? e.planning_section_id,
          workstation_id: '',
          operator_id: '',
        }));
        return updated.map(e => ({ ...e, estimated_hours: recalcEntryHours(e) }));
      }
      const updatedEntry = { ...target, ...patch };
      if (patch.start_date !== undefined || patch.start_time !== undefined || patch.end_date !== undefined || patch.end_time !== undefined) {
        updatedEntry.estimated_hours = recalcEntryHours(updatedEntry);
      }
      newEntries[idx] = updatedEntry;
      return newEntries;
    });
  }, [allFabsList, planningSections, isResurfaceFab, getResurfaceSection, prefillSectionIdStr, hideAddStageButton, getActiveStagesFromFab, createEmptyEntry, recalcEntryHours]);

  const addEntry = useCallback(() => {
    if (currentIsResurface) return;
    setEntries(prev => {
      const usedSequences = new Set(prev.map(e => Number(e.sequence)).filter(s => !isNaN(s)));
      const nextSeq = getNextAvailableSequence(usedSequences);
      const newEntry = createEmptyEntry(prev[0]?.fab_id);
      newEntry.sequence = String(nextSeq);
      return [...prev, newEntry];
    });
  }, [currentIsResurface, createEmptyEntry, getNextAvailableSequence]);

  const removeEntry = useCallback((idx: number) => {
    if (currentIsResurface) return;
    setEntries(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((e, i) => ({ ...e, sequence: String(i + 1) }));
    });
  }, [currentIsResurface]);

  const resetForm = useCallback(() => {
    setEntries([createEmptyEntry(effectivePrefillFabId)]);
  }, [createEmptyEntry, effectivePrefillFabId]);

  const handleBack = useCallback(() => {
    resetForm();
    if (onBack) onBack();
    else navigate(-1);
  }, [resetForm, onBack, navigate]);

  const [createShopPlan, mutationState] = useCreateShopPlansMutation();
  const isLoading = mutationState.isLoading || false;
  const [updateShopPlan] = useUpdateShopPlanMutation();
  const [, { isLoading: isAutoScheduling }] = useCreateShopSuggestionMutation();

  // ---------------------------------------------------------------------------
  // Submit: format datetimes as local ISO string WITHOUT timezone offset
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const entry of entries) {
      if (!entry.fab_id) { toast.error('FAB ID is required'); return; }
      if (!entry.operator_id) { toast.error('Operator is required'); return; }
      if (!entry.workstation_id) { toast.error('Workstation is required'); return; }
      if (!entry.start_date) { toast.error('Start date is required'); return; }
      if (!entry.start_time) { toast.error('Start time is required'); return; }
      if (!entry.end_date) { toast.error('End date is required'); return; }
      if (!entry.end_time) { toast.error('End time is required'); return; }
      if (!entry.estimated_hours || parseFloat(entry.estimated_hours) <= 0) {
        toast.error('Estimated hours must be positive (auto‑calculated from start/end)'); return;
      }
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
          const startDateTime = createLocalDateTime(entry.start_date, entry.start_time)!;
          const endDateTime = createLocalDateTime(entry.end_date, entry.end_time)!;
          const hrs = parseFloat(entry.estimated_hours);
          totalEst += hrs;
          // Format as local datetime without 'Z' (e.g., "2025-03-15T10:30:00")
          const scheduledStart = format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss");
          const scheduledEnd = format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss");
          return {
            workstation_id: Number(entry.workstation_id),
            planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
            operator_ids: [Number(entry.operator_id)],
            estimated_hours: hrs,
            scheduled_start: scheduledStart,
            scheduled_end: scheduledEnd,
            notes: entry.notes || undefined,
            sequence: Number(entry.sequence) || (idx + 1),
          };
        });
        await createShopPlan({ fab_id: Number(fabId), estimated_hours: totalEst, status_id: 1, stages } as any).unwrap();
      }

      for (const entry of updates) {
        const startDateTime = createLocalDateTime(entry.start_date, entry.start_time)!;
        const endDateTime = createLocalDateTime(entry.end_date, entry.end_time)!;
        const hrs = parseFloat(entry.estimated_hours);
        const scheduledStart = format(startDateTime, "yyyy-MM-dd'T'HH:mm:ss");
        const scheduledEnd = format(endDateTime, "yyyy-MM-dd'T'HH:mm:ss");
        await updateShopPlan({
          plan_id: Number(entry.id),
          data: {
            stage: {
              workstation_id: Number(entry.workstation_id),
              planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
              operator_ids: [Number(entry.operator_id)],
              estimated_hours: hrs,
              scheduled_start: scheduledStart,
              scheduled_end: scheduledEnd,
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
      console.error(error?.data?.message || 'Failed to create/update plan');
    }
  };

  const isEditing = !!effectiveEvent;
  const sequenceOptions = useMemo(
    () => Array.from({ length: Math.max(3, entries.length) }, (_, i) => i + 1),
    [entries.length]
  );

  const isFormReady = effectiveEvent ? entries.length > 0 : (dataReady && entries.length > 0);

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[#dfdfdf]">
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex items-center gap-4">
            <p className="text-[28px] leading-[32px] text-black font-semibold">
              {isEditing ? 'Edit Plan' : 'Create Plan'}
            </p>
            {entries[0]?.fab_id && (
              <div className="flex items-center gap-2 bg-[#f0f4e8] border border-[#9cc15e] rounded-[8px] px-4 py-2">
                <span className="text-[13px] text-[#4a4d59]">FAB ID</span>
                <span className="text-[20px] text-[#7a9705] font-semibold">#{entries[0].fab_id}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/shop/auto-schedule?fabId=${entries[0]?.fab_id || ''}`)}
              className="h-[44px] w-[150px] rounded-[8px] flex items-center justify-center gap-2 shrink-0 text-white font-semibold text-[14px]"
              style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
            >
              <Plus className="h-4 w-4" />
              Auto Schedule
            </button>
            {!hideBackButton && (
              <button
                onClick={handleBack}
                className="h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] bg-white flex items-center justify-center gap-2 text-[#4b545d] hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[14px] font-semibold">Back</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 py-8 max-w-6xl mx-auto">
        {!isFormReady ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#9cc15e]" />
            <p className="text-[14px] text-[#7c8689]">Loading plan data…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {selectedFab && (
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
                disableShopActivity={currentIsResurface}
                onToggleExpand={() => setExpandedCards(p => ({ ...p, [idx]: !(p[idx] !== false) }))}
                onUpdate={patch => updateEntry(idx, patch)}
                onRemove={() => removeEntry(idx)}
              />
            ))}

            {!currentIsResurface && !hideAddStageButton && (
              <button
                type="button"
                onClick={addEntry}
                className="w-full h-[44px] border border-dashed border-[#e2e4ed] rounded-[8px] flex items-center justify-center gap-2 text-[#78829d] hover:border-[#9cc15e] hover:text-[#7a9705] hover:bg-[#f0f4e8] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span className="text-[14px] font-semibold">Add Another Stage</span>
              </button>
            )}

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
        )}
      </div>
    </div>
  );
};

export default CreatePlanPage;