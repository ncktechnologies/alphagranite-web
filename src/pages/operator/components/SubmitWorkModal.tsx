import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { LoaderCircle } from 'lucide-react';
import { useUpdateOperatorTaskMutation } from '@/store/api/operator';

const submitWorkSchema = z.object({
    work_percentage: z.number().min(0).max(100),
    notes:          z.string().optional(),
    is_completed:   z.boolean(),
});

type SubmitWorkFormData = z.infer<typeof submitWorkSchema>;

export interface SubmitWorkData {
    work_percentage: number;
    notes?:          string;
    is_completed:    boolean;
}

interface SubmitWorkModalProps {
    open:                   boolean;
    onOpenChange:           (open: boolean) => void;
    onSubmit:               (data: SubmitWorkData) => Promise<void>;
    currentWorkPercentage?: number;
    estimatedHours?:        number;
    actualHours?:           number;
    taskId?:                number;
    operatorId?:            number;
    workstationId?:         number;
    fabId?:                 number;
    jobId?:                 number;
}

export function SubmitWorkModal({
    open,
    onOpenChange,
    onSubmit,
    currentWorkPercentage = 0,
    estimatedHours,
    actualHours = 0,
    taskId,
    operatorId,
    workstationId,
    fabId,
    jobId,
}: SubmitWorkModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateOperatorTask] = useUpdateOperatorTaskMutation();

    const form = useForm<SubmitWorkFormData>({
        resolver: zodResolver(submitWorkSchema),
        defaultValues: {
            work_percentage: currentWorkPercentage,
            notes:           '',
            is_completed:    false,   // never auto‑check
        },
    });

    // Reset form when modal opens with fresh data
    useEffect(() => {
        if (open) {
            form.reset({
                work_percentage: currentWorkPercentage,
                notes:           '',
                is_completed:    false,
            });
        }
    }, [open, currentWorkPercentage, form]);

    const workPct = form.watch('work_percentage');
    const isCompleted = form.watch('is_completed');
    const isFullyComplete = workPct === 100;

    const handlePercentageChange = (val: number) => {
        form.setValue('work_percentage', val);
        // ❌ Removed automatic checkmark
    };

    const handleSubmit = async (values: SubmitWorkFormData) => {
        // Enforce both 100% and checkbox checked
        if (values.work_percentage !== 100) {
            toast.error('You must reach 100% completion before ending the task.');
            return;
        }
        if (!values.is_completed) {
            toast.error('Please check "Mark task as completed" to finish.');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            if (taskId && operatorId && workstationId) {
                await updateOperatorTask({
                    operator_id:    operatorId,
                    workstation_id: workstationId,
                    task_id:        taskId,
                    data: {
                        actual_end_date:  now,
                        work_percentage:  values.work_percentage,
                        notes:            values.notes || null,
                        is_completed:     values.is_completed,
                    },
                }).unwrap();
            }

            await onSubmit(values);
            toast.success('Task completed and session ended!');
            onOpenChange(false);
        } catch (error: any) {
            console.error('Failed to submit work:', error);
            toast.error(error?.data?.message || 'Failed to submit work');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="border-b pb-3">
                        <DialogTitle className="text-[15px] font-semibold">
                            Complete
                            {fabId && (
                                <span className="ml-3 text-sm font-normal text-gray-500">
                                    {fabId}
                                </span>
                            )}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Record your final progress before ending this session.
                        </p>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1 pt-4">

                        {/* Time summary */}
                        {estimatedHours && (
                            <div className="bg-gray-50 rounded-lg p-4 flex justify-between text-sm">
                                <div>
                                    <p className="text-gray-500 uppercase text-xs tracking-wide">Estimated</p>
                                    <p className="font-semibold text-[#111827]">{estimatedHours}h</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 uppercase text-xs tracking-wide">Actual</p>
                                    <p className="font-semibold text-[#111827]">{actualHours.toFixed(2)}h</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 uppercase text-xs tracking-wide">Variance</p>
                                    <p className={`font-semibold ${actualHours > estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                                        {actualHours > estimatedHours ? '+' : ''}
                                        {(actualHours - estimatedHours).toFixed(2)}h
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Work percentage dropdown */}
                        <FormField
                            control={form.control}
                            name="work_percentage"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Work Completed</FormLabel>
                                    <FormControl>
                                        <div className="space-y-2">
                                            <Select
                                                value={workPct.toString()}
                                                onValueChange={(val) => handlePercentageChange(parseInt(val))}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select work percentage" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px] ">
                                                    {Array.from({ length: 11 }, (_, i) => i * 10).map((val) => (
                                                        <SelectItem key={val} value={val.toString()}>
                                                            {val}%
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes <span className="text-gray-400 font-normal">(optional)</span></FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any notes about this session..."
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Mark as completed – enabled only at 100%, never auto‑checked */}
                        <FormField
                            control={form.control}
                            name="is_completed"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center space-x-3">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                disabled={!isFullyComplete}
                                            />
                                        </FormControl>
                                        <FormLabel className={`text-[16px] font-semibold ${field.value ? 'text-green-600' : 'text-gray-600'}`}>
                                            Mark task as completed
                                        </FormLabel>
                                    </div>
                                    {!isFullyComplete && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            You can only mark as completed when work reaches 100%.
                                        </p>
                                    )}
                                </FormItem>
                            )}
                        />

                        {/* Submit – disabled unless 100% AND checkbox checked */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !isFullyComplete || !isCompleted}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    'Complete & End'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}