import { useState } from 'react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUpdateJobMutation } from '@/store/api/job';
import { JOB_STATUS_OPTIONS, jobStatusLabel } from './jobStatus';

interface JobStatusSelectProps {
    jobId: number;
    statusId?: number | null;
    canChange: boolean;
}

function StatusLabel({ statusId }: { statusId?: number | null }) {
    const option = JOB_STATUS_OPTIONS.find((o) => o.value === statusId);
    return (
        <span className="inline-flex items-center gap-2 text-sm text-text">
            <span className={cn('size-2 rounded-full', option?.dot ?? 'bg-border')} />
            {jobStatusLabel(statusId)}
        </span>
    );
}

export function JobStatusSelect({ jobId, statusId, canChange }: JobStatusSelectProps) {
    const [updateJob, { isLoading }] = useUpdateJobMutation();
    const [pendingStatus, setPendingStatus] = useState<number | null>(null);
    const shownStatus = pendingStatus ?? statusId;

    if (!canChange) return <StatusLabel statusId={statusId} />;

    const handleChange = async (value: string) => {
        const next = Number(value);
        if (next === statusId) return;
        setPendingStatus(next);
        try {
            await updateJob({ id: jobId, data: { status_id: next } }).unwrap();
            toast.success(`Job marked ${jobStatusLabel(next).toLowerCase()}`);
        } catch (error) {
            const data = (error as { data?: { detail?: string; message?: string } } | undefined)?.data;
            toast.error(data?.detail || data?.message || 'Failed to update job status');
        } finally {
            setPendingStatus(null);
        }
    };

    const known = JOB_STATUS_OPTIONS.some((o) => o.value === shownStatus);
    return (
        <Select value={known ? String(shownStatus) : ''} onValueChange={handleChange} disabled={isLoading}>
            <SelectTrigger className="h-8 w-[130px]" onClick={(e) => e.stopPropagation()} aria-label="Job status">
                <SelectValue placeholder={jobStatusLabel(shownStatus)} />
            </SelectTrigger>
            <SelectContent>
                {JOB_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                        <span className="inline-flex items-center gap-2">
                            <span className={cn('size-2 rounded-full', option.dot)} />
                            {option.label}
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
