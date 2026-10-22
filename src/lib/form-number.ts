// Number <-> text-input helpers that keep 0 distinct from "no value".

/** API number -> input text: null/undefined/'' become '', 0 stays '0'. */
export const numberToInput = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '' : String(value);

/** Input text -> API number: blank or unparseable becomes null, '0' stays 0. */
export const inputToNumber = (value: string | null | undefined): number | null => {
  const text = (value ?? '').trim();
  if (text === '') return null;
  const parsed = parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
};
