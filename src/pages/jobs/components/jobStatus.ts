// business_jobs.status_id values used on Manage Jobs.
// Deleting a job also sets status_id 3, so deleted jobs show as Completed.
export const JOB_STATUS = { INACTIVE: 0, ACTIVE: 1, COMPLETED: 3 } as const;

export const JOB_STATUS_OPTIONS = [
    { value: JOB_STATUS.ACTIVE, label: 'Active', dot: 'bg-green-500' },
    { value: JOB_STATUS.INACTIVE, label: 'Inactive', dot: 'bg-[#9AA1AD]' },
    { value: JOB_STATUS.COMPLETED, label: 'Completed', dot: 'bg-blue-500' },
] as const;

export const jobStatusLabel = (statusId?: number | null): string =>
    JOB_STATUS_OPTIONS.find((option) => option.value === statusId)?.label ?? 'N/A';
