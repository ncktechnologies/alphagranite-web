import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { format, addHours } from 'date-fns';
import { toast } from 'sonner';
import {
    AlertCircle, Pencil, X, LoaderCircle,
    CheckCircle2, Clock, CalendarDays, ChevronDown,
    MessageSquare, ArrowRight, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import {
    useGetFabByIdQuery,
    useUpdateFabMutation,
    useCreateFabNoteMutation,
} from '@/store/api/job';
import { useUpdateShopPlanMutation } from '@/store/api';
import { useGetWorkstationsQuery, useGetWorkStationByPlanningSectionsQuery } from '@/store/api/workstation';
import { useGetEmployeesQuery } from '@/store/api/employee';

// ----------------------------------------------------------------------
// Constants & Helpers
// ----------------------------------------------------------------------

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

const SEQUENCE_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

const stageMapping: Record<number, { label: string; unit: string; order: number }> = {
    7: { label: 'CUT', unit: 'SF', order: 1 },
    8: { label: 'WJ', unit: 'LF', order: 2 },
    9: { label: 'EDGING', unit: 'LF', order: 3 },
    2: { label: 'MITER', unit: 'LF', order: 4 },
    1: { label: 'CNC', unit: 'LF', order: 5 },
    6: { label: 'TOUCHUP QA', unit: 'SF', order: 6 },
};

const noteStageConfig: Record<string, { label: string; color: string }> = {
    shop_status: { label: 'Shop Status', color: 'text-blue-700' },
    templating: { label: 'Templating', color: 'text-blue-700' },
    pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
    drafting: { label: 'Drafting', color: 'text-green-700' },
    cut_list: { label: 'Final Programming', color: 'text-purple-700' },
    cutting: { label: 'Cutting', color: 'text-orange-700' },
    install_scheduling: { label: 'Install Scheduling', color: 'text-teal-700' },
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDisplay = (dateStr: string | undefined) =>
    dateStr ? format(new Date(dateStr), 'MMM dd, yyyy') : '—';

const parseTimeFromISO = (isoStr: string | undefined): string => {
    if (!isoStr) return '';
    try { return format(new Date(isoStr), 'HH:mm'); } catch { return ''; }
};

const calcScheduledEnd = (startISO: string | undefined, estimatedHours: number | undefined): string | undefined => {
    if (!startISO || !estimatedHours) return undefined;
    try { return addHours(new Date(startISO), estimatedHours).toISOString(); } catch { return undefined; }
};

// ----------------------------------------------------------------------
// Mini Progress Bar
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// Info Row
// ----------------------------------------------------------------------
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        <span className="text-sm text-text">{value || '—'}</span>
    </div>
);

// ----------------------------------------------------------------------
// Editable Shop Est. Completion Date (separate card now)
// ----------------------------------------------------------------------
const ShopEstDateField: React.FC<{ value: string | undefined; fabId: number; onSaved: () => void }> = ({
    value, fabId, onSaved,
}) => {
    const [updateFab] = useUpdateFabMutation();
    const [isEditing, setIsEditing] = useState(false);
    const [editedDate, setEditedDate] = useState<Date | undefined>(parseDateString(value?.split('T')[0]));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setEditedDate(parseDateString(value?.split('T')[0])); }, [value]);

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
                        onClick={() => { setEditedDate(parseDateString(value?.split('T')[0])); setIsEditing(false); }}
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
                    {value ? format(new Date(value), 'MMM dd, yyyy') : <span className="text-muted-foreground">—</span>}
                </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-text"
                onClick={() => setIsEditing(true)}>
                <Pencil className="h-3 w-3" />
            </Button>
        </div>
    );
};

// ----------------------------------------------------------------------
// PlanStageCard (with sequence dropdown in header)
// ----------------------------------------------------------------------
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
    const { data: workstationData, isLoading: isLoadingWorkstations } = useGetWorkStationByPlanningSectionsQuery(
        plan.planning_section_id,
        { skip: !plan.planning_section_id }
    );
    const workstationsForSection = workstationData?.workstations || [];

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
        workstation_id: String(plan.workstation_id ?? ''),
        operator_id: String(plan.operator_id ?? ''),
        start_date: parseDateString(plan.scheduled_start_date?.split('T')[0]),
        start_time: parseTimeFromISO(plan.scheduled_start_date),
        end_time: deriveEndTime(),
        work_percentage: String(plan.work_percentage ?? 0),
        notes: plan.notes ?? '',
        sequence: plan.sequence ?? 1,
    });

    const [draft, setDraft] = useState(buildDraft);
    const patch = (p: Partial<typeof draft>) => setDraft(d => ({ ...d, ...p }));

    const handleCancel = () => { setDraft(buildDraft()); setIsEditing(false); };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const dateStr = draft.start_date ? formatDate(draft.start_date) : '';
            const scheduledStart = dateStr && draft.start_time ? `${dateStr}T${draft.start_time}:00` : undefined;
            const scheduledEnd = dateStr && draft.end_time ? `${dateStr}T${draft.end_time}:00` : undefined;

            const diffMs = scheduledStart && scheduledEnd
                ? new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime()
                : 0;
            const estimatedHours = diffMs > 0
                ? Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
                : plan.estimated_hours;

            const stageObj: any = {
                planning_section_id: plan.planning_section_id,
                workstation_id: Number(draft.workstation_id) || undefined,
                operator_ids: draft.operator_id ? [Number(draft.operator_id)] : undefined,
                estimated_hours: estimatedHours,
                work_percentage: Number(draft.work_percentage),
                notes: draft.notes || undefined,
                sequence: Number(draft.sequence) || 1,
                ...(scheduledStart && { scheduled_start: scheduledStart }),
                ...(scheduledEnd && { scheduled_end: scheduledEnd }),
            };

            await updateShopPlan({ plan_id: Number(plan.id), data: { stage: stageObj } } as any).unwrap();
            toast.success(`${stageInfo?.label ?? 'Plan'} updated.`);
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

    const selectedWorkstation = workstationsForSection.find(w => String(w.id) === draft.workstation_id);
    const allowedOperatorIds = selectedWorkstation?.operator_ids?.map(String) || [];
    const filteredEmployees = employees.filter(emp => allowedOperatorIds.includes(String(emp.id)));

    // If current operator is not allowed (e.g., after workstation change), reset it
    useEffect(() => {
        if (draft.operator_id && !allowedOperatorIds.includes(draft.operator_id)) {
            patch({ operator_id: '' });
        }
    }, [draft.workstation_id, allowedOperatorIds]);

    const planPct = plan.work_percentage || 0;

    return (
        <Card className="border border-[#e2e4ed] shadow-sm">
            {/* Header with sequence on the right */}
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
                        {stageInfo?.label ?? `Section ${plan.planning_section_id}`}
                    </Badge>
                    {planPct === 100 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        // Sequence dropdown in edit mode
                        <Select value={String(draft.sequence)} onValueChange={v => patch({ sequence: v })}>
                            <SelectTrigger className="h-7 w-16 text-xs border-[#e2e4ed]">
                                <SelectValue placeholder="Seq" />
                            </SelectTrigger>
                            <SelectContent>
                                {SEQUENCE_OPTIONS.map(num => (
                                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            {/* Sequence badge in read mode */}
                            <Badge variant="outline" className="text-xs font-normal">
                                Seq: {plan.sequence ?? 1}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
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
                            <Select value={draft.workstation_id} onValueChange={v => patch({ workstation_id: v })}>
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                    <SelectValue placeholder={isLoadingWorkstations ? "Loading..." : "Select workstation"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {workstationsForSection.map((ws: any) => (
                                        <SelectItem key={ws.id} value={String(ws.id)}>
                                            {ws.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Operator */}
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Operator</Label>
                            <Select value={draft.operator_id} onValueChange={v => patch({ operator_id: v })}>
                                <SelectTrigger className="h-[38px] border-[#e2e4ed] text-sm">
                                    <SelectValue placeholder="Select operator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredEmployees.map((emp: any) => (
                                        <SelectItem key={emp.id} value={String(emp.id)}>
                                            {`${emp.first_name || emp.name || ''} ${emp.last_name || ''}`.trim() || emp.email}
                                        </SelectItem>
                                    ))}
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
                            />
                        </div>

                        {/* Start / End Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Start Time</Label>
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
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">End Time</Label>
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
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Work % Complete</Label>
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

// ----------------------------------------------------------------------
// Main Page
// ----------------------------------------------------------------------
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

    const fab = fabResponse?.data ?? fabResponse;

    // Fab notes state
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

    // Loading / error states
    if (isLoading) {
        return (
            <Container className="border-t">
                <div className="mb-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 mt-2" /></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between"><Skeleton className="h-6 w-40" /><Skeleton className="h-8 w-24" /></div>
                        <Card><CardHeader><Skeleton className="h-6 w-40" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                        </div>
                    </div>
                    <Skeleton className="h-[600px] w-full" />
                </div>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container className="border-t">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to load FAB details. {error && 'Please try again later.'}</AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!fab) {
        return (
            <Container className="border-t">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>FAB record not found.</AlertDescription>
                </Alert>
            </Container>
        );
    }

    const plans: any[] = [...(fab.plans || [])].sort((a, b) => {
        const oa = stageMapping[a.planning_section_id]?.order ?? 99;
        const ob = stageMapping[b.planning_section_id]?.order ?? 99;
        return oa - ob;
    });

    const fabNotes: any[] = fab.fab_notes || [];

    const jobInfo = [
        { label: 'FAB ID', value: String(fab.id) },
        { label: 'FAB Type', value: <span className="uppercase">{fab.fab_type || 'N/A'}</span> },
        { label: 'Account', value: fab.account_name || 'N/A' },
        { label: 'Job Name', value: fab.job_details?.name || 'N/A' },
        {
            label: 'Job #', value: fab.job_details?.id
                ? <Link to={`/job/details/${fab.job_details.id}`} className="text-primary hover:underline">{fab.job_details.job_number}</Link>
                : (fab.job_details?.job_number || 'N/A')
        },
        { label: 'Input Area', value: fab.input_area || 'N/A' },
        { label: 'Stone Type', value: fab.stone_type_name || 'N/A' },
        { label: 'Stone Color', value: fab.stone_color_name || 'N/A' },
        { label: 'Stone Thickness', value: fab.stone_thickness_value || 'N/A' },
        { label: 'Edge', value: fab.edge_name || 'N/A' },
        { label: 'No. of Pieces', value: String(fab.no_of_pieces || 0) },
        { label: 'Total Sq Ft', value: fab.total_sqft ? `${Number(fab.total_sqft).toFixed(1)} SF` : 'N/A' },
        { label: 'Sales Person', value: fab.sales_person_name || 'N/A' },
        { label: 'Current Stage', value: fab.current_stage || 'N/A' },
        { label: '% Complete', value: `${(fab.percent_complete || 0).toFixed(1)}%` },
    ];

    return (
        <Container className="border-t">
            {/* <Toolbar>
                <ToolbarHeading
                    title={fab.job_details?.name || `FAB #${fabId}`}
                    description={`Job #${fab.job_details?.job_number || fab.job_id || fabId}`}
                />
            </Toolbar> */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* LEFT 2/3 */}
                <div className="lg:col-span-2 space-y-6">



                    {/* Job Information Card */}
                    <Card>
                        <CardHeader><CardTitle>Fab details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                                {jobInfo.map((item, i) => (
                                    <InfoRow key={i} label={item.label} value={item.value} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Plans Grid */}
                    <Card>
                        <CardHeader className="border-b pb-4">
                            <CardTitle>Plans by Stage</CardTitle>
                            {plans.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {plans.length} stage{plans.length !== 1 ? 's' : ''} · click the pencil on any card to edit
                                </p>
                            )}
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
                                            onSaved={refetch}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* FAB Notes — collapsible */}
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

                                    {/* Add note toggle */}
                                    <div className="flex justify-end mb-3">
                                        <Button
                                            variant="outline" size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => setShowNoteInput(v => !v)}
                                        >
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
                                        <div className="space-y-2">
                                            {fabNotes.map((note: any, i: number) => {
                                                const cfg = noteStageConfig[note.stage || 'general'] || noteStageConfig.general;
                                                return (
                                                    <div key={i} className="text-sm p-3 bg-muted rounded">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cfg.color} bg-background mr-2`}>
                                                            {cfg.label}
                                                        </span>
                                                        <span className="text-muted-foreground">{note.note || '—'}</span>
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

                {/* RIGHT */}
                <div className="border-l space-y-6">

                    {/* 1. Estimated Completion Date (separate card) */}
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

                    {/* 2. Schedule Dates (read-only) */}
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
                                value={fab.shop_date_schedule ? format(new Date(fab.shop_date_schedule), 'MMM dd, yyyy') : '—'}
                            />
                            <InfoRow
                                label="Install Date"
                                value={fab.installation_date ? format(new Date(fab.installation_date), 'MMM dd, yyyy') : '—'}
                            />
                            <InfoRow
                                label="Cut Date Scheduled"
                                value={
                                    fab.plans?.find((p: any) => p.planning_section_id === 7)?.scheduled_start_date
                                        ? formatDisplay(fab.plans.find((p: any) => p.planning_section_id === 7)?.scheduled_start_date)
                                        : '—'
                                }
                            />
                            {plans.map((plan: any) => {
                                const info = stageMapping[plan.planning_section_id];
                                if (!info || !plan.scheduled_start_date) return null;
                                return (
                                    <InfoRow
                                        key={plan.id}
                                        label={`${info.label} Date`}
                                        value={format(new Date(plan.scheduled_start_date), 'MMM dd, yyyy')}
                                    />
                                );
                            })}
                        </CardContent>
                    </Card>



                    {/*  Add Note card */}
                    {/* <Card className="border-none rounded-none">
                        <CardHeader className="border-b pb-4 flex-col items-start gap-1">
                            <CardTitle className="font-semibold text-text">Add Note</CardTitle>
                            <p className="text-sm text-muted-foreground">Add a shop status note to this FAB</p>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-3">
                            <Textarea
                                placeholder="Type your note here..."
                                className="min-h-[90px] resize-none"
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                            />
                            <Button className="w-full py-5 text-base" onClick={handleAddNote} disabled={isSubmittingNote || !noteText.trim()}>
                                {isSubmittingNote
                                    ? <><LoaderCircle className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                                    : 'Save Note'}
                            </Button>
                        </CardContent>
                    </Card> */}
                </div>
            </div>
        </Container>
    );
};

export { FabDetailsPage };