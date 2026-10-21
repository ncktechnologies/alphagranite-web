import { describe, expect, it } from 'vitest';
import { totalActivityRecords } from './installation-template-totals';

describe('totalActivityRecords', () => {
    it('replaces installation job totals with sums of individual timer records', () => {
        const records = [
            {
                activity_type: 'Installation',
                sq_ft_installed: 100,
                sq_ft_incomplete: 747,
                total_work_seconds: 9000,
                timer_sessions: [
                    { total_work_seconds: 0, sqft_installed: 0, sqft_not_installed: 0 },
                ],
            },
            {
                activity_type: 'Installation',
                sq_ft_installed: 100,
                sq_ft_incomplete: 240,
                timer_sessions: [
                    { total_work_seconds: 19214, sqft_installed: 31, sqft_not_installed: 0 },
                    { total_work_seconds: 900, sqft_installed: 12, sqft_not_installed: 5 },
                ],
            },
        ];

        const totals = totalActivityRecords(records, 'Installation');
        expect(totals[0]).toMatchObject({
            sq_ft_installed: 0, sq_ft_incomplete: 0, total_work_seconds: 0, installer_hours: 0,
        });
        expect(totals[1]).toMatchObject({
            sq_ft_installed: 43, sq_ft_incomplete: 5, total_work_seconds: 20114,
            installer_hours: 20114 / 3600,
        });
        expect(totals.reduce((sum, row) => sum + row.sq_ft_incomplete, 0)).toBe(5);
        expect(records[0].sq_ft_incomplete).toBe(747);
    });

    it('totals template records using only template session values', () => {
        const totals = totalActivityRecords([
            {
                activity_type: 'Template',
                sqft_templated: 999,
                sqft_not_templated: 999,
                timer_sessions: [
                    { total_work_seconds: 60, sqft_templated: 12.5, sqft_not_templated: 2.5, sqft_installed: 100 },
                    { total_work_seconds: 120, sqft_templated: 8.5, sqft_not_templated: 1.5 },
                ],
            },
            { activity_type: 'Installation', timer_sessions: [{ total_work_seconds: 1000, sqft_installed: 500 }] },
        ], 'Template');

        expect(totals).toHaveLength(1);
        expect(totals[0]).toMatchObject({
            sqft_templated: 21, sqft_not_templated: 4,
            sq_ft_installed: 0, sq_ft_incomplete: 0, total_work_seconds: 180,
        });
    });

    it('ignores template fields on installation sessions', () => {
        const [totals] = totalActivityRecords([{
            activity_type: 'Installation',
            timer_sessions: [{
                total_work_seconds: 60, sqft_templated: 0, sqft_not_templated: 99,
                sqft_installed: 52, sqft_not_installed: 3,
            }],
        }], 'Installation');

        expect(totals).toMatchObject({
            sq_ft_installed: 52, sq_ft_incomplete: 3, sqft_templated: 0, sqft_not_templated: 0,
        });
    });

    it('uses zero for absent records and missing optional square footage, never API parent totals', () => {
        const totals = totalActivityRecords([
            { activity_type: 'Installation', sq_ft_incomplete: 747 },
            { activity_type: 'Installation', timer_sessions: [] },
            { activity_type: 'Installation', timer_sessions: [{ total_work_seconds: 60 }] },
        ], 'Installation');

        expect(totals.map(row => row.sq_ft_incomplete)).toEqual([0, 0, 0]);
        expect(totals.map(row => row.sq_ft_installed)).toEqual([0, 0, 0]);
        expect(totals.map(row => row.total_work_seconds)).toEqual([0, 0, 60]);
        expect(totalActivityRecords([], 'Template')).toEqual([]);
    });
});
