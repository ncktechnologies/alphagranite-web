type ActivityType = 'Template' | 'Installation';

interface ActivitySession {
    total_work_seconds: number;
    sqft_templated?: number;
    sqft_not_templated?: number;
    sqft_installed?: number;
    sqft_not_installed?: number;
}

interface ActivityRecord {
    activity_type: string;
    timer_sessions?: ActivitySession[];
}

export function totalActivityRecords<T extends ActivityRecord>(records: T[], activityType: ActivityType) {
    return records.filter(record => record.activity_type === activityType).map(record => {
        const totals = (record.timer_sessions ?? []).reduce((sum, session) => ({
            total_work_seconds: sum.total_work_seconds + session.total_work_seconds,
            sqft_templated: sum.sqft_templated + (activityType === 'Template' ? session.sqft_templated ?? 0 : 0),
            sqft_not_templated: sum.sqft_not_templated + (activityType === 'Template' ? session.sqft_not_templated ?? 0 : 0),
            sq_ft_installed: sum.sq_ft_installed + (activityType === 'Installation' ? session.sqft_installed ?? 0 : 0),
            sq_ft_incomplete: sum.sq_ft_incomplete + (activityType === 'Installation' ? session.sqft_not_installed ?? 0 : 0),
        }), {
            total_work_seconds: 0,
            sqft_templated: 0,
            sqft_not_templated: 0,
            sq_ft_installed: 0,
            sq_ft_incomplete: 0,
        });

        return {
            ...record,
            ...totals,
            installer_hours: totals.total_work_seconds / 3600,
        };
    });
}
