import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, ChevronDown, LoaderCircle, Plus, X, Sparkles } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCreateShopPlansMutation, useCreateShopSuggestionMutation, useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetFabsQuery } from '@/store/api/job';

interface CreatePlanPageProps {
  onBack?: () => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  onEventCreated?: () => void;
  hideBackButton?: boolean;
}

// Maps a fab object's fields to planning_section_id
// Returns the linft/sqft value for that stage from the fab
const FAB_STAGE_FIELDS: { section_id: number; field: string; label: string }[] = [
  { section_id: 7, field: 'total_sqft',    label: 'Cut'     },
  { section_id: 8, field: 'wj_linft',      label: 'WJ'      },
  { section_id: 9, field: 'edging_linft',  label: 'Edging'  },
  { section_id: 2, field: 'miter_linft',   label: 'Miter'   },
  { section_id: 1, field: 'cnc_linft',     label: 'CNC'     },
];

// Returns the stages that have a value > 0 on this fab
function getActiveStagesFromFab(fab: any): { section_id: number; label: string }[] {
  return FAB_STAGE_FIELDS.filter(s => {
    const val = fab?.[s.field];
    return typeof val === 'number' && val > 0;
  });
}

const CreateAutoPlanPage: React.FC<CreatePlanPageProps> = ({
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

  // Auto-populate state
  const [proposals, setProposals] = useState<Record<number, any[]>>({}); // keyed by entry index

  // Build a blank entry, optionally pre-filled with a stage section_id and label
  const emptyEntry = (opts?: { date?: Date; section_id?: number; stageName?: string; fab_id?: string }) => ({
    id: undefined as number | undefined,
    fab_id: opts?.fab_id ?? effectivePrefillFabId ?? '',
    workstation_id: '',
    operator_id: '',
    notes: '',
    estimated_hours: '' as string,
    start_time: '' as string,   // populated by auto-populate response
    end_time:   '' as string,   // populated by auto-populate response
    planning_section_id: opts?.section_id !== undefined ? String(opts.section_id) : undefined as string | undefined,
    stageName: opts?.stageName || '',          // display label only, not sent to API
    date: opts?.date || propSelectedDate || undefined as Date | undefined,
  });

  const [entries, setEntries] = useState(() => [emptyEntry()]);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({}); // undefined = expanded by default

  // Mutations
  const [createShopPlan, { isLoading }] = useCreateShopPlansMutation();
  const [updateShopPlan] = useUpdateShopPlanMutation();
  const [createShopPlansSuggestion, { isLoading: isAutoScheduling }] = useCreateShopSuggestionMutation();

  // Queries
  const { data: workstationsData } = useGetWorkstationsQuery();
  const workstations = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();
  const planningSections = planningSectionsData?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : planningSectionsData || []);

  const { data: employeesData } = useGetEmployeesQuery();
  const employees = employeesData?.data || (Array.isArray(employeesData) ? employeesData : employeesData || []);

  const { data: allFabsData, isLoading: isLoadingFabs } = useGetFabsQuery({ limit: 1000, current_stage: 'cut_list' });

  const fabOptions = useMemo(() => {
    if (!allFabsData) return [];
    const fabs = allFabsData?.data || (Array.isArray(allFabsData) ? allFabsData : []);
    return fabs.map((fab: any) => ({
      value: String(fab.id),
      label: `Fab ${fab.id} - (${fab.fab_type || 'N/A'})`,
    }));
  }, [allFabsData]);

  const selectedFabId = useMemo(() => entries[0]?.fab_id, [entries]);

  const selectedFab = useMemo(() => {
    if (!allFabsData || !selectedFabId) return null;
    const fabs = allFabsData?.data || (Array.isArray(allFabsData) ? allFabsData : []);
    return fabs.find((fab: any) => String(fab.id) === selectedFabId) || null;
  }, [allFabsData, selectedFabId]);

  // When a FAB is selected (and not editing), auto-populate entries for every
  // stage whose fab field is > 0
  useEffect(() => {
    if (selectedEvent || !selectedFab) return;

    const activeStages = getActiveStagesFromFab(selectedFab);

    if (activeStages.length === 0) {
      // No stage values — show a single blank entry preserving the selected fab
      setEntries([emptyEntry({ fab_id: String(selectedFab.id) })]);
      return;
    }

    const currentFabId = String(selectedFab.id);
    setEntries(
      activeStages.map(s =>
        emptyEntry({ section_id: s.section_id, stageName: s.label, fab_id: currentFabId })
      )
    );
  }, [selectedFab, selectedEvent]);

  // Effect for editing an existing event
  useEffect(() => {
    if (!selectedEvent) return;
    const ev: any = selectedEvent;
    setEntries([{
      id: ev.id,
      fab_id: String(ev.fab_id || effectivePrefillFabId || ''),
      workstation_id: String(ev.workstation_id || ''),
      operator_id: String(ev.operator_id || ''),
      notes: ev.notes || '',
      estimated_hours: String(ev.estimated_hours || ''),
      start_time: ev.scheduled_start_date ? format(new Date(ev.scheduled_start_date), 'HH:mm') : '',
      end_time:   ev.scheduled_end_date   ? format(new Date(ev.scheduled_end_date),   'HH:mm') : '',
      planning_section_id: String(ev.planning_section_id || '') || undefined,
      stageName: ev.stage_name || '',
      date: new Date(ev.scheduled_start_date),
    }]);
  }, [selectedEvent, selectedTimeSlot, effectivePrefillFabId]);

  // Handlers
  const addEntry = () =>
    setEntries(p => {
      const newEntry = emptyEntry();
      if (p[0]?.fab_id) newEntry.fab_id = p[0].fab_id;
      return [...p, newEntry];
    });

  const removeEntry = (idx: number) => setEntries(p => p.filter((_, i) => i !== idx));

  const updateEntry = (idx: number, patch: Partial<typeof entries[0]>) =>
    setEntries(p => {
      const updated = p.map((e, i) => (i === idx ? { ...e, ...patch } : e));
      // Changing fab_id on the first entry propagates to all entries and re-triggers useEffect
      if (idx === 0 && patch.fab_id !== undefined) {
        return updated.map(e => ({ ...e, fab_id: patch.fab_id as string }));
      }
      return updated;
    });

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const entry of entries) {
      if (!entry.fab_id)         { toast.error('FAB ID is required'); return; }
      if (!entry.operator_id)    { toast.error('Operator is required'); return; }
      if (!entry.workstation_id) { toast.error('Workstation is required'); return; }
      if (!entry.planning_section_id) { toast.error('Planning section is required'); return; }
      if (!entry.estimated_hours || parseFloat(entry.estimated_hours as string) <= 0) {
        toast.error('Estimated hours is required'); return;
      }
      if (!entry.date) {
        toast.error(`Date is required for ${getStageName(entry) || `Stage ${entries.indexOf(entry) + 1}`} — use Auto-populate or pick a date`);
        return;
      }
    }

    try {
      const groups: Record<string, typeof entries> = {};
      const updates: typeof entries = [];

      for (const entry of entries) {
        if (entry.id) {
          updates.push(entry);
        } else {
          const key = String(entry.fab_id);
          if (!groups[key]) groups[key] = [];
          groups[key].push(entry);
        }
      }

      for (const fabId in groups) {
        const groupEntries = groups[fabId];
        let totalEst = 0;
        const stages = groupEntries.map(entry => {
          const scheduledDate  = format(entry.date!, 'yyyy-MM-dd');
          const scheduledStart = entry.start_time ? `${scheduledDate}T${entry.start_time}:00` : `${scheduledDate}T00:00:00`;
          const scheduledEnd   = entry.end_time   ? `${scheduledDate}T${entry.end_time}:00`   : undefined;
          const estimatedHours = parseFloat(entry.estimated_hours as string) || 0;
          totalEst += estimatedHours;
          return {
            workstation_id:      Number(entry.workstation_id),
            planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
            operator_ids:        [Number(entry.operator_id)],
            estimated_hours:     estimatedHours,
            scheduled_start:     scheduledStart,
            ...(scheduledEnd && { scheduled_end: scheduledEnd }),
            notes:               entry.notes || undefined,
          };
        });
        await createShopPlan({ fab_id: Number(fabId), estimated_hours: totalEst, status_id: 1, stages } as any).unwrap();
      }

      for (const entry of updates) {
        const scheduledDate  = format(entry.date!, 'yyyy-MM-dd');
        const scheduledStart = entry.start_time ? `${scheduledDate}T${entry.start_time}:00` : `${scheduledDate}T00:00:00`;
        const scheduledEnd   = entry.end_time   ? `${scheduledDate}T${entry.end_time}:00`   : undefined;
        const estimatedHours = parseFloat(entry.estimated_hours as string) || 0;
        const stageObj: any = {
          workstation_id:      Number(entry.workstation_id),
          planning_section_id: Number(entry.planning_section_id) || (planningSections[0]?.id ?? 0),
          operator_ids:        [Number(entry.operator_id)],
          estimated_hours:     estimatedHours,
          scheduled_start:     scheduledStart,
          ...(scheduledEnd && { scheduled_end: scheduledEnd }),
          notes:               entry.notes || undefined,
        };
        await updateShopPlan({ plan_id: Number(entry.id), data: { stage: stageObj } } as any).unwrap();
      }

      toast.success('Plans scheduled successfully');
      onEventCreated?.();
      handleBack();
    } catch (error: any) {
      console.error('Error creating/updating event:', error);
    //   toast.error(error?.data?.detail?.message || 'Failed to create/update Plan');
    }
  };

  // Auto-populate: asks backend for earliest available slots for all stages at once
  const handleAutoPopulate = async () => {
    // Validate only the fields we need for this request
    for (const entry of entries) {
      if (!entry.operator_id)   { toast.error('Please select an operator for each stage'); return; }
      if (!entry.workstation_id){ toast.error('Please select a workstation for each stage'); return; }
      if (!entry.planning_section_id){ toast.error('Please select a planning section for each stage'); return; }
       if (!entry.estimated_hours || parseFloat(entry.estimated_hours as string) <= 0) {
      toast.error('Estimated hours is required for each stage before auto-populating');
      return;
    }
    }

    try {
      const payload = {
        requests: entries.map(entry => ({
          planning_section_id: Number(entry.planning_section_id),
          operator_id:         Number(entry.operator_id),
          workstation_id:      Number(entry.workstation_id),
          estimated_hours:     parseFloat(entry.estimated_hours as string) ,
        })),
        start_from:                new Date().toISOString(),
        slot_minutes:              30,
        search_horizon_days:       30,
        max_proposals_per_request: 3,
      };

      const response = await createShopPlansSuggestion(payload as any).unwrap();

      // Response shape: { success, data: { results: [{ planning_section_id, proposed_ranges: [{start, end}] }] } }
      const results: any[] = response?.data?.results ?? (Array.isArray(response) ? response : []);

      if (results.length === 0) {
        toast.error('No available slots found in the next 30 days');
        return;
      }

      // Build proposals keyed by entry index, matched by planning_section_id
      const newProposals: Record<number, any[]> = {};
      entries.forEach((entry, idx) => {
        const match = results.find(
          (r: any) => String(r.planning_section_id) === String(entry.planning_section_id)
        );
        if (match?.proposed_ranges?.length) {
          newProposals[idx] = match.proposed_ranges;
        }
      });
      setProposals(newProposals);

      // Auto-apply the first (earliest) proposed_range to each entry WITHOUT clearing other fields
      setEntries(prev =>
        prev.map((entry, idx) => {
          const first = newProposals[idx]?.[0];
          if (!first) return entry; // no proposal for this stage — leave untouched
          const start = new Date(first.start);
          const end   = new Date(first.end);
          return {
            ...entry,                               // preserve fab_id, operator, workstation, notes etc.
            date:       start,
            start_time: format(start, 'HH:mm'),
            end_time:   format(end,   'HH:mm'),
          };
        })
      );

      toast.success('Earliest slots applied — pick an alternative below each stage if needed');
    } catch (error: any) {
      console.error('Auto-populate error:', error);
    //   toast.error(error?.data?.detail?.message || 'Failed to fetch available slots');
    }
  };

  // Apply a specific proposal range for one entry (user picks alternative)
  const applyProposal = (entryIdx: number, proposal: { start: string; end: string }) => {
    const start = new Date(proposal.start);
    const end   = new Date(proposal.end);
    setEntries(prev =>
      prev.map((entry, idx) =>
        idx === entryIdx
          ? { ...entry, date: start, start_time: format(start, 'HH:mm'), end_time: format(end, 'HH:mm') }
          : entry
      )
    );
  };

  // Resolve a stage display name for a given entry
  const getStageName = (entry: typeof entries[0]): string => {
    if (entry.stageName) return entry.stageName;
    if (entry.planning_section_id) {
      const section = planningSections.find((ps: any) => String(ps.id) === entry.planning_section_id);
      if (section) return section.name || section.plan_name || section.title || '';
    }
    return '';
  };

  const isEditing = !!selectedEvent;

  return (
    <div className="bg-white min-h-screen">
      {/* Page Header */}
      <div className="border-b border-[#dfdfdf]">
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex items-center gap-4">
            {!hideBackButton && (
              <button
                onClick={handleBack}
                className="h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] bg-white flex items-center gap-2 text-[#4b545d] hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-[14px] font-semibold">Back</span>
              </button>
            )}
            <div className="flex flex-col gap-1">
              <p className="text-[28px] leading-[32px] text-black font-semibold">
                {isEditing ? 'Edit Plan' : 'Auto Schedule Plan'}
              </p>
            </div>
          </div>

          {entries[0]?.fab_id && (
            <div className="flex items-center gap-2 bg-[#f0f4e8] border border-[#9cc15e] rounded-[8px] px-4 py-2">
              <span className="text-[13px] text-[#4a4d59]">FAB ID</span>
              <span className="text-[20px] text-[#7a9705] font-semibold">
                #{entries[0].fab_id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form Content */}
      <div className="px-10 py-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* FAB selector — always visible at the top, outside the per-entry cards */}
          <Card className="border border-[#ecedf0] rounded-[12px]">
            <CardContent className="pt-5">
              <Label className="text-[13px] text-[#4b545d] font-semibold">FAB ID *</Label>
              <Select
                value={entries[0]?.fab_id || ''}
                onValueChange={value => updateEntry(0, { fab_id: value })}
                disabled={isLoadingFabs || (!!effectivePrefillFabId && !isEditing)}
              >
                <SelectTrigger className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]">
                  <SelectValue placeholder={isLoadingFabs ? 'Loading FABs…' : 'Select FAB ID'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {fabOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* FAB Details Card */}
          {selectedFabId && selectedFab && (
            <Card className="border border-[#ecedf0] rounded-[12px]">
              <CardHeader className="pb-3 border-b border-[#ecedf0]">
                <CardTitle className="text-[16px] text-[#4b545d] font-semibold">FAB Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-[#7c8689]">Job No</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.job_details?.job_number || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">Job Name</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.job_details?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">Account Name</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab?.account_name || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">No. of Pieces</Label>
                    <p className="text-sm font-medium text-[#4b545d]">{selectedFab.no_of_pieces || 0}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">Total Sq Ft</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.total_sqft?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">WJ LinFt</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.wj_linft?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">Edging LinFt</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.edging_linft?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">CNC LinFt</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.cnc_linft?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#7c8689]">Miter LinFt</Label>
                    <p className="text-sm font-medium text-[#4b545d]">
                      {selectedFab.miter_linft?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Stage value pills — visual hint of what got auto-populated */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {FAB_STAGE_FIELDS.map(s => {
                    const val = selectedFab?.[s.field];
                    const active = typeof val === 'number' && val > 0;
                    return (
                      <span
                        key={s.section_id}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                          active
                            ? 'bg-[#f0f4e8] border-[#9cc15e] text-[#5a7a00]'
                            : 'bg-gray-50 border-[#e2e4ed] text-[#b0b7bc]'
                        )}
                      >
                        {s.label}
                        {active && (
                          <span className="font-semibold">
                            {val?.toFixed(1)}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan entries — one card per active stage */}
          {entries.map((entry, idx) => {
            const stageName = getStageName(entry);
            const isExpanded = expandedCards[idx] !== false; // default expanded
            const hasSlot = !!(entry.date && entry.start_time && entry.end_time);

            return (
              <Card key={idx} className="border border-[#ecedf0] rounded-[12px] overflow-hidden">
                {/* Card Header — always visible, click to collapse/expand */}
                <CardHeader
                  className="pb-3 border-b border-[#ecedf0] cursor-pointer select-none"
                  onClick={() => setExpandedCards(prev => ({ ...prev, [idx]: !isExpanded }))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Collapse chevron */}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-[#7c8689] transition-transform shrink-0',
                          !isExpanded && '-rotate-90'
                        )}
                      />
                      <CardTitle className="text-[15px] text-[#4b545d] font-semibold truncate">
                        {stageName || `Plan Section ${idx + 1}`}
                      </CardTitle>
                      {stageName && (
                        <span className="px-2 py-0.5 rounded-full bg-[#f0f4e8] border border-[#9cc15e] text-[#5a7a00] text-xs font-semibold shrink-0">
                          {stageName}
                        </span>
                      )}
                      {/* Summary when collapsed */}
                      {!isExpanded && hasSlot && (
                        <span className="text-xs text-[#7c8689] shrink-0">
                          {format(entry.date!, 'MMM d')} · {format(new Date(`1970-01-01T${entry.start_time}`), 'hh:mm a')}–{format(new Date(`1970-01-01T${entry.end_time}`), 'hh:mm a')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
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
                  </div>
                </CardHeader>

                {/* Collapsible body */}
                {isExpanded && (
                  <CardContent className="pt-5 space-y-5">

                    {/* Row 1: Planning Section + Estimated Hours */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Planning Section</Label>
                        <Select
                          value={entry.planning_section_id}
                          onValueChange={value => {
                            const section = planningSections.find((ps: any) => String(ps.id) === value);
                            const name = section?.name || section?.plan_name || section?.title || '';
                            updateEntry(idx, { planning_section_id: value, stageName: name });
                          }}
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
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Estimated Hours *</Label>
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          placeholder="e.g. 2.5"
                          value={entry.estimated_hours}
                          onChange={e => updateEntry(idx, { estimated_hours: e.target.value })}
                          className="mt-2 h-[42px] border-[#e2e4ed] rounded-[6px] text-[13px]"
                          required
                        />
                      </div>
                    </div>

                    {/* Row 2: Workstation + Operator */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Workstation *</Label>
                        <Select
                          value={entry.workstation_id}
                          onValueChange={value => updateEntry(idx, { workstation_id: value })}
                        >
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
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Operator *</Label>
                        <Select
                          value={entry.operator_id}
                          onValueChange={value => updateEntry(idx, { operator_id: value })}
                        >
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
                    </div>

                    {/* Row 3: Date + Scheduled time (from auto-populate) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Date</Label>
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
                              {entry.date ? format(entry.date, 'MMM d, yyyy') : <span className="text-[#b0b7bc]">Auto-filled by schedule</span>}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={entry.date}
                              onSelect={date => date && updateEntry(idx, { date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-[13px] text-[#4b545d] font-semibold">Scheduled Time</Label>
                        {entry.start_time && entry.end_time ? (
                          <div className="mt-2 h-[42px] flex items-center gap-2 px-3 rounded-[6px] bg-[#f0f4e8] border border-[#9cc15e]">
                            <span className="text-sm font-semibold text-[#5a7a00]">
                              {format(new Date(`1970-01-01T${entry.start_time}`), 'hh:mm a')} – {format(new Date(`1970-01-01T${entry.end_time}`), 'hh:mm a')}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 h-[42px] flex items-center px-3 rounded-[6px] border border-dashed border-[#e2e4ed] text-[13px] text-[#b0b7bc]">
                            Auto-filled by schedule
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Proposal slots from auto-populate */}
                    {proposals[idx] && proposals[idx].length > 0 && (
                      <div>
                        <Label className="text-[12px] text-[#7c8689] mb-2 block">
                          Available slots — click to apply a different slot
                        </Label>
                        <div className="flex flex-wrap gap-2">
                          {proposals[idx].map((proposal: any, pIdx: number) => {
                            const start = new Date(proposal.start || proposal.scheduled_start);
                            const end   = new Date(proposal.end   || proposal.scheduled_end);
                            const isActive =
                              entry.start_time === format(start, 'HH:mm') &&
                              entry.date && format(entry.date, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd');
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => applyProposal(idx, proposal)}
                                className={cn(
                                  'px-3 py-1.5 rounded-[6px] border text-xs font-medium transition-colors',
                                  isActive
                                    ? 'bg-[#f0f4e8] border-[#9cc15e] text-[#5a7a00]'
                                    : 'bg-white border-[#e2e4ed] text-[#4b545d] hover:border-[#9cc15e] hover:bg-[#f0f4e8]'
                                )}
                              >
                                {format(start, 'MMM d')} · {format(start, 'hh:mm a')}–{format(end, 'hh:mm a')}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes — full width */}
                    <div>
                      <Label className="text-[13px] text-[#4b545d] font-semibold">Description / Notes</Label>
                      <Textarea
                        placeholder="Add any notes about this plan..."
                        value={entry.notes}
                        onChange={e => updateEntry(idx, { notes: e.target.value })}
                        className="mt-2 min-h-[80px] border-[#e2e4ed] rounded-[6px] text-[13px]"
                      />
                    </div>

                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Add another stage manually */}
          <button
            type="button"
            onClick={addEntry}
            className="w-full h-[44px] border border-dashed border-[#e2e4ed] rounded-[8px] flex items-center justify-center gap-2 text-[#78829d] hover:border-[#9cc15e] hover:text-[#7a9705] hover:bg-[#f0f4e8] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[14px] font-semibold">Add Another Stage</span>
          </button>

          {/* Auto-populate button */}
          {/* {!isEditing && entries.some(e => e.operator_id && e.workstation_id && e.planning_section_id) && ( */}
            <button
              type="button"
              onClick={handleAutoPopulate}
              disabled={isAutoScheduling && !isEditing && entries.some(e => e.operator_id && e.workstation_id && e.planning_section_id && e.estimated_hours)}
              className="w-full h-[44px] border border-[#9cc15e] rounded-[8px] flex items-center justify-center gap-2 text-[#5a7a00] bg-[#f0f4e8] hover:bg-[#e6f0d4] transition-colors disabled:opacity-60 text-[14px] font-semibold"
            >
              {isAutoScheduling ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Finding earliest slots…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Auto-populate Dates
                </>
              )}
            </button>
        

          {/* Footer actions */}
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

export default CreateAutoPlanPage;