// Readable view of the JSON object that the Caspio migration stored in fabs.notes.

export interface MigratedNoteField {
    label: string;
    value: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

// "draft_date_completed_2" -> "Draft Date Completed 2", "install_date2" -> "Install Date 2"
const toLabel = (key: string) =>
    key
        .replace(/_/g, ' ')
        .replace(/([a-z])(\d)/gi, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const toValue = (value: unknown): string => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (isPlainObject(value) || Array.isArray(value)) return JSON.stringify(value);
    return String(value).trim();
};

/** Label/value rows for migrated JSON notes; empty for plain text or array notes. */
export const migratedNoteFields = (notes: unknown): MigratedNoteField[] => {
    if (!isPlainObject(notes)) return [];
    return Object.entries(notes)
        .filter(([, value]) => value !== null && value !== undefined && toValue(value) !== '')
        .map(([key, value]) => ({ label: toLabel(key), value: toValue(value) }))
        .sort((a, b) => a.label.localeCompare(b.label));
};
