import { Station } from "@/config/types";
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircleIcon, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UserAssignment } from "./AssignUser";
import { useCreateWorkstationMutation, useUpdateWorkstationMutation, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { toast } from 'sonner';

interface StationFormProps {
    mode: 'new' | 'edit';
    role: Station | null;
    onCancel: () => void;
}

const workstationSchema = z.object({
    workstationName: z.string().min(1, 'Workstation name is required'),
    other: z.string().optional(),
    operator_ids: z.array(z.string()).optional(),
    planning_section_id: z.string().optional(),
});

type WorkstationFormType = z.infer<typeof workstationSchema>;

export const WorkStationForm = ({ mode, role, onCancel }: StationFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const [createWorkstation] = useCreateWorkstationMutation();
    const [updateWorkstation] = useUpdateWorkstationMutation();
    const { data: planningSectionsData, isLoading: isPlanningSectionsLoading } = useGetPlanningSectionsQuery();

    const planningSections = useMemo(() => {
        if (!planningSectionsData) return [];
        const data = (planningSectionsData as any)?.data || planningSectionsData;
        return Array.isArray(data) ? data : [];
    }, [planningSectionsData]);

    const form = useForm<WorkstationFormType>({
        resolver: zodResolver(workstationSchema),
        defaultValues: {
            workstationName: '',
            other: '',
            operator_ids: [],
            planning_section_id: undefined,
        },
    });

    // ── Populate form only when planning sections are loaded ──
    useEffect(() => {
        // Only proceed when sections are ready
        if (isPlanningSectionsLoading || planningSections.length === 0) return;

        if (mode === 'edit' && role) {
            const rawRole = role as any;
            const operatorIds = rawRole.operator_ids || [];
            const psId = rawRole.planning_section_id !== undefined && rawRole.planning_section_id !== null
                ? String(rawRole.planning_section_id)
                : undefined;

            form.reset({
                workstationName: role.workstationName || '',
                other: role.other || '',
                operator_ids: operatorIds.map(String),
                planning_section_id: psId,
            });
            setSelectedUsers(operatorIds.map(String));
        } else if (mode === 'new') {
            form.reset({
                workstationName: '',
                other: '',
                operator_ids: [],
                planning_section_id: undefined,
            });
            setSelectedUsers([]);
        }
    }, [mode, role, planningSections, isPlanningSectionsLoading]);

    const handleUserToggle = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
        const current = form.getValues('operator_ids') || [];
        form.setValue(
            'operator_ids',
            current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
        );
    };

    async function onSubmit(values: WorkstationFormType) {
        setIsSubmitting(true);
        try {
            const payload = {
                planning_section_id: values.planning_section_id ? Number(values.planning_section_id) : null,
                name: values.workstationName,
                status_id: 1,
                operator_ids: selectedUsers.map(Number),
                ...(values.other ? { machine_statuses: values.other } : {}),
            };

            if (mode === 'new') {
                await createWorkstation(payload as any).unwrap();
                toast.success('Workstation created');
            } else if (mode === 'edit' && role) {
                const id = Number(role.id);
                await updateWorkstation({ id, data: payload as any }).unwrap();
                toast.success('Workstation updated');
            }

            setIsSubmitting(false);
            onCancel();
        } catch (err) {
            console.error('Failed to save workstation', err);
            toast.error('Failed to save workstation');
            setIsSubmitting(false);
        }
    }

    const planningSectionId = form.watch('planning_section_id');

    // Find name for display (optional)
    const selectedSectionName = useMemo(() => {
        if (!planningSectionId || !planningSections.length) return null;
        const found = planningSections.find(ps => String(ps.id) === planningSectionId);
        return found ? (found.name || found.plan_name) : null;
    }, [planningSectionId, planningSections]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-black">
                        {mode === 'new' ? 'New Workstation:' : `Edit Workstation: ${role?.workstationName}`}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <FormField
                    control={form.control}
                    name="workstationName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Workstation Name *</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Cutting" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Shop Activity – with key that forces re‑render when sections or value change */}
                <FormItem>
                    <FormLabel>Shop Activity *</FormLabel>
                    <Select
                        key={`select-${planningSectionId || 'empty'}-${planningSections.length}`}
                        value={planningSectionId || ''}
                        onValueChange={(v) => form.setValue('planning_section_id', v || undefined)}
                        disabled={isPlanningSectionsLoading}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={isPlanningSectionsLoading ? 'Loading sections...' : 'Select shop activity'} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                            {planningSections.map((ps: any) => (
                                <SelectItem key={ps.id} value={String(ps.id)}>
                                    {ps.name || ps.plan_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {selectedSectionName && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Selected: {selectedSectionName}
                        </p>
                    )}
                    <FormMessage />
                </FormItem>

                {/* Assign Operator */}
                <div>
                    <UserAssignment
                        selectedUsers={selectedUsers}
                        onUserToggle={handleUserToggle}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="justify-center"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            'Save Workstation'
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
};