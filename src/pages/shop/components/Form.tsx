import { Station } from "@/config/types";
import { useState, useEffect } from 'react';
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
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UserAssignment } from "./AssignUser";
import { useCreateWorkstationMutation, useUpdateWorkstationMutation, useGetPlanningSectionsQuery } from '@/store/api/workstation';
import { toast } from 'sonner';

interface StationFormProps {
    mode: 'new' | 'edit';
    role: Station | null;
    onCancel: () => void;
    // onSave: (data: StationFormData) => void;
}

export interface StationFormData {
    workstationName: string;
    description: string;
    isActive: boolean;
    selectedUsers: string[];
    permissions: Permissions;
}



const workstationSchema = z.object({
    workstationName: z.string().min(1, 'Workstation name is required'),
    // machine: z.string().min(1, 'Machine is required'),
    other: z.string().optional(),
    operator_ids: z.array(z.string()).optional(),
});

type WorkstationFormType = z.infer<typeof workstationSchema>;

export const WorkStationForm = ({ mode, role, onCancel }: StationFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const [createWorkstation] = useCreateWorkstationMutation();
    const [updateWorkstation] = useUpdateWorkstationMutation();
    const { data: planningSectionsData, isLoading: isPlanningSectionsLoading } = useGetPlanningSectionsQuery();
    const planningSections = Array.isArray(planningSectionsData) ? planningSectionsData : (planningSectionsData && (planningSectionsData as any).data ? (planningSectionsData as any).data : []);
    const [planningSectionId, setPlanningSectionId] = useState<number | undefined>(undefined);
    
    console.log('Planning Sections:', planningSections, 'isLoading:', isPlanningSectionsLoading);

    const form = useForm<WorkstationFormType & { planning_section_id?: string }>({
        resolver: zodResolver(workstationSchema),
        defaultValues: {
            workstationName: '',
            other: '',
            operator_ids: [],
            planning_section_id: undefined,
        },
    });

    // Populate form when editing
    useEffect(() => {
        if (mode === 'edit' && role) {
            const rawRole = role as any;
            
            // Get the original operator IDs from the raw role data
            const operatorIds = rawRole.operator_ids || [];
            
            console.log('Operator IDs from role:', operatorIds);
            console.log('Planning section ID from role:', rawRole.planning_section_id);
            
            form.reset({
                workstationName: role.workstationName || '',
                other: role.other || '',
                operator_ids: operatorIds.map(String),
                planning_section_id: rawRole.planning_section_id ? String(rawRole.planning_section_id) : undefined,
            });
            
            // Set selected users using the operator IDs (as strings)
            setSelectedUsers(operatorIds.map(String));
            
            // Set planning section - ensure it's set immediately and synchronously
            const psId = rawRole.planning_section_id !== undefined && rawRole.planning_section_id !== null 
                ? Number(rawRole.planning_section_id) 
                : undefined;
            setPlanningSectionId(psId);
            console.log('Set planningSectionId to:', psId);
        } else if (mode === 'new') {
            form.reset({
                workstationName: '',
                other: '',
                operator_ids: [],
            });
            setSelectedUsers([]);
            setPlanningSectionId(undefined);
        }
    }, [mode, role]);

    const handleUserToggle = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
        form.setValue(
            'operator_ids',
            form.getValues('operator_ids')?.includes(userId)
                ? form.getValues('operator_ids')?.filter((id) => id !== userId)
                : [...(form.getValues('operator_ids') || []), userId]
        );
    };

    async function onSubmit(values: WorkstationFormType) {
        setIsSubmitting(true);
        try {
            const payload = {
                planning_section_id: planningSectionId ?? null,
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

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-black">
                        {mode === 'new' ? 'New Workstation:' : `Edit Workstation:: ${role?.workstationName}`}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                {/* <div className=" sp"> */}
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

                {/* Planning Section Select */}
                <FormItem>
                    <FormLabel>Shop Activity *</FormLabel>
                    <FormControl>
                        <Select 
                            value={planningSectionId !== undefined ? String(planningSectionId) : ''} 
                            onValueChange={(v) => {
                                console.log('Select changed to:', v);
                                setPlanningSectionId(v ? Number(v) : undefined);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={isPlanningSectionsLoading ? 'Loading sections...' : 'Select shop activity'} />
                            </SelectTrigger>
                            <SelectContent>
                                {planningSections.map((ps: any) => (
                                    <SelectItem key={ps.id} value={String(ps.id)}>
                                        {ps.name || ps.plan_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormControl>
                    {planningSectionId && (() => {
                        const foundSection = planningSections.find((ps: any) => ps.id === planningSectionId);
                        return (
                            <p className="text-xs text-muted-foreground mt-1">
                                Selected: {foundSection?.name || foundSection?.plan_name}
                            </p>
                        );
                    })()}
                </FormItem>

                {/* <FormField
                    control={form.control}
                    name="other"
                    render={({ field }) => (
                        <FormItem className="col-span-2">
                            <FormLabel>Other</FormLabel>
                            <FormControl>
                                <Input placeholder="Type here..." {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                /> */}
                {/* </div> */}

                {/* Assign Operator */}
                <div>
                    {/* <FormLabel>Assign Operator</FormLabel> */}
                    {/* <div className="border rounded-md p-3"> */}
                    <UserAssignment
                        selectedUsers={selectedUsers}
                        onUserToggle={handleUserToggle}
                    />
                    {/* </div> */}
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