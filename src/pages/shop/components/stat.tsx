import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    ArrowLeft, CalendarDays, Layers, Wrench,
    ClipboardList, MessageSquare, CheckCircle2,
    Clock, AlertCircle, Pencil, Save, X,
    LoaderCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
    useGetFabByIdQuery,
    useUpdateFabMutation,
    useCreateFabNoteMutation,
} from '@/store/api/job';
import { useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';

// ── 15-minute time slots (06:00 – 22:00) ─────────────────────────────────
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

// ------------------ Helpers ------------------
const parseDateString = (dateString: string | undefined): Date | undefined => {
    if (!dateString) return undefined;
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
};

const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatDisplay = (dateStr: string | undefined) =>
    dateStr ? format(new Date(dateStr), 'MMM dd, yyyy') : '—';

const parseTimeFromISO = (isoStr: string | undefined): string => {
    if (!isoStr) return '';
    try { return format(new Date(isoStr), 'HH:mm'); } catch { return ''; }
};

// ------------------ Stage mapping ------------------
const stageMapping: Record<number, { label: string; unit: string; order: number }> = {
    7: { label: 'CUT',        unit: 'SF', order: 1 },
    8: { label: 'WJ',         unit: 'LF', order: 2 },
    9: { label: 'EDGING',     unit: 'LF', order: 3 },
    2: { label: 'MITER',      unit: 'LF', order: 4 },
    1: { label: 'CNC',        unit: 'LF', order: 5 },
    6: { label: 'TOUCHUP QA', unit: 'SF', order: 6 },
};

// ------------------ Mini Progress Bar ------------------
const MiniProgress: React.FC<{ percent: number }> = ({ percent }) => {
    const p = percent || 0;
    const color =
        p === 100 ? '#4caf50' :
            p >= 75 ? '#2196f3' :
                p >= 50 ? '#ff9800' :
                    p >= 25 ? '#f44336' : '#9e9e9e';
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 bg-[#e2e4ed] rounded-full h-[6px] overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-xs text-[#4b545d] w-10 text-right shrink-0">{p.toFixed(1)}%</span>
        </div>
    );
};

// ------------------ Info Row ------------------
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#7c8689] font-medium uppercase tracking-wide">{label}</span>
        <span className="text-sm text-[#4b545d]">{value || '—'}</span>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PlanStageCard — one card per stage with pencil → inline edit → save/cancel
// ─────────────────────────────────────────────────────────────────────────────
interface PlanStageCardProps {
    plan: any;
    workstations: any[];
    employees: any[];
    onSaved: () => void;
}

const PlanStageCard: React.FC<PlanStageCardProps> = ({ plan, workstations, employees, onSaved }) => {
    const [updateShopPlan] = useUpdateShopPlanMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const stageInfo = stageMapping[plan.planning_section_id];

    // Derive end time from scheduled_end_date or estimated_hours
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

    const buildDraft = () => ({
        workstation_id:  String(plan.workstation_id  ?? ''),
        operator_id:     String(plan.operator_id     ?? ''),
        start_date:      parseDateString(plan.scheduled_start_date?.split('T')[0]),
        start_time:      parseTimeFromISO(plan.scheduled_start_date),
        end_time:        deriveEndTime(),
        work_percentage: String(plan.work_percentage ?? 0),
        notes:           plan.notes ?? '',
    });

    const [draft, setDraft] = useState(buildDraft);
    const patch = (p: Partial<typeof draft>) => setDraft(d => ({ ...d, ...p }));

    const handleCancel = () => { setDraft(buildDraft()); setIsEditing(false); };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const dateStr       = draft.start_date ? formatDate(draft.start_date) : '';
            const scheduledStart = dateStr && draft.start_time ? `${dateStr}T${draft.start_time}:00` : undefined;
            const scheduledEnd   = dateStr && draft.end_time   ? `${dateStr}T${draft.end_time}:00`   : undefined;

            const diffMs = scheduledStart && scheduledEnd
                ? new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime()
                : 0;
            const estimatedHours = diffMs > 0
                ? Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
                : plan.estimated_hours;

            const stageObj: any = {
                planning_section_id: plan.planning_section_id,
                workstation_id:      Number(draft.workstation_id) || undefined,
                operator_ids:        draft.operator_id ? [Number(draft.operator_id)] : undefined,
                estimated_hours:     estimatedHours,
                work_percentage:     Number(draft.work_percentage),
                notes:               draft.notes || undefined,
                ...(scheduledStart && { scheduled_start: scheduledStart }),
                ...(scheduledEnd   && { scheduled_end:   scheduledEnd   }),
            };

            await updateShopPlan({ plan_id: Number(plan.id), data: { stage: stageObj } } as any).unwrap();
            toast.success(`${stageInfo?.label ?? 'Plan'} updated.`);
            setIsEditing(false);
            onSaved();
        } catch {
            toast.error('Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    // Read-mode display helpers
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
                            color:           planPct === 100 ? '#166534' : '#4b6a05',
                            border: 'none',
                        }}
                    >
                        {stageInfo?.label ?? `Section ${plan.planning_section_id}`}
                    </Badge>
                    {planPct === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
                {!isEditing && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[#7c8689] hover:text-[#4b545d]"
                        onClick={() => setIsEditing(true)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="pt-4 px-4 pb-4">
                {isEditing ? (
                    /* ── EDIT MODE ── */
                    <div className="flex flex-col gap-4">

                        {/* Workstation */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Workstation</Label>
                            <Select value={draft.workstation_id} onValueChange={v => patch({ workstation_id: v })}>
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
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
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Operator</Label>
                            <Select value={draft.operator_id} onValueChange={v => patch({ operator_id: v })}>
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
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

                        {/* Scheduled Date */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Scheduled Date</Label>
                            <DateTimePicker
                                mode="date"
                                value={draft.start_date}
                                onChange={date => patch({ start_date: date })}
                            />
                        </div>

                        {/* Start / End Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Start Time</Label>
                                <Select value={draft.start_time} onValueChange={v => patch({ start_time: v })}>
                                    <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                        <SelectValue placeholder="Start" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {TIME_SLOTS.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-[#7c8689] uppercase tracking-wide">End Time</Label>
                                <Select value={draft.end_time} onValueChange={v => patch({ end_time: v })}>
                                    <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                        <SelectValue placeholder="End" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {TIME_SLOTS
                                            .filter(s => !draft.start_time || s.value > draft.start_time)
                                            .map(s => (
                                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Work % */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Work % Complete</Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    min={0} max={100} step={1}
                                    value={draft.work_percentage}
                                    onChange={e => patch({ work_percentage: e.target.value })}
                                    className="h-[38px] w-24 border-[#e2e4ed] text-sm"
                                />
                                <div className="flex-1">
                                    <MiniProgress percent={Number(draft.work_percentage) || 0} />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-[#7c8689] uppercase tracking-wide">Notes</Label>
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
                    /* ── READ MODE ── */
                    <div className="flex flex-col gap-3">
                        <MiniProgress percent={planPct} />
                        <Separator className="my-0.5" />
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <InfoRow label="Workstation" value={wsName} />
                            <InfoRow label="Operator"    value={opName} />
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
                            <p className="text-xs text-[#7c8689] bg-[#f9f9f9] border border-[#e2e4ed] rounded px-2.5 py-1.5 mt-0.5">
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
    const navigate = useNavigate();

    const { data: fabResponse, isLoading, refetch } = useGetFabByIdQuery(Number(fabId), { skip: !fabId });
    const [updateFab]      = useUpdateFabMutation();
    const [createFabNote]  = useCreateFabNoteMutation();

    const { data: workstationsData } = useGetWorkstationsQuery();
    const workstations: any[] = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);

    const { data: employeesData } = useGetEmployeesQuery();
    const employees: any[] = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);

    const fab = fabResponse?.data ?? fabResponse;

    // ---- Estimated completion date ----
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [editedDate,    setEditedDate]    = useState<Date | undefined>(undefined);
    const [isSavingDate,  setIsSavingDate]  = useState(false);

    // ---- Notes ----
    const [noteText,          setNoteText]          = useState('');
    const [isSubmittingNote,  setIsSubmittingNote]   = useState(false);
    const [showNoteInput,     setShowNoteInput]      = useState(false);

    useEffect(() => {
        if (fab?.estimated_completion_date) {
            setEditedDate(parseDateString(fab.estimated_completion_date));
        }
    }, [fab?.estimated_completion_date]);

    const handleSaveDate = async () => {
        if (!fabId) return;
        setIsSavingDate(true);
        try {
            await updateFab({
                id: Number(fabId),
                data: { estimated_completion_date: formatDate(editedDate) },
            }).unwrap();
            toast.success('Estimated completion date updated.');
            setIsEditingDate(false);
            refetch();
        } catch {
            toast.error('Failed to update date.');
        } finally {
            setIsSavingDate(false);
        }
    };

    const handleCancelDate = () => {
        setEditedDate(fab?.estimated_completion_date ? parseDateString(fab.estimated_completion_date) : undefined);
        setIsEditingDate(false);
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) { toast.warning('Note cannot be empty.'); return; }
        setIsSubmittingNote(true);
        try {
            await createFabNote({
                fab_id: Number(fabId),
                note: noteText.trim(),
                stage: 'shop_status',
            }).unwrap();
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

    // ---- Loading / not found ----
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-[#7c8689] text-sm">Loading FAB details…</p>
            </div>
        );
    }

    if (!fab) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-[#4b545d]">FAB not found.</p>
                <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
            </div>
        );
    }

    // Sort plans by defined stage order
    const plans: any[] = [...(fab.plans || [])].sort((a, b) => {
        const oa = stageMapping[a.planning_section_id]?.order ?? 99;
        const ob = stageMapping[b.planning_section_id]?.order ?? 99;
        return oa - ob;
    });

    const notes: string[] = Array.isArray(fab.notes)
        ? fab.notes
        : fab.notes ? [fab.notes] : [];

    const jobParts = [
        fab.account_name,
        fab.job_details?.name,
        fab.input_area ? `Area: ${fab.input_area}` : '',
    ].filter(Boolean);
    const stoneParts = [fab.stone_type_name, fab.stone_color_name, fab.stone_thickness_value, fab.edge_name].filter(Boolean);
    const overallPct = fab.percent_complete || 0;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-[#7c8689] hover:text-[#4b545d]"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-xl font-semibold text-[#4b545d]">FAB #{fabId}</h1>
                    {jobParts.length > 0 && (
                        <p className="text-sm text-[#7c8689]">{jobParts.join(' · ')}</p>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal text-[#4b545d] border-[#e2e4ed]">
                        {fab.fab_type || 'N/A'}
                    </Badge>
                    <Badge
                        className="text-xs"
                        style={{
                            backgroundColor: overallPct === 100 ? '#dcfce7' : overallPct >= 50 ? '#dbeafe' : '#fef9c3',
                            color:           overallPct === 100 ? '#166534' : overallPct >= 50 ? '#1e40af' : '#854d0e',
                            border: 'none',
                        }}
                    >
                        {overallPct.toFixed(1)}% Complete
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ═══ LEFT (2/3): FAB Info + Stage Cards + Notes ═══ */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* FAB Info */}
                    <Card className="border border-[#e2e4ed] shadow-sm">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <Layers className="h-4 w-4 text-[#7c8689]" />
                                FAB Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <InfoRow label="Job No"        value={fab.job_details?.job_number || fab.job_no} />
                            <InfoRow label="FAB ID"        value={fab.id} />
                            <InfoRow label="FAB Type"      value={fab.fab_type} />
                            <InfoRow label="Account"       value={fab.account_name} />
                            <InfoRow label="Job Name"      value={fab.job_details?.name} />
                            <InfoRow label="Input Area"    value={fab.input_area} />
                            <InfoRow label="No. of Pieces" value={fab.no_of_pieces} />
                            <InfoRow label="Total Sq Ft"   value={fab.total_sqft ? `${Number(fab.total_sqft).toFixed(1)} SF` : undefined} />
                            {stoneParts.length > 0 && (
                                <div className="col-span-2 sm:col-span-3">
                                    <InfoRow label="Stone" value={stoneParts.join(' · ')} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Plans by Stage */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-1">
                            <ClipboardList className="h-4 w-4 text-[#7c8689]" />
                            <h2 className="text-sm font-semibold text-[#4b545d]">
                                Plans by Stage ({plans.length})
                            </h2>
                        </div>

                        {plans.length === 0 ? (
                            <Card className="border border-[#e2e4ed] shadow-sm">
                                <CardContent className="py-10 text-center text-sm text-[#7c8689]">
                                    No plans assigned to this FAB.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {plans.map((plan: any) => (
                                    <PlanStageCard
                                        key={plan.id}
                                        plan={plan}
                                        workstations={workstations}
                                        employees={employees}
                                        onSaved={refetch}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <Card className="border border-[#e2e4ed] shadow-sm">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed] flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-[#7c8689]" />
                                Notes ({notes.length})
                            </CardTitle>
                            <Button
                                variant="outline" size="sm"
                                className="h-7 text-xs border-[#e2e4ed]"
                                onClick={() => setShowNoteInput(v => !v)}
                            >
                                {showNoteInput
                                    ? <><X className="h-3 w-3 mr-1" />Cancel</>
                                    : <><Pencil className="h-3 w-3 mr-1" />Add Note</>}
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            {showNoteInput && (
                                <div className="flex flex-col gap-2">
                                    <Textarea
                                        placeholder="Type your note here..."
                                        className="min-h-[90px] resize-none text-sm"
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { setShowNoteInput(false); setNoteText(''); }}>
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleAddNote} disabled={isSubmittingNote}>
                                            {isSubmittingNote ? 'Saving...' : 'Save Note'}
                                        </Button>
                                    </div>
                                    <Separator />
                                </div>
                            )}
                            {notes.length === 0 ? (
                                <p className="text-sm text-[#7c8689] text-center py-4">No notes yet.</p>
                            ) : (
                                notes.map((note, i) => (
                                    <div key={i} className="text-sm text-[#4b545d] bg-[#f9f9f9] rounded-md px-3 py-2 border border-[#e2e4ed]">
                                        {note}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ═══ RIGHT (1/3): Dates + Stage Progress Summary ═══ */}
                <div className="flex flex-col gap-6">

                    {/* Estimated Completion Date — editable */}
                    <Card className="border border-[#e2e4ed] shadow-sm">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed] flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-[#7c8689]" />
                                Est. Completion Date
                            </CardTitle>
                            {!isEditingDate && (
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-[#7c8689] hover:text-[#4b545d]"
                                    onClick={() => setIsEditingDate(true)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            {isEditingDate ? (
                                <>
                                    <DateTimePicker
                                        mode="date"
                                        value={editedDate}
                                        onChange={date => setEditedDate(date)}
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1" onClick={handleSaveDate} disabled={isSavingDate}>
                                            <Save className="h-3.5 w-3.5 mr-1.5" />
                                            {isSavingDate ? 'Saving…' : 'Save'}
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={handleCancelDate} disabled={isSavingDate}>
                                            <X className="h-3.5 w-3.5 mr-1.5" />Cancel
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-[#7c8689]" />
                                    <span className="text-sm text-[#4b545d] font-medium">
                                        {formatDisplay(fab.estimated_completion_date)}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Schedule Dates (read-only) */}
                    <Card className="border border-[#e2e4ed] shadow-sm">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#7c8689]" />
                                Schedule Dates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            <InfoRow label="Shop Date Schedule" value={formatDisplay(fab.shop_date_schedule)} />
                            <InfoRow label="Install Date"       value={formatDisplay(fab.installation_date)} />
                            <InfoRow
                                label="Cut Date Scheduled"
                                value={
                                    fab.plans?.find((p: any) => p.planning_section_id === 7)?.scheduled_start_date
                                        ? formatDisplay(fab.plans.find((p: any) => p.planning_section_id === 7)?.scheduled_start_date)
                                        : '—'
                                }
                            />
                        </CardContent>
                    </Card>

                    {/* Stage Progress — quick overview */}
                    {/* <Card className="border border-[#e2e4ed] shadow-sm">
                        <CardHeader className="pb-3 border-b border-[#e2e4ed]">
                            <CardTitle className="text-sm font-semibold text-[#4b545d] flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-[#7c8689]" />
                                Stage Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 flex flex-col gap-3">
                            {plans.length === 0 ? (
                                <p className="text-sm text-[#7c8689] text-center py-2">No stages.</p>
                            ) : (
                                plans.map((plan: any) => {
                                    const si  = stageMapping[plan.planning_section_id];
                                    const pct = plan.work_percentage || 0;
                                    return (
                                        <div key={plan.id} className="flex items-center gap-3">
                                            <span className="text-xs text-[#7c8689] w-20 shrink-0">
                                                {si?.label || `#${plan.planning_section_id}`}
                                            </span>
                                            <div className="flex-1">
                                                <MiniProgress percent={pct} />
                                            </div>
                                            {pct === 100 && (
                                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card> */}
                </div>
            </div>
        </div>
    );
};

export { FabDetailsPage };