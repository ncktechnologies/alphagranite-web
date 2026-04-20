import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, ChevronDown, LoaderCircle, Plus, X, Sparkles, Lock } from 'lucide-react';
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
import {
  useCreateShopPlansMutation,
  useCreateShopSuggestionMutation,
  useUpdateShopPlanMutation,
  useGetAllShopPlansQuery,
} from '@/store/api';
import { useGetPlanningSectionsQuery, useGetWorkStationByPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetFabsQuery, useGetFabByIdQuery } from '@/store/api/job';
import { usePlanSections } from '@/hooks/usePlanningSection';
import { TIME_SLOTS } from './createPlanePage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Field-to-keyword mapping ──────────────────────────────────────────────────
const FAB_STAGE_FIELDS: { keyword: string; field: string; label: string }[] = [
  { keyword: 'cut', field: 'total_sqft', label: 'Cut' },
  { keyword: 'wj', field: 'wj_linft', label: 'WJ' },
  { keyword: 'edg', field: 'edging_linft', label: 'Edging' },
  { keyword: 'mit', field: 'miter_linft', label: 'Miter' },
  { keyword: 'cnc', field: 'cnc_linft', label: 'CNC' },
  { keyword: 'resurface', field: 'resurface_linft', label: 'Resurfacing' },
];

const TOUCHUP_KEYWORD = 'touch';
const RESURFACE_KEYWORD = 'resurfac';

interface AutoPlanEntry {
  id?: number;
  fab_id: string;
  workstation_id: string;
  operator_id: string;
  notes: string;
  estimated_hours: string;
  start_time: string;
  end_time: string;
  end_date?: Date;
  scheduled_time?: string;
  planning_section_id?: string;
  stageName: string;
  date?: Date;
  sequence: string;
  isTouchup?: boolean;
}

interface ProposedRange {
  start: string;
  end: string;
  scheduled_time?: string;
}

interface AutoPlanEntryCardProps {
  entry: AutoPlanEntry;
  idx: number;
  totalNonTouchup: number;
  employees: any[];
  planningSections: any[];
  proposals: ProposedRange[];
  isExpanded: boolean;
  sequenceOptions: number[];
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<AutoPlanEntry>) => void;
  onRemove: () => void;
  onApplyProposal: (proposal: ProposedRange) => void;
}

const AutoPlanEntryCard: React.FC<AutoPlanEntryCardProps> = ({
  entry, idx, totalNonTouchup, employees, planningSections, proposals,
  isExpanded, sequenceOptions, onToggleExpand, onUpdate, onRemove, onApplyProposal,
}) => {
  const { data: workstationData, isLoading: isLoadingWorkstations } =
    useGetWorkStationByPlanningSectionsQuery(
      entry.planning_section_id ? Number(entry.planning_section_id) : 0,
      { skip: !entry.planning_section_id }
    );

  const workstationsForSection: any[] =
    workstationData?.workstations || (Array.isArray(workstationData) ? workstationData : []);

  const selectedWorkstation = workstationsForSection.find(w => String(w.id) === entry.workstation_id);
  const allowedOperatorIds = selectedWorkstation?.operator_ids?.map(String) || [];
  const filteredEmployees = allowedOperatorIds.length > 0
    ? employees.filter(emp => allowedOperatorIds.includes(String(emp.id)))
    : [];

  useEffect(() => {
    if (entry.operator_id && allowedOperatorIds.length > 0 && !allowedOperatorIds.includes(entry.operator_id)) {
      onUpdate({ operator_id: '' });
    }
  }, [entry.workstation_id]);

  const getStageName = () => {
    if (entry.stageName) return entry.stageName;
    if (entry.planning_section_id) {
      const ps = planningSections.find((s: any) => String(s.id) === entry.planning_section_id);
      return ps?.name || ps?.plan_name || ps?.title || '';
    }
    return '';
  };

  const stageName = getStageName();
  const hasSlot = !!(entry.date && entry.start_time && entry.end_time);

  const collapsedTimeLabel = useMemo(() => {
    if (!hasSlot) return null;
    if (entry.scheduled_time) return entry.scheduled_time;
    const startLabel = format(new Date(`1970-01-01T${entry.start_time}`), 'hh:mm a');
    const endLabel = format(new Date(`1970-01-01T${entry.end_time}`), 'hh:mm a');
    return `${format(entry.date!, 'MMM d')} · ${startLabel}–${endLabel}`;
  }, [hasSlot, entry.scheduled_time, entry.date, entry.start_time, entry.end_time]);

  const combineDateAndTime = (date: Date | undefined, time: string): Date | null => {
    if (!date || !time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const handleTimeUpdate = (startTime?: string, endTime?: string) => {
    const finalStart = startTime ?? entry.start_time;
    const finalEnd = endTime ?? entry.end_time;
    if (!entry.date || !finalStart || !finalEnd) {
      onUpdate({ start_time: finalStart, end_time: finalEnd });
      return;
    }
    const startDateTime = combineDateAndTime(entry.date, finalStart);
    const endDateTime = combineDateAndTime(entry.date, finalEnd);
    if (startDateTime && endDateTime && endDateTime > startDateTime) {
      const minutes = (endDateTime.getTime() - startDateTime.getTime()) / 60000;
      const hours = (minutes / 60).toFixed(2);
      onUpdate({ start_time: finalStart, end_time: finalEnd, estimated_hours: hours });
    } else {
      onUpdate({ start_time: finalStart, end_time: finalEnd });
    }
  };

  const handleHoursChange = (hoursStr: string) => {
    const hours = parseFloat(hoursStr);
    if (!entry.date || !entry.start_time || isNaN(hours) || hours <= 0) {
      onUpdate({ estimated_hours: hoursStr });
      return;
    }
    const startDateTime = combineDateAndTime(entry.date, entry.start_time);
    if (!startDateTime) {
      onUpdate({ estimated_hours: hoursStr });
      return;
    }
    const endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
    const endTime = format(endDateTime, 'HH:mm');
    onUpdate({ estimated_hours: hoursStr, end_time: endTime, end_date: endDateTime });
  };

  const handleDateChange = (newDate: Date) => {
    if (!entry.end_time || !entry.estimated_hours) {
      onUpdate({ date: newDate });
      return;
    }
    const hours = parseFloat(entry.estimated_hours);
    if (!isNaN(hours) && hours > 0) {
      const startDateTime = combineDateAndTime(newDate, entry.start_time);
      if (startDateTime) {
        const endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
        onUpdate({ date: newDate, end_date: endDateTime });
      } else {
        onUpdate({ date: newDate });
      }
    } else {
      onUpdate({ date: newDate });
    }
  };

  return (
    <Card className="border border-[#ecedf0] rounded-[12px] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#ecedf0] cursor-pointer select-none px-4" onClick={onToggleExpand}>
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <ChevronDown className={cn('h-5 w-5 text-[#7c8689] transition-transform shrink-0', !isExpanded && '-rotate-90')} />
            <CardTitle className="text-[15px] text-[#4b545d] font-semibold truncate">
              {stageName || `Plan Section ${idx + 1}`}
            </CardTitle>
            {stageName && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 border', entry.isTouchup ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-[#f0f4e8] border-[#9cc15e] text-[#5a7a00]')}>
                {stageName}
              </span>
            )}
            {!isExpanded && collapsedTimeLabel && (
              <span className="text-xs text-[#7c8689] shrink-0 hidden sm:inline">{collapsedTimeLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto pl-4 shrink-0" onClick={e => e.stopPropagation()}>
            {!entry.isTouchup ? (
              <Select value={entry.sequence} onValueChange={value => onUpdate({ sequence: value })}>
                <SelectTrigger className="h-7 w-auto text-[13px] border-[#e2e4ed] rounded-[4px] font-bold">
                  <SelectValue placeholder="Seq" />
                </SelectTrigger>
                <SelectContent>
                  {sequenceOptions.map(num => (<SelectItem key={num} value={String(num)}>Seq: {num}</SelectItem>))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-[12px] text-[#b0b7bc] px-2 py-1 rounded border border-dashed border-[#e2e4ed]">Last</span>
            )}
            <button type="button" onClick={onRemove} className="h-7 w-7 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-red-50 transition-colors shrink-0">
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Shop Activity</Label>
              <Select value={entry.planning_section_id} onValueChange={value => {
                const ps = planningSections.find((s: any) => String(s.id) === value);
                const name = ps?.name || ps?.plan_name || ps?.title || '';
                onUpdate({ planning_section_id: value, stageName: name, workstation_id: '', operator_id: '' });
              }}>
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {planningSections.map((ps: any) => (<SelectItem key={ps.id} value={String(ps.id)}>{ps.name || ps.plan_name || ps.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Est. Hours *</Label>
              <Input type="number" min="0.5" step="0.5" placeholder="e.g. 2.5" value={entry.estimated_hours} onChange={e => handleHoursChange(e.target.value)} className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]" />
            </div>

            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Workstation *</Label>
              <Select value={entry.workstation_id} onValueChange={value => onUpdate({ workstation_id: value, operator_id: '' })} disabled={!entry.planning_section_id || isLoadingWorkstations}>
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder={isLoadingWorkstations ? 'Loading…' : !entry.planning_section_id ? 'Select a section first' : workstationsForSection.length === 0 ? 'None for this section' : 'Select workstation'} />
                </SelectTrigger>
                <SelectContent>
                  {workstationsForSection.map((ws: any) => (<SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Operator *</Label>
              <Select value={entry.operator_id} onValueChange={value => onUpdate({ operator_id: value })} disabled={!entry.workstation_id}>
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder={!entry.workstation_id ? 'Select workstation first' : filteredEmployees.length === 0 ? 'No operators assigned' : 'Select operator'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.length === 0 ? (<div className="px-3 py-2 text-sm text-muted-foreground">No operators assigned to this workstation</div>) : (
                    filteredEmployees.map((emp: any) => (<SelectItem key={emp.id} value={String(emp.id)}>{`${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.trim() || emp.email}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={cn('mt-2 w-full h-[44px] px-3 text-left border border-[#e2e4ed] rounded-[6px] text-[14px] flex items-center gap-2', !entry.date && 'text-muted-foreground')}>
                    <Calendar className="h-4 w-4 text-[#7a9705]" />
                    {entry.date ? format(entry.date, 'MMM d, yyyy') : <span className="text-[#b0b7bc]">Auto-filled</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={entry.date} onSelect={date => date && handleDateChange(date)} initialFocus disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">Start Time</Label>
              <Select value={entry.start_time} onValueChange={value => handleTimeUpdate(value, undefined)}>
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder="Select start" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[14px] text-[#4b545d] font-semibold">End Time</Label>
              <Select value={entry.end_time} onValueChange={value => handleTimeUpdate(undefined, value)}>
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder="Select end" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {TIME_SLOTS.filter(slot => !entry.start_time || slot.value > entry.start_time).map(slot => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {proposals.length > 0 && (
            <div>
              <Label className="text-[13px] text-[#7c8689] mb-2 block">Available slots — click to apply</Label>
              <div className="flex flex-wrap gap-2">
                {proposals.map((proposal, pIdx) => {
                  const isActive = entry.scheduled_time ? entry.scheduled_time === proposal.scheduled_time : (entry.start_time === format(new Date(proposal.start), 'HH:mm') && entry.date && format(entry.date, 'yyyy-MM-dd') === format(new Date(proposal.start), 'yyyy-MM-dd'));
                  return (<button key={pIdx} type="button" onClick={() => onApplyProposal(proposal)} className={cn('px-3 py-1.5 rounded-[6px] border text-[13px] font-medium transition-colors', isActive ? 'bg-[#f0f4e8] border-[#9cc15e] text-[#5a7a00]' : 'bg-white border-[#e2e4ed] text-[#4b545d] hover:border-[#9cc15e] hover:bg-[#f0f4e8]')}>
                    {proposal.scheduled_time || `${format(new Date(proposal.start), 'MMM d · hh:mm a')}–${format(new Date(proposal.end), 'hh:mm a')}`}
                  </button>);
                })}
              </div>
            </div>
          )}

          <div>
            <Label className="text-[14px] text-[#4b545d] font-semibold">Description / Notes</Label>
            <Textarea placeholder="Add any notes about this plan..." value={entry.notes} onChange={e => onUpdate({ notes: e.target.value })} className="mt-2 min-h-[80px] border-[#e2e4ed] rounded-[6px] text-[14px]" />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
interface CreateAutoPlanPageProps {
  onBack?: () => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  onEventCreated?: () => void;
  hideBackButton?: boolean;
}

const CreateAutoPlanPage: React.FC<CreateAutoPlanPageProps> = ({
  onBack,
  selectedDate: propSelectedDate,
  selectedTimeSlot,
  selectedEvent,
  prefillFabId: propPrefillFabId,
  onEventCreated,
  hideBackButton = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFabId = searchParams.get('fabId');
  const effectivePrefillFabId = propPrefillFabId || urlFabId || '';

  const [proposals, setProposals] = useState<Record<number, ProposedRange[]>>({});
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const emptyEntry = (opts?: {
    date?: Date;
    section_id?: number;
    stageName?: string;
    fab_id?: string;
    isTouchup?: boolean;
  }): AutoPlanEntry => ({
    fab_id: opts?.fab_id ?? effectivePrefillFabId ?? '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    estimated_hours: '',
    start_time: '',
    end_time: '',
    end_date: undefined,
    scheduled_time: undefined,
    planning_section_id: opts?.section_id !== undefined ? String(opts.section_id) : undefined,
    stageName: opts?.stageName || '',
    date: opts?.date || propSelectedDate || undefined,
    sequence: '',
    isTouchup: opts?.isTouchup || false,
  });

  const [entries, setEntries] = useState<AutoPlanEntry[]>([emptyEntry()]);

  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  const [updateShopPlan] = useUpdateShopPlanMutation();
  const [createShopPlansSuggestion, { isLoading: isAutoScheduling }] = useCreateShopSuggestionMutation();

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections: any[] =
    planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees: any[] =
    employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);

  const { data: allFabsData, isLoading: isLoadingFabs } =
    useGetFabsQuery({ limit: 1000 });

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

  // ── NEW: Check if selected FAB already has plans ──────────────────────────
  const { data: existingPlansData, isFetching: isCheckingPlans } = useGetFabByIdQuery(
   selectedFabId,
    { skip: !selectedFabId }
  );

  const hasExistingPlans = useMemo(() => {
    if (!existingPlansData) return false;
    const total = existingPlansData?.plans.length ?? 0;
    return total > 0;
  }, [existingPlansData]);

  const { findSectionByKeyword } = usePlanSections();
  const employeesLoaded = employees.length > 0;

  const touchupSection = useMemo(
    () => planningSections.find((ps: any) =>
      (ps.name || ps.plan_name || ps.title || '').toLowerCase().includes(TOUCHUP_KEYWORD)
    ),
    [planningSections]
  );

  const resurfaceSection = useMemo(
    () => planningSections.find((ps: any) =>
      (ps.name || ps.plan_name || ps.title || '').toLowerCase().includes(RESURFACE_KEYWORD)
    ),
    [planningSections]
  );

  const isResurfaceFab = (fab: any) =>
    (fab?.fab_type || '').toLowerCase().includes(RESURFACE_KEYWORD);

  function getActiveStagesFromFab(fab: any) {
    if (isResurfaceFab(fab)) {
      if (!resurfaceSection) return [];
      return [{
        keyword: RESURFACE_KEYWORD,
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
  }

  const getNextAvailableSequence = (used: Set<number>) => {
    let seq = 1;
    while (used.has(seq)) seq++;
    return seq;
  };

  useEffect(() => {
    if (selectedEvent || !selectedFab) return;

    const activeStages = getActiveStagesFromFab(selectedFab);
    const regularEntries: AutoPlanEntry[] = activeStages.length === 0
      ? [emptyEntry({ fab_id: String(selectedFab.id) })]
      : activeStages.map((s, i) => ({
        ...emptyEntry({ section_id: s.section_id, stageName: s.label, fab_id: String(selectedFab.id) }),
        sequence: String(i + 1),
      }));

    const touchupEntry: AutoPlanEntry | null = touchupSection && !isResurfaceFab(selectedFab)
      ? {
        ...emptyEntry({
          section_id: touchupSection.id,
          stageName: touchupSection.name || touchupSection.plan_name || touchupSection.title || 'Touchup',
          fab_id: String(selectedFab.id),
          isTouchup: true,
        }),
        sequence: '',
      }
      : null;

    setEntries(touchupEntry ? [...regularEntries, touchupEntry] : regularEntries);
    setExpandedCards({});
  }, [selectedFab, selectedEvent, touchupSection, resurfaceSection]);

  useEffect(() => {
    if (!selectedEvent || !employeesLoaded) return;
    const ev: any = selectedEvent;
    const startDate = new Date(ev.scheduled_start_date);
    const endTime = ev.estimated_hours
      ? format(new Date(startDate.getTime() + ev.estimated_hours * 3_600_000), 'HH:mm')
      : '';
    setEntries([{
      id: ev.id,
      fab_id: String(ev.fab_id ?? ''),
      workstation_id: String(ev.workstation_id ?? ''),
      operator_id: String(ev.operator_id ?? ''),
      notes: ev.notes ?? '',
      estimated_hours: String(ev.estimated_hours ?? ''),
      start_time: format(startDate, 'HH:mm'),
      end_time: endTime,
      end_date: undefined,
      scheduled_time: undefined,
      planning_section_id: ev.planning_section_id != null ? String(ev.planning_section_id) : undefined,
      stageName: ev.stage_name || '',
      date: startDate,
      sequence: ev.sequence != null ? String(ev.sequence) : '',
      isTouchup: false,
    }]);
    setExpandedCards({ 0: true });
  }, [selectedEvent, employeesLoaded]);

  const addEntry = () => {
    setEntries(prev => {
      const hasTouchup = prev.some(e => e.isTouchup);
      const regularEntries = hasTouchup ? prev.slice(0, -1) : prev;
      const usedSequences = new Set(regularEntries.map(e => Number(e.sequence)).filter(s => !isNaN(s)));
      const nextSeq = getNextAvailableSequence(usedSequences);

      const newEntry: AutoPlanEntry = {
        ...emptyEntry({ fab_id: prev[0]?.fab_id }),
        sequence: String(nextSeq),
      };

      const touchupEntry = hasTouchup ? prev[prev.length - 1] : null;
      return touchupEntry ? [...regularEntries, newEntry, touchupEntry] : [...regularEntries, newEntry];
    });
  };

  const removeEntry = (idx: number) => {
    setEntries(prev => {
      const next = prev.filter((_, i) => i !== idx);
      let seq = 1;
      const updated = next.map(e => {
        if (e.isTouchup) return e;
        return { ...e, sequence: String(seq++) };
      });
      return updated;
    });
    setProposals(p => {
      const next = { ...p };
      delete next[idx];
      return next;
    });
  };

  const updateEntry = (idx: number, patch: Partial<AutoPlanEntry>) => {
    setEntries(prev => {
      const newEntries = [...prev];
      const target = newEntries[idx];

      if (patch.sequence !== undefined && !target.isTouchup) {
        const newSeq = Number(patch.sequence);
        if (!isNaN(newSeq)) {
          const conflictIdx = newEntries.findIndex((e, i) =>
            i !== idx && !e.isTouchup && Number(e.sequence) === newSeq
          );
          if (conflictIdx !== -1) {
            const oldSeq = Number(target.sequence);
            newEntries[conflictIdx] = { ...newEntries[conflictIdx], sequence: String(oldSeq) };
            newEntries[idx] = { ...newEntries[idx], sequence: String(newSeq) };
            
            const regularEntries = newEntries.filter(e => !e.isTouchup);
            const touchupEntry = newEntries.find(e => e.isTouchup);
            const sortedRegular = [...regularEntries].sort((a, b) => {
              const seqA = Number(a.sequence) || 0;
              const seqB = Number(b.sequence) || 0;
              return seqA - seqB;
            });
            return touchupEntry ? [...sortedRegular, touchupEntry] : sortedRegular;
          }
        }
      }

      if (idx === 0 && patch.fab_id !== undefined) {
        return newEntries.map(e => ({ ...e, fab_id: patch.fab_id! }));
      }
      newEntries[idx] = { ...target, ...patch };
      return newEntries;
    });
  };

  const applyProposal = (entryIdx: number, proposal: ProposedRange) => {
    const start = new Date(proposal.start);
    const end = new Date(proposal.end);
    updateEntry(entryIdx, {
      date: start,
      start_time: format(start, 'HH:mm'),
      end_time: format(end, 'HH:mm'),
      end_date: end,
      scheduled_time: proposal.scheduled_time,
    });
  };

  const handleBack = () => { if (onBack) onBack(); else navigate(-1); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const entry of entries) {
      if (!entry.fab_id) { toast.error('FAB ID is required'); return; }
      if (!entry.operator_id) { toast.error('Operator is required'); return; }
      if (!entry.workstation_id) { toast.error('Workstation is required'); return; }
      if (!entry.planning_section_id) { toast.error('Planning section is required'); return; }
      if (!entry.estimated_hours || parseFloat(entry.estimated_hours) <= 0) {
        toast.error('Estimated hours is required'); return;
      }
      if (!entry.date) {
        toast.error(`Date is required for ${entry.stageName || `Stage ${entries.indexOf(entry) + 1}`}`);
        return;
      }
    }

    try {
      const groups: Record<string, AutoPlanEntry[]> = {};
      const updates: AutoPlanEntry[] = [];

      for (const entry of entries) {
        if (entry.id) { updates.push(entry); continue; }
        const key = String(entry.fab_id);
        if (!groups[key]) groups[key] = [];
        groups[key].push(entry);
      }

      for (const fabId in groups) {
        let totalEst = 0;
        const stages = groups[fabId].map((entry, idx) => {
          const startDateStr = format(entry.date!, 'yyyy-MM-dd');
          const endDateStr = entry.end_date
            ? format(entry.end_date, 'yyyy-MM-dd')
            : startDateStr;

          const scheduledStart = entry.start_time
            ? `${startDateStr}T${entry.start_time}:00`
            : `${startDateStr}T00:00:00`;
          const scheduledEnd = entry.end_time
            ? `${endDateStr}T${entry.end_time}:00`
            : undefined;

          const hrs = parseFloat(entry.estimated_hours) || 0;
          totalEst += hrs;

          return {
            workstation_id: Number(entry.workstation_id),
            planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
            operator_ids: [Number(entry.operator_id)],
            estimated_hours: hrs,
            scheduled_start: scheduledStart,
            ...(scheduledEnd && { scheduled_end: scheduledEnd }),
            notes: entry.notes || undefined,
            sequence: entry.isTouchup
              ? groups[fabId].length
              : (Number(entry.sequence) || idx + 1),
          };
        });

        await createShopPlan({
          fab_id: Number(fabId),
          estimated_hours: totalEst,
          status_id: 1,
          stages,
        } as any).unwrap();
      }

      for (const entry of updates) {
        const startDateStr = format(entry.date!, 'yyyy-MM-dd');
        const endDateStr = entry.end_date
          ? format(entry.end_date, 'yyyy-MM-dd')
          : startDateStr;

        const scheduledStart = entry.start_time
          ? `${startDateStr}T${entry.start_time}:00`
          : `${startDateStr}T00:00:00`;
        const scheduledEnd = entry.end_time
          ? `${endDateStr}T${entry.end_time}:00`
          : undefined;

        const hrs = parseFloat(entry.estimated_hours) || 0;

        await updateShopPlan({
          plan_id: Number(entry.id),
          data: {
            stage: {
              workstation_id: Number(entry.workstation_id),
              planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
              operator_ids: [Number(entry.operator_id)],
              estimated_hours: hrs,
              scheduled_start: scheduledStart,
              ...(scheduledEnd && { scheduled_end: scheduledEnd }),
              notes: entry.notes || undefined,
              sequence: entry.isTouchup ? 999 : (Number(entry.sequence) || 1),
            },
          },
        } as any).unwrap();
      }

      toast.success('Plans scheduled successfully');
      onEventCreated?.();
      handleBack();
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleAutoPopulate = async () => {
    for (const entry of entries) {
      if (!entry.operator_id) { toast.error('Please select an operator for each stage'); return; }
      if (!entry.workstation_id) { toast.error('Please select a workstation for each stage'); return; }
      if (!entry.planning_section_id) { toast.error('Please select a planning section for each stage'); return; }
      if (!entry.estimated_hours || parseFloat(entry.estimated_hours) <= 0) {
        toast.error('Estimated hours is required for each stage'); return;
      }
    }

    try {
      const payload = {
        requests: entries.map(entry => ({
          planning_section_id: Number(entry.planning_section_id),
          operator_id: Number(entry.operator_id),
          workstation_id: Number(entry.workstation_id),
          estimated_hours: parseFloat(entry.estimated_hours),
          sequence: entry.isTouchup
            ? entries.length
            : (Number(entry.sequence) || 0),
        })),
        start_from: new Date().toISOString(),
        slot_minutes: 30,
        search_horizon_days: 30,
        max_proposals_per_request: 3,
      };

      const response = await createShopPlansSuggestion(payload as any).unwrap();
      const results: any[] = response?.data?.results ?? (Array.isArray(response) ? response : []);

      if (results.length === 0) { toast.error('No available slots found in the next 30 days'); return; }

      const newProposals: Record<number, ProposedRange[]> = {};
      entries.forEach((entry, idx) => {
        const match = results.find((r: any) =>
          String(r.planning_section_id) === String(entry.planning_section_id)
        );
        if (match?.proposed_ranges?.length) {
          newProposals[idx] = match.proposed_ranges as ProposedRange[];
        }
      });
      setProposals(newProposals);

      setEntries(prev => prev.map((entry, idx) => {
        const first = newProposals[idx]?.[0];
        if (!first) return entry;
        const start = new Date(first.start);
        const end = new Date(first.end);
        return {
          ...entry,
          date: start,
          start_time: format(start, 'HH:mm'),
          end_time: format(end, 'HH:mm'),
          end_date: end,
          scheduled_time: first.scheduled_time,
        };
      }));

      toast.success('Earliest slots applied — pick an alternative below each stage if needed');
    } catch (error: any) {
      console.error(error);
      // toast.error(error?.data?.message || 'Failed to get suggestions');
    }
  };

  const isEditing = !!selectedEvent;
  const nonTouchupCount = entries.filter(e => !e.isTouchup).length;

  const sequenceOptions = useMemo(
    () => Array.from({ length: Math.max(1, nonTouchupCount) }, (_, i) => i + 1),
    [nonTouchupCount]
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[#dfdfdf]">
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex items-center gap-4">
            <p className="text-[28px] leading-[32px] text-black font-semibold">
              {isEditing ? 'Edit Plan' : 'Auto Schedule Plan'}
            </p>
            {entries[0]?.fab_id && (
              <div className="flex items-center gap-2 bg-[#f0f4e8] border border-[#9cc15e] rounded-[8px] px-4 py-2">
                <span className="text-[14px] text-[#4a4d59]">FAB ID</span>
                <span className="text-[20px] text-[#7a9705] font-semibold">#{entries[0].fab_id}</span>
              </div>
            )}
          </div>

          {!hideBackButton && (
            <button
              onClick={handleBack}
              className="h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] bg-white flex items-center gap-2 text-[#4b545d] hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[14px] font-semibold">Back</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-10 py-8 max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-[#ecedf0] rounded-[12px]">
            <CardContent className="pt-5">
              <Label className="text-[14px] text-[#4b545d] font-semibold">FAB ID *</Label>
              <Select
                value={entries[0]?.fab_id || ''}
                onValueChange={value => updateEntry(0, { fab_id: value })}
                disabled={isLoadingFabs || (!!effectivePrefillFabId && !isEditing)}
              >
                <SelectTrigger className="mt-2 h-[44px] border-[#e2e4ed] rounded-[6px] text-[14px]">
                  <SelectValue placeholder={isLoadingFabs ? 'Loading FABs…' : 'Select FAB ID'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {fabOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedFabId && selectedFab && (
            <Card className="border border-[#ecedf0] rounded-[12px]">
              <CardHeader className="pb-3 border-b border-[#ecedf0]">
                <CardTitle className="text-[16px] text-[#4b545d] font-semibold">FAB Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-3 gap-4">
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
                      <Label className="text-[13px] text-[#7c8689]">{label}</Label>
                      <p className="text-[14px] font-medium text-[#4b545d]">{val || '-'}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {FAB_STAGE_FIELDS.map(s => {
                    const val = selectedFab?.[s.field];
                    const active = typeof val === 'number' && val > 0;
                    return (
                      <span
                        key={s.keyword}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[13px] font-medium border',
                          active
                            ? 'bg-[#f0f4e8] border-[#9cc15e] text-[#5a7a00]'
                            : 'bg-gray-50 border-[#e2e4ed] text-[#b0b7bc]'
                        )}
                      >
                        {s.label}
                        {active && <span className="font-semibold">{val?.toFixed(1)}</span>}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {entries.map((entry, idx) => (
            <AutoPlanEntryCard
              key={idx}
              entry={entry}
              idx={idx}
              totalNonTouchup={nonTouchupCount}
              employees={employees}
              planningSections={planningSections}
              proposals={proposals[idx] || []}
              isExpanded={expandedCards[idx] === true}
              sequenceOptions={sequenceOptions}
              onToggleExpand={() =>
                setExpandedCards(p => ({ ...p, [idx]: !(p[idx] === true) }))
              }
              onUpdate={patch => updateEntry(idx, patch)}
              onRemove={() => removeEntry(idx)}
              onApplyProposal={proposal => applyProposal(idx, proposal)}
            />
          ))}

          <button
            type="button"
            onClick={addEntry}
            className="w-full h-[44px] border border-dashed border-[#e2e4ed] rounded-[8px] flex items-center justify-center gap-2 text-[#78829d] hover:border-[#9cc15e] hover:text-[#7a9705] hover:bg-[#f0f4e8] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[14px] font-semibold">Add Another Stage</span>
          </button>

          {/* Auto-populate Button with disable logic and tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full">
                  <button
                    type="button"
                    onClick={handleAutoPopulate}
                    disabled={isAutoScheduling || hasExistingPlans || isCheckingPlans}
                    className="w-full h-[44px] border border-[#9cc15e] rounded-[8px] flex items-center justify-center gap-2 text-[#5a7a00] bg-[#f0f4e8] hover:bg-[#e6f0d4] transition-colors disabled:opacity-60 text-[14px] font-semibold"
                  >
                    {isAutoScheduling ? (
                      <><LoaderCircle className="h-4 w-4 animate-spin" />Finding earliest slots…</>
                    ) : hasExistingPlans ? (
                      <><Lock className="h-4 w-4" />FAB already has plans</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />Auto-populate Dates</>
                    )}
                  </button>
                </span>
              </TooltipTrigger>
              {hasExistingPlans && (
                <TooltipContent side="top" className="bg-gray-800 text-white text-xs">
                  This FAB already has scheduled plans. Auto‑suggest is disabled.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

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
              className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center gap-2 text-white text-[14px] font-semibold disabled:opacity-60 cursor-pointer"
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

export default CreateAutoPlanPage;