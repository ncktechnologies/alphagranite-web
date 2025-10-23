import { Station } from "@/config/types";
import { useState } from 'react';
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
    machine: z.string().min(1, 'Machine is required'),
    other: z.string().optional(),
    operators: z.array(z.string()).optional(),
});

type WorkstationFormType = z.infer<typeof workstationSchema>;

export const WorkStationForm = ({ mode, role, onCancel }: StationFormProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const form = useForm<WorkstationFormType>({
        resolver: zodResolver(workstationSchema),
        defaultValues: {
            workstationName: '',
            machine: '',
            other: '',
            operators: [],
        },
    });

    const handleUserToggle = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
        form.setValue(
            'operators',
            form.getValues('operators')?.includes(userId)
                ? form.getValues('operators')?.filter((id) => id !== userId)
                : [...(form.getValues('operators') || []), userId]
        );
    };

    async function onSubmit(values: WorkstationFormType) {
        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 1000)); // simulate API call
        console.log('Workstation data:', values);
        setIsSubmitting(false);
        onCancel(); // return after submit
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

                        <FormField
                            control={form.control}
                            name="machine"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Machine *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Saw 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
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
                        />
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