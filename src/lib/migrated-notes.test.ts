import { describe, expect, it } from 'vitest';
import { migratedNoteFields } from './migrated-notes';

describe('migratedNoteFields', () => {
    it('turns migrated JSON notes into readable label/value rows', () => {
        expect(
            migratedNoteFields({
                fab_percent: '100',
                install_date2: '12/17/2021',
                draft_clock_complete: false,
                template_date_completed_2: '11/29/2021 9:41:53 AM',
                empty: '',
                missing: null,
            }),
        ).toEqual([
            { label: 'Draft Clock Complete', value: 'No' },
            { label: 'Fab Percent', value: '100' },
            { label: 'Install Date 2', value: '12/17/2021' },
            { label: 'Template Date Completed 2', value: '11/29/2021 9:41:53 AM' },
        ]);
    });

    it.each([null, undefined, 'plain note', ['note'], []])('ignores non-object notes (%j)', (notes) => {
        expect(migratedNoteFields(notes)).toEqual([]);
    });
});
