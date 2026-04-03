// PauseModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { usePauseTemplaterTimerMutation } from '@/store/api/jobTimers';
import { Textarea } from '@/components/ui/textarea';

const pauseSchema = z.object({
    sqftTemplated: z
        .string()
        .optional()
        .transform(val => (val === '' ? undefined : Number(val))),
    sqftNotTemplated: z
        .string()
        .optional()
        .transform(val => (val === '' ? undefined : Number(val))),
    note: z.string().optional(),
});

type PauseData = z.infer<typeof pauseSchema>;

interface PauseModalProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    jobId: number;
    templaterId: number;
    onPauseSuccess?: () => void; // Optional callback after successful pause
}

export const PauseModal = ({ open, onClose, jobId, templaterId, onPauseSuccess }: PauseModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pauseTimer] = usePauseTemplaterTimerMutation();

    const form = useForm<PauseData>({
        resolver: zodResolver(pauseSchema),
        defaultValues: {
            sqftTemplated: '',
            sqftNotTemplated: '',
        }
    });

    const handleSubmit = async (values: PauseData) => {
        setIsSubmitting(true);
        try {
            await pauseTimer({
                job_id: jobId,
                templater_id: templaterId,
                sqft_templated: values.sqftTemplated,
                sqft_not_templated: values.sqftNotTemplated,
                note: values.note,
            }).unwrap();
            toast.success('Timer paused successfully');
            onClose(true);
            if (onPauseSuccess) onPauseSuccess();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to pause timer');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose(false)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="border-b">
                        <DialogTitle className="text-[15px] font-semibold py-2">
                            Pause Timer
                            <span className="ml-3 text-sm font-normal text-gray-500">
                                Job ID: {jobId}
                            </span>
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-4">
                        <FormField
                            control={form.control}
                            name="sqftTemplated"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sqft Templated</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter square feet templated"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="sqftNotTemplated"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sqft Not Templated</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter square feet not templated"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Note (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add a note..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => onClose(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Pausing...' : 'Confirm Pause'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};