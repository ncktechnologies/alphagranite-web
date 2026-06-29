import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { usePauseInstallerTimerMutation } from '@/store/api/jobTimers';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';

const pauseSchema = z.object({
    note: z.string().optional(),
});

type PauseData = z.infer<typeof pauseSchema>;

interface InstallerPauseModalProps {
    open: boolean;
    onClose: (success?: boolean) => void;
    jobId: number;
    installerId: number;
    onPauseSuccess?: () => void;
    jobNumber?: string;
    fabId?: number;
}

export const InstallerPauseModal = ({ open, onClose, jobId, fabId, jobNumber, installerId, onPauseSuccess }: InstallerPauseModalProps) => {
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pauseTimer] = usePauseInstallerTimerMutation();

    const form = useForm<PauseData>({
        resolver: zodResolver(pauseSchema),
        defaultValues: {
            note: '',
        }
    });

    const handleSubmit = async (values: PauseData) => {
        setIsSubmitting(true);
        try {
            await pauseTimer({
                job_id: jobId,
                installer_id: installerId,
                sqft_installed: undefined,   // explicitly not sent
                sqft_not_installed: undefined,
                note: "",
                fab_id:fabId
            }).unwrap();
            toast.success(t('INSTALLER.PAUSE.SUCCESS'));
            onClose(true);
            if (onPauseSuccess) onPauseSuccess();
        } catch (error: any) {
            toast.error(error?.data?.message || t('INSTALLER.PAUSE.FAILED'));
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
                            {t('INSTALLER.PAUSE.TITLE')}
                            <span className="ml-3 text-sm font-normal text-gray-500">
                                {t('INSTALLER.PAUSE.JOB_NO')} {jobNumber || jobId}
                            </span>
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-4">
                        {/* Only optional note field remains */}
                        {/* <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('INSTALLER.PAUSE.NOTE_OPTIONAL')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('INSTALLER.PAUSE.NOTE_PLACEHOLDER')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        /> */}

                        <div className="flex justify-center gap-3 pt-4 w-full">
                            <Button type="button" variant="outline" onClick={() => onClose(false)} size='lg'>
                                {t('COMMON.CANCEL')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting} size='lg'>
                                {isSubmitting ? t('INSTALLER.PAUSE.PAUSING') : t('INSTALLER.PAUSE.CONFIRM')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};