import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    AlertCircle, Pencil, X, LoaderCircle,
    CheckCircle2, Clock, CalendarDays, ChevronDown,
    MessageSquare, Save, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Container } from '@/components/common/container';
import {
    useGetFabByIdQuery,
    useUpdateFabMutation,
    useCreateFabNoteMutation,
} from '@/store/api/job';
import { useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetWorkStationByPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { BackButton } from '@/components/common/BackButton';
import { usePlanSections } from '@/hooks/usePlanningSection';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import CreatePlanSheet from './createEvent';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TIME_SLOTS = (() => {
    const slots: { value: string; label: string }[] = [];
    for (let h = 6; h <= 22; h++) {
        // Skip 12 PM (noon) - jump from 11 AM to 1 PM
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

const noteStageConfig: Record<string, { label: string; color: string }> = {
    shop_status: { label: 'Shop Status', color: 'text-blue-700' },
    templating: { label: 'Templating', color: 'text-blue-700' },
    pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
    drafting: { label: 'Drafting', color: 'text-green-700' },
    cut_list: { label: 'Final Programming', color: 'text-purple-700' },
    cutting: { label: 'Cutting', color: 'text-orange-700' },
    install_scheduling: { label: 'Install Scheduling', color: 'text-teal-700' },
    install_completion: { label: 'Install Completion', color: 'text-cyan-700' },
    shop: { label: 'Shop', color: 'text-indigo-700' },
    general: { label: 'General', color: 'text-gray-700' },
};

const parseDateString = (s: string | undefined): Date | undefined => {
    if (!s) return undefined;
    const parts = s.split('-');
    if (parts.length === 3) return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
};

const formatDate = (d: Date | undefined): string => {
    if (!d) return '';
    // Format in local time to avoid timezone shifts
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper to parse date string for display (handles timezone correctly)
const parseDateForDisplay = (s: string | undefined): Date | undefined => {
    if (!s || typeof s !== 'string' || s.trim() === '') return undefined;

    try {
        // If it's in YYYY-MM-DD format, parse as local date to avoid UTC shift
        const parts = s.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);

            // Validate the parsed values
            if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
            if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

            return new Date(year, month - 1, day);
        }

        // If it has time component (ISO string), extract just the date part
        if (s.includes('T')) {
            const datePart = s.split('T')[0];
            const dateParts = datePart.split('-');
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10);
                const day = parseInt(dateParts[2], 10);

                if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
                if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

                return new Date(year, month - 1, day);
            }
        }

        // Fallback: try parsing normally
        const d = new Date(s);
        return isNaN(d.getTime()) ? undefined : d;
    } catch {
        return undefined;
    }
};

// Safe format helper that handles invalid dates gracefully
const safeFormatDate = (dateStr: string | undefined, formatStr: string): string => {
    const date = parseDateForDisplay(dateStr);
    if (!date || isNaN(date.getTime())) return '—';
    try {
        return format(date, formatStr);
    } catch {
        return '—';
    }
};

const parseTimeFromISO = (isoStr: string | undefined): string => {
    if (!isoStr) return '';
    try { return format(new Date(isoStr), 'HH:mm'); } catch { return ''; }
};

// Helper for FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
    if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
    if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini Progress Bar
// ─────────────────────────────────────────────────────────────────────────────
const MiniProgress: React.FC<{ percent: number }> = ({ percent }) => {
    const p = Math.min(percent || 0, 100);
    const color =
        p === 100 ? '#4caf50' :
            p >= 75 ? '#2196f3' :
                p >= 50 ? '#ff9800' :
                    p >= 25 ? '#f44336' : '#9e9e9e';
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 bg-[#e2e4ed] rounded-full h-[6px] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right shrink-0">{p.toFixed(1)}%</span>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Info Row
// ─────────────────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        <span className="text-sm text-text">{value || '—'}</span>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Editable Shop Est. Completion Date
// ─────────────────────────────────────────────────────────────────────────────
const ShopEstDateField: React.FC<{ value: string | undefined; fabId: number; onSaved: () => void }> = ({
    value, fabId, onSaved,
}) => {
    const [updateFab] = useUpdateFabMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [editedDate, setEditedDate] = useState<Date | undefined>(parseDateForDisplay(value));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setEditedDate(parseDateForDisplay(value)); }, [value]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateFab({ id: fabId, data: { shop_est_completion_date: editedDate ? formatDate(editedDate) : null } }).unwrap();
            toast.success('Shop est. completion date updated.');
            setIsEditing(false);
            onSaved();
        } catch {
            toast.error('Failed to update date.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-normal">Shop Est. Completion</p>
                <DateTimePicker mode="date" value={editedDate} onChange={d => setEditedDate(d)} />
                <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                        onClick={() => { setEditedDate(parseDateForDisplay(value)); setIsEditing(false); }}
                        disabled={isSaving}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-normal">Shop Est. Completion</span>
                <span className="text-sm font-medium text-text">
                    {safeFormatDate(value, 'MMM dd, yyyy')}
                </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-text"
                onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" />
            </Button>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// PlanStageCard
// ─────────────────────────────────────────────────────────────────────────────
interface PlanStageCardProps {
    plan: any;
    workstations: any[];
    employees: any[];
    totalPlans: number;         // ← total plans on this fab, drives sequence options
    onSaved: () => void;
}

const PlanStageCard: React.FC<PlanStageCardProps> = ({ plan, workstations, employees, totalPlans, onSaved }) => {
    const [updateShopPlan] = useUpdateShopPlanMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ← Use shared hook — resolves label by section id, no hardcoded stageMapping needed
    const { sections: planSections } = usePlanSections();
    const sectionInfo = planSections.find(s => s.id === plan.planning_section_id);
    const sectionLabel = sectionInfo?.plan_name ?? `Section ${plan.planning_section_id}`;

    // Sequence options: always at least 3, grows with total plans
    const sequenceOptions = Array.from(
        { length: Math.max(3, totalPlans) },
        (_, i) => i + 1
    );

    const { data: workstationData, isLoading: isLoadingWorkstations } = useGetWorkStationByPlanningSectionsQuery(
        plan.planning_section_id,
        { skip: !plan.planning_section_id }
    );
    const workstationsForSection: any[] = workstationData?.workstations
        || (Array.isArray(workstationData) ? workstationData : []);

    const deriveEndTime = () => {
        if (plan.scheduled_end_date) return parseTimeFromISO(plan.scheduled_end_date);
        if (plan.estimated_hours && plan.scheduled_start_date) {
            try {
                return format(
                    new Date(new Date(plan.scheduled_start_date).getTime() + plan.estimated_hours * 3_600_000),
                    'HH:mm'
                );
            } catch { return ''; }
        }
        return '';
    };

    const deriveEndDate = () => {
        if (plan.scheduled_end_date) {
            return parseDateString(plan.scheduled_end_date.split('T')[0]);
        }
        // If no end date but we have start date and estimated hours, calculate end date
        if (plan.estimated_hours && plan.scheduled_start_date) {
            try {
                const startDate = new Date(plan.scheduled_start_date);
                const endDate = new Date(startDate.getTime() + plan.estimated_hours * 3_600_000);
                return parseDateString(format(endDate, 'yyyy-MM-dd'));
            } catch { return undefined; }
        }
        // Fallback to start date
        return parseDateString(plan.scheduled_start_date?.split('T')[0]);
    };


    const buildDraft = () => ({
        workstation_id: String(plan.workstation_id ?? ''),
        operator_id: String(plan.operator_id ?? ''),
        start_date: parseDateString(plan.scheduled_start_date?.split('T')[0]),
        start_time: parseTimeFromISO(plan.scheduled_start_date),
        end_date: deriveEndDate(),
        end_time: deriveEndTime(),
        // estimated_hours: plan.estimated_hours ? String(plan.estimated_hours) : '',
        notes: plan.notes ?? '',
        sequence: plan.sequence ?? 1,
    });

    const [draft, setDraft] = useState(buildDraft);
    const patch = (p: Partial<typeof draft>) => setDraft(d => ({ ...d, ...p }));

    const handleCancel = () => { setDraft(buildDraft()); setIsEditing(false); };

    const selectedWorkstation = workstationsForSection.find(w => String(w.id) === draft.workstation_id);
    const allowedOperatorIds = selectedWorkstation?.operator_ids?.map(String) || [];
    const filteredEmployees = allowedOperatorIds.length > 0
        ? employees.filter(emp => allowedOperatorIds.includes(String(emp.id)))
        : [];

    useEffect(() => {
        if (draft.operator_id && allowedOperatorIds.length > 0 && !allowedOperatorIds.includes(draft.operator_id)) {
            patch({ operator_id: '' });
        }
    }, [draft.workstation_id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const startDateStr = draft.start_date ? formatDate(draft.start_date) : '';
            const endDateStr = draft.end_date ? formatDate(draft.end_date) : startDateStr; // fallback to start date
            const scheduledStart = startDateStr && draft.start_time ? `${startDateStr}T${draft.start_time}:00` : undefined;
            const scheduledEnd = endDateStr && draft.end_time ? `${endDateStr}T${draft.end_time}:00` : undefined;

            // Use manual estimated_hours if provided, otherwise calculate from times
            const manualHours = draft.estimated_hours ? parseFloat(draft.estimated_hours) : null;
            const diffMs = scheduledStart && scheduledEnd
                ? new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime() : 0;
           let estimatedHours = plan.estimated_hours;
if (scheduledStart && scheduledEnd) {
    const diffMs = new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime();
    if (diffMs > 0) {
        estimatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }
}

            await updateShopPlan({
                plan_id: Number(plan.id),
                data: {
                    stage: {
                        planning_section_id: plan.planning_section_id,
                        workstation_id: Number(draft.workstation_id) || undefined,
                        operator_ids: draft.operator_id ? [Number(draft.operator_id)] : undefined,
                        estimated_hours: estimatedHours,
                        notes: draft.notes || undefined,
                        sequence: Number(draft.sequence) || 1,
                        ...(scheduledStart && { scheduled_start: scheduledStart }),
                        ...(scheduledEnd && { scheduled_end: scheduledEnd }),
                    },
                },
            } as any).unwrap();

            toast.success(`${sectionLabel} updated.`);
            setIsEditing(false);
            onSaved();
        } catch {
            // toast.error('Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const wsName = workstations.find(w => String(w.id) === String(plan.workstation_id))?.name
        || workstations.find(w => String(w.id) === String(plan.workstation_id))?.workstation_name
        || '—';
    const opName = (() => {
        const emp = employees.find(e => String(e.id) === String(plan.operator_id));
        if (!emp) return '—';
        return `${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.trim() || emp.email || '—';
    })();

    const planPct = plan.work_percentage || 0;

    return (
        <Card className="border border-[#e2e4ed] shadow-sm">
            {/* Header */}
            <CardHeader className="py-3 px-4 border-b border-[#e2e4ed] flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge
                        className="text-xs font-semibold px-2 py-0.5"
                        style={{
                            backgroundColor: planPct === 100 ? '#dcfce7' : '#f0f4e8',
                            color: planPct === 100 ? '#166534' : '#4b6a05',
                            border: 'none',
                        }}
                    >
                        {sectionLabel}
                    </Badge>
                    {planPct === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <Select value={String(draft.sequence)} onValueChange={v => patch({ sequence: v })}>
                            <SelectTrigger className="h-7 w-auto text-xs border-[#e2e4ed]">
                                <SelectValue placeholder="Seq" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                                {sequenceOptions.map(num => (
                                    <SelectItem key={num} value={String(num)}>Seq: {num}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            <Badge variant="outline" className="text-xs font-normal">
                                Seq: {plan.sequence ?? null}
                            </Badge>
                            <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-[#7c8689] hover:text-[#4b545d]"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-4">
                {isEditing ? (
                    <div className="flex flex-col gap-4">
                        {/* Workstation */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Workstation</Label>
                            <Select
                                value={draft.workstation_id}
                                onValueChange={v => patch({ workstation_id: v, operator_id: '' })}
                                disabled={isLoadingWorkstations}
                            >
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                    <SelectValue
                                        placeholder={
                                            isLoadingWorkstations
                                                ? 'Loading workstations…'
                                                : workstationsForSection.length === 0
                                                    ? 'No workstations for this stage'
                                                    : 'Select workstation'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] overflow-y-auto">
                                    {workstationsForSection.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No workstations assigned to this stage
                                        </div>
                                    ) : (
                                        workstationsForSection.map((ws: any) => (
                                            <SelectItem key={ws.id} value={String(ws.id)}>
                                                {ws.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Operator */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operator</Label>
                            <Select
                                value={draft.operator_id}
                                onValueChange={v => patch({ operator_id: v })}
                                disabled={!draft.workstation_id}
                            >
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                    <SelectValue
                                    
                                        placeholder={
                                            !draft.workstation_id
                                                ? 'Select a workstation first'
                                                : filteredEmployees.length === 0
                                                    ? 'No operators assigned to this workstation'
                                                    : 'Select operator'
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

                        {/* Scheduled Date */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Scheduled Date</Label>
                            <DateTimePicker
                                mode="date"
                                value={draft.start_date}
                                onChange={date => patch({ start_date: date })}
                            // minDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                            />
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Date</Label>
                            <DateTimePicker
                                mode="date"
                                value={draft.end_date}
                                onChange={date => patch({ end_date: date })}
                            />
                        </div>

                        {/* Start / End Time */}
                        <div className="">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Time</Label>
                                <Select value={draft.start_time} onValueChange={v => patch({ start_time: v })}>
                                    <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                        <SelectValue placeholder="Start" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] overflow-y-auto">
                                        {TIME_SLOTS.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Time</Label>
                                <Select value={draft.end_time} onValueChange={v => patch({ end_time: v })}>
                                    <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                        <SelectValue placeholder="End" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px] overflow-y-auto">
                                        {TIME_SLOTS
                                            .filter(s => !draft.start_time || s.value > draft.start_time)
                                            .map(s => (
                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Estimated Hours */}
                        {/* <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Est. Hours</Label>
                            <Input
                                type="number"
                                step="0.25"
                                min="0"
                                placeholder="Auto-calculated from times"
                                value={draft.estimated_hours}
                                onChange={e => patch({ estimated_hours: e.target.value })}
                                className="h-[38px] border-[#e2e4ed] text-sm"
                            />
                        </div> */}

                        {/* Notes */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                            <Textarea
                                value={draft.notes}
                                onChange={e => patch({ notes: e.target.value })}
                                placeholder="Add notes..."
                                className="min-h-[72px] resize-none text-sm border-[#e2e4ed]"
                            />
                        </div>

                        {/* Save / Cancel */}
                        <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
                                {isSaving
                                    ? <><LoaderCircle className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                                    : <><Save className="h-3.5 w-3.5 mr-1.5" />Save</>}
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1" onClick={handleCancel} disabled={isSaving}>
                                <X className="h-3.5 w-3.5 mr-1.5" />Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <MiniProgress percent={planPct} />
                        <Separator className="my-0.5" />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <InfoRow label="Workstation" value={wsName} />
                            <InfoRow label="Operator" value={opName} />
                            <InfoRow
                                label="Scheduled Start"
                                value={plan.scheduled_start_date
                                    ? format(new Date(plan.scheduled_start_date), 'MMM dd, yyyy HH:mm')
                                    : '—'}
                            />
                            <InfoRow
                                label="Est. Hours"
                                value={plan.estimated_hours ? `${plan.estimated_hours}h` : '—'}
                            />
                        </div>
                        {plan.notes && (
                            <p className="text-xs text-muted-foreground bg-[#f9f9f9] border border-[#e2e4ed] rounded px-2.5 py-1.5 mt-0.5">
                                {plan.notes}
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const FabDetailsPage: React.FC = () => {
    const { fabId } = useParams<{ fabId: string }>();

    const { data: fabResponse, isLoading, isError, error, refetch } = useGetFabByIdQuery(
        Number(fabId), { skip: !fabId }
    );
    const [createFabNote] = useCreateFabNoteMutation();

    const { data: workstationsData } = useGetWorkstationsQuery();
    const workstations: any[] = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

    const { data: employeesData } = useGetEmployeesQuery();
    const employees: any[] = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);

    // ← usePlanSections used at page level for the sidebar schedule dates label lookup
    const { sections: planSections } = usePlanSections();

    const fab = fabResponse?.data ?? fabResponse;

    // State for file viewer
    const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

    // State for create plan modal
    const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);

    // Build file sources from FAB data (following the same pattern as other pages)
    const fileSources: FileSource[] = (() => {
        if (!fab) return [];
        const sources: FileSource[] = [];

        // Helper to convert API file array into UnifiedFile[]
        const toUnifiedFiles = (files: any[]): UnifiedFile[] =>
            (files ?? []).map((f): UnifiedFile => ({
                id: String(f.id),
                name: f.name || f.filename || `File_${f.id}`,
                size: parseInt(f.file_size) || f.size || 0,
                type: f.file_type || f.mime_type || 'application/octet-stream',
                url: f.file_url || f.url || '',
                stage_name: f.stage_name ?? f.stage,   // ← keep backend's stage_name
                stage: f.stage_name ?? f.stage,
                file_design: f.file_design,
                uploaded_by_name: f.uploaded_by_name ?? f.uploader_name,
                uploadedBy: f.uploaded_by_name ?? f.uploader_name,
                uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
                _raw: f,
            }));

        // Drafting files (from draft_data.files)
        if (fab.draft_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fab.draft_data.files) });
        }
        // SlabSmith files
        if (fab.slabsmith_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fab.slabsmith_data.files) });
        }
        // Sales CT files
        if (fab.sales_ct_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fab.sales_ct_data.files) });
        }
        // CNC files (if you later add cnc_data)
        if (fab.cnc_data?.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fab.cnc_data.files) });
        }
        // Top-level files
        if (fab.files?.length) {
            sources.push({ kind: 'raw', data: toUnifiedFiles(fab.files) });
        }

        return sources;
    })();

    const totalFileCount = fileSources.reduce((count, source) => count + (source.kind === 'raw' ? source.data.length : 0), 0);

    const handleFileClick = (file: UnifiedFile) => {
        setActiveFile(file);
    };

    const [fabNotesOpen, setFabNotesOpen] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    const handleAddNote = async () => {
        if (!noteText.trim()) { toast.warning('Note cannot be empty.'); return; }
        setIsSubmittingNote(true);
        try {
            await createFabNote({ fab_id: Number(fabId), note: noteText.trim(), stage: 'shop_status' }).unwrap();
            toast.success('Note added.');
            setNoteText('');
            setShowNoteInput(false);
            refetch();
        } catch {
            toast.error('Failed to add note.');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    // Prepare clickable links
    const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
    const jobNumberLink = fab?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
        : '#';
    const statusInfo = getFabStatusInfo(fab?.status_id);

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <Skeleton className="h-8 w-72 mb-1" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6 px-4 sm:px-6 lg:px-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                        </div>
                    </div>
                    <Skeleton className="h-[600px] w-full" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <ToolbarHeading title="Error loading FAB" description="Could not load Fab details" />
                </div>
                <div className="p-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : 'Failed to load FAB data'}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    if (!fab) {
        return (
            <div className="flex flex-col min-h-screen">
                <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
                    <ToolbarHeading title="Not Found" description="FAB record not found" />
                </div>
                <div className="p-6">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Not Found</AlertTitle>
                        <AlertDescription>FAB record not found.</AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    const plans: any[] = [...(fab.plans || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const fabNotes: any[] = fab.fab_notes || [];

    const jobInfo = [
        { label: 'FAB ID', value: String(fab.id) },
        {
            label: 'FAB ID',
            value: fab.id
                ? <Link to={`/sales/${fab.id}`} className="text-primary hover:underline">{fab.id}</Link>
                : (fab.id || 'N/A'),
        },
        { label: 'FAB Type', value: <span className="uppercase">{fab.fab_type || 'N/A'}</span> },
        { label: 'Account', value: fab.account_name || 'N/A' },
        { label: 'Job Name', value: fab.job_details?.name || 'N/A' },
        {
            label: 'Job #',
            value: fab.job_details?.id
                ? <Link to={`/job/details/${fab.job_details.id}`} className="text-primary hover:underline">{fab.job_details.job_number}</Link>
                : (fab.job_details?.job_number || 'N/A'),
        },
        { label: 'Area', value: fab.input_area || 'N/A' },
        { label: 'Stone Type', value: fab.stone_type_name || 'N/A' },
        { label: 'Stone Color', value: fab.stone_color_name || 'N/A' },
        { label: 'Stone Thickness', value: fab.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fab.edge_name || 'N/A' },
        { label: 'No. of Pieces', value: String(fab.no_of_pieces || 0) },
        { label: 'Total Sq Ft', value: fab.total_sqft ? `${Number(fab.total_sqft).toFixed(1)} SF` : 'N/A' },
        { label: 'Sales Person', value: fab.sales_person_name || 'N/A' },
        { label: 'Current Stage', value: fab.shop_current_stage ? `${(fab.current_stage || 'N/A').toUpperCase()} (${fab.shop_current_stage.toUpperCase()})` : (fab.current_stage || 'N/A').toUpperCase() },
        { label: '% Complete', value: `${(fab.percent_complete || 0).toFixed(1)}%` },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="px-3 sm:px-4 lg:px-6">
                    <Toolbar className="py-2 sm:py-3">
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                            <ToolbarHeading
                                title={
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                                        <a href={jobNameLink} className="hover:underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {fab?.job_details?.name || `Job ${fab?.job_id}`}
                                        </a>
                                        <span className="mx-1 text-gray-400">·</span>
                                        <a
                                            href={jobNumberLink}
                                            className="hover:underline text-gray-600"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {fab?.job_details?.job_number || fab?.job_id}
                                        </a>
                                    </div>
                                }
                            // description="Fab Details"
                            />
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                    {statusInfo.text}
                                </span>
                                <BackButton />
                            </div>
                        </div>
                    </Toolbar>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6 px-4 sm:px-6 lg:px-8">
                {/* ── LEFT 2/3 ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Job Information */}
                    <Card>
                        <CardHeader><CardTitle>Fab details</CardTitle></CardHeader>
                        <CardContent>
                            {/* Adjusted grid to 4 columns on large screens to match typical dense layout */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-6 gap-x-4">
                                {jobInfo.map((item, i) => (
                                    <InfoRow key={i} label={item.label} value={item.value} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* FAB Files Card - All files from all stages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                                FAB Files
                                {totalFileCount > 0 && (
                                    <span className="ml-2 text-base font-normal text-gray-400">
                                        ({totalFileCount})
                                    </span>
                                )}
                            </CardTitle>
                            <p className="text-sm text-[#4B5563]">
                                Drafting, SlabSmith, CNC, Sales CT, and all other files for this fabrication
                            </p>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-20 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </div>
                            ) : (
                                <FileGallery
                                    sources={fileSources}
                                    onFileClick={handleFileClick}
                                    defaultLayout="card"
                                    emptyMessage="No files have been uploaded for this FAB yet."
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Plans Grid */}
                    <Card>
                        <CardHeader className="border-b pb-4">
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <CardTitle>Plans by Stage</CardTitle>
                                    {plans.length > 0 && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {plans.length} stage{plans.length !== 1 ? 's' : ''} · click the pencil on any card to edit
                                        </p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setShowCreatePlanModal(true)}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Create Plan
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {plans.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No plans assigned to this FAB.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                    {plans.map((plan: any) => (
                                        <PlanStageCard
                                            key={plan.id}
                                            plan={plan}
                                            workstations={workstations}
                                            employees={employees}
                                            totalPlans={plans.length} // ← drives sequence options
                                            onSaved={refetch}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* FAB Notes */}

                    {/* FAB Notes - GraySidebar style, collapsible */}
                    <Card>
                        <Collapsible open={fabNotesOpen} onOpenChange={setFabNotesOpen}>
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer select-none hover:bg-muted/30 transition-colors rounded-t-lg">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                            FAB Notes
                                            {fabNotes.length > 0 && (
                                                <Badge variant="secondary" className="text-xs font-normal ml-1">
                                                    {fabNotes.length}
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${fabNotesOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <CardContent className="pt-0 pb-5">
                                    <Separator className="mb-4" />
                                    <div className="flex justify-end mb-3">
                                        <Button variant="outline" size="sm" className="h-8 text-xs"
                                            onClick={() => setShowNoteInput(v => !v)}>
                                            {showNoteInput
                                                ? <><X className="h-3 w-3 mr-1" />Cancel</>
                                                : <><Pencil className="h-3 w-3 mr-1" />Add Note</>}
                                        </Button>
                                    </div>
                                    {showNoteInput && (
                                        <div className="space-y-2 mb-4">
                                            <Textarea
                                                placeholder="Type your note here..."
                                                className="min-h-[90px] resize-none"
                                                value={noteText}
                                                onChange={e => setNoteText(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm"
                                                    onClick={() => { setShowNoteInput(false); setNoteText(''); }}>
                                                    Cancel
                                                </Button>
                                                <Button size="sm" onClick={handleAddNote} disabled={isSubmittingNote}>
                                                    {isSubmittingNote ? 'Saving...' : 'Save Note'}
                                                </Button>
                                            </div>
                                            <Separator />
                                        </div>
                                    )}
                                    {fabNotes.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {fabNotes.map((note: any, i: number) => {
                                                const cfg = noteStageConfig[note.stage || 'general'] || noteStageConfig.general;
                                                const avatar = note.created_by_name?.charAt(0).toUpperCase() || 'U';
                                                const author = note.created_by_name || 'Unknown';
                                                const timestamp = note.created_at
                                                    ? new Date(note.created_at).toLocaleDateString()
                                                    : 'Unknown date';
                                                return (
                                                    <div key={note.id || i} className="flex gap-3">
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                                            {avatar}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-medium text-gray-900">{author}</span>
                                                                <span className="text-xs text-gray-500">{timestamp}</span>
                                                            </div>
                                                            <div className="text-sm text-gray-700">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.color} bg-gray-100 mr-2`}>
                                                                    {cfg.label}
                                                                </span>
                                                                <span className="text-muted-foreground">{note.note || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div className="border-l space-y-6">

                    {/* Estimated Completion Date */}
                    <Card className="border border-[#e2e4ed] shadow-sm rounded-none border-l-0 border-t-0 border-r-0">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-[#7c8689]" />
                                Estimated Completion Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ShopEstDateField
                                value={fab.shop_est_completion_date}
                                fabId={Number(fabId)}
                                onSaved={refetch}
                            />
                        </CardContent>
                    </Card>

                    {/* Shop Suggested Date */}
                    <Card className="border border-[#e2e4ed] shadow-sm rounded-none border-l-0 border-t-0 border-r-0">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-[#7c8689]" />
                                Shop Suggested Date
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <InfoRow
                                label="Shop Suggested Date"
                                value={safeFormatDate(fab.estimated_completion_date, 'MMM dd, yyyy')}
                            />
                        </CardContent>
                    </Card>

                    {/* Schedule Dates — read-only */}
                    <Card className="border border-[#e2e4ed] shadow-sm rounded-none border-l-0 border-t-0 border-r-0">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#7c8689]" />
                                Schedule Dates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            <InfoRow
                                label="Shop Date Schedule"
                                value={safeFormatDate(fab.shop_date_schedule, 'MMM dd, yyyy')}
                            />
                            <InfoRow
                                label="Install Date"
                                value={safeFormatDate(fab.installation_date, 'MMM dd, yyyy')}
                            />
                            {/* ← Uses planSections from hook instead of hardcoded stageMapping */}
                            {plans.map((plan: any) => {
                                const section = planSections.find(s => s.id === plan.planning_section_id);
                                if (!section || !plan.scheduled_start_date) return null;
                                return (
                                    <InfoRow
                                        key={plan.id}
                                        label={`${section.plan_name} Date`}
                                        value={safeFormatDate(plan.scheduled_start_date, 'MMM dd, yyyy')}
                                    />
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Full-screen file viewer modal */}
            {activeFile && (
                <div className="fixed inset-0 z-50 bg-white overflow-auto">
                    <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
                </div>
            )}

            {/* Create Plan Modal */}
            <CreatePlanSheet
                open={showCreatePlanModal}
                onOpenChange={setShowCreatePlanModal}
                prefillFabId={fabId}
                hideAddStageButton={true}
                onEventCreated={() => {
                    refetch();
                }}
            />
        </div>
    );
};

export { FabDetailsPage };