import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useStopInstallerTimerMutation } from '@/store/api/jobTimers';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';

const stopSchema = z.object({
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

type StopData = z.infer<typeof stopSchema>;

interface InstallerStopModalProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    jobId: number;
    installerId: number;
    onStopSuccess?: () => void;
    jobNumber?: string;
}

export const InstallerStopModal = ({ open, onClose, jobId, jobNumber, installerId, onStopSuccess }: InstallerStopModalProps) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stopTimer] = useStopInstallerTimerMutation();

    const form = useForm<StopData>({
        resolver: zodResolver(stopSchema),
        defaultValues: {
            sqftInstalled: '',
            sqftNotInstalled: '',
            note: '',
        }
    });

    const handleSubmit = async (values: StopData) => {
        setIsSubmitting(true);
        try {
            await stopTimer({
                job_id: jobId,
                installer_id: installerId,
                sqft_installed: values.sqftInstalled,
                sqft_not_installed: values.sqftNotInstalled,
                note: values.note,
            }).unwrap();
            toast.success(t('INSTALLER.STOP.SUCCESS'));
            onClose(true);
            if (onStopSuccess) onStopSuccess();
        } catch (error: any) {
            toast.error(error?.data?.message || t('INSTALLER.STOP.FAILED'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className="border-b">
                        <DialogTitle className="text-[15px] font-semibold py-2">
                            {t('INSTALLER.STOP.TITLE')}
                            <span className="ml-3 text-sm font-normal text-gray-500">
                                {t('INSTALLER.STOP.JOB_NO')} {jobNumber || jobId}
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
                                    <FormLabel>{t('INSTALLER.STOP.SQFT_INSTALLED')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder={t('INSTALLER.STOP.SQFT_INSTALLED_PLACEHOLDER')}
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
                                    <FormLabel>{t('INSTALLER.STOP.SQFT_NOT_INSTALLED')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder={t('INSTALLER.STOP.SQFT_NOT_INSTALLED_PLACEHOLDER')}
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
                                    <FormLabel>{t('INSTALLER.STOP.NOTE_OPTIONAL')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('INSTALLER.STOP.NOTE_PLACEHOLDER')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => onClose(false)}>
                                {t('COMMON.CANCEL')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? t('INSTALLER.STOP.SUBMITTING') : t('INSTALLER.STOP.CONFIRM')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};