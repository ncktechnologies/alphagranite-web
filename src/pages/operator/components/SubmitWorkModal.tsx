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
import { Slider } from '@/components/ui/slider';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { LoaderCircle } from 'lucide-react';
import { useUpdateOperatorTaskMutation } from '@/store/api/operator';

// ── Schema ────────────────────────────────────────────────────────────────────
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
            is_completed:    currentWorkPercentage >= 100,
        },
    });

    // ── Reset form when modal opens or fresh data arrives ────────────────────
    useEffect(() => {
        if (open) {
            form.reset({
                work_percentage: currentWorkPercentage,
                notes:           '',
                is_completed:    currentWorkPercentage >= 100,
            });
        }
    }, [open, currentWorkPercentage, form]);

    const workPct = form.watch('work_percentage');
    const isCompleted = form.watch('is_completed');
    const isFullyComplete = workPct === 100;

    const handlePercentageChange = (val: number) => {
        form.setValue('work_percentage', val);
        if (val === 100) {
            form.setValue('is_completed', true);
        }
    };

    const handleSubmit = async (values: SubmitWorkFormData) => {
        // Safety: only allow submit when work is 100% complete
        if (values.work_percentage !== 100) {
            toast.error('You must reach 100% completion before ending the task.');
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

            await onSubmit({
                work_percentage: values.work_percentage,
                notes:           values.notes,
                is_completed:    values.is_completed,
            });

            toast.success(
                values.is_completed
                    ? 'Task completed and session ended!'
                    : `Progress saved — ${values.work_percentage}% complete`
            );

            onOpenChange(false);
        } catch (error: any) {
            console.error('Failed to submit work:', error);
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

                        {/* Work percentage */}
                        <FormField
                            control={form.control}
                            name="work_percentage"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Work Completed</FormLabel>
                                    <FormControl>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center">
                                                <span className="text-4xl font-bold text-[#111827] tabular-nums">
                                                    {workPct}%
                                                </span>
                                            </div>
                                            <Slider
                                                min={0}
                                                max={100}
                                                step={5}
                                                value={[workPct]}
                                                onValueChange={([val]) => handlePercentageChange(val)}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>0%</span>
                                                <span>50%</span>
                                                <span>100%</span>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {[25, 50, 75, 90, 100].map((val) => (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => handlePercentageChange(val)}
                                                        className={`text-xs py-1.5 rounded-md border transition-colors ${
                                                            workPct === val
                                                                ? 'bg-[#111827] text-white border-[#111827]'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                                        }`}
                                                    >
                                                        {val}%
                                                    </button>
                                                ))}
                                            </div>
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

                        {/* Mark as completed – disabled unless work_percentage === 100 */}
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

                        {/* Actions – submit button disabled unless 100% complete */}
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
                                disabled={isSubmitting || !isFullyComplete}
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