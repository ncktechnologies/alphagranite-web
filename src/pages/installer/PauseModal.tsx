import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { usePauseInstallerTimerMutation } from '@/store/api/jobTimers';
import { Textarea } from '@/components/ui/textarea';

const pauseSchema = z.object({
    sqftInstalled: z
        .string()
        .optional()
        .transform(val => (val === '' ? undefined : Number(val))),
    sqftNotInstalled: z
        .string()
        .optional()
        .transform(val => (val === '' ? undefined : Number(val))),
    note: z.string().optional(),
});

type PauseData = z.infer<typeof pauseSchema>;

interface InstallerPauseModalProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    jobId: number;
    installerId: number;
    onPauseSuccess?: () => void;
    jobNumber?: string; // Optional job number for display
}

export const InstallerPauseModal = ({ open, onClose, jobId, jobNumber, installerId, onPauseSuccess }: InstallerPauseModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pauseTimer] = usePauseInstallerTimerMutation();

    const form = useForm<PauseData>({
        resolver: zodResolver(pauseSchema),
        defaultValues: {
            sqftInstalled: '',
            sqftNotInstalled: '',
        }
    });

    const handleSubmit = async (values: PauseData) => {
        setIsSubmitting(true);
        try {
            await pauseTimer({
                job_id: jobId,
                installer_id: installerId,
                sqft_installed: values.sqftInstalled,
                sqft_not_installed: values.sqftNotInstalled,
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
                                Job No: {jobNumber || jobId}
                            </span>
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-4">
                        <FormField
                            control={form.control}
                            name="sqftInstalled"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sqft Installed</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter square feet installed"
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
                            name="sqftNotInstalled"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sqft Not Installed</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Enter square feet not installed"
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