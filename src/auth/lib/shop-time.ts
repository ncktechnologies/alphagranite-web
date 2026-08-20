export const SHOP_DAY_START_HOUR = 7;
export const SHOP_BREAK_START_HOUR = 12;
export const SHOP_BREAK_END_HOUR = 13;
export const SHOP_DAY_END_HOUR = 16;

export function getWorkingMinutes(start: Date, end: Date): number {
  if (end <= start) return 0;
  let total = 0;
  const cursor = new Date(start);

  while (cursor < end) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(SHOP_DAY_END_HOUR, 0, 0, 0);
    const segmentEnd = end < dayEnd ? end : dayEnd;
    const dayStart = new Date(cursor);
    dayStart.setHours(SHOP_DAY_START_HOUR, 0, 0, 0);
    const breakStart = new Date(cursor);
    breakStart.setHours(SHOP_BREAK_START_HOUR, 0, 0, 0);
    const breakEnd = new Date(cursor);
    breakEnd.setHours(SHOP_BREAK_END_HOUR, 0, 0, 0);

    const productiveStart = cursor > dayStart ? cursor : dayStart;
    if (segmentEnd > productiveStart) {
      total += Math.max(0, (Math.min(segmentEnd.getTime(), breakStart.getTime()) - productiveStart.getTime()) / 60000);
      total += Math.max(0, (segmentEnd.getTime() - Math.max(productiveStart.getTime(), breakEnd.getTime())) / 60000);
    }

    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(SHOP_DAY_START_HOUR, 0, 0, 0);
  }
  return total;
}

export function calculateEstimatedHours(start: Date | null, end: Date | null): string {
  if (!start || !end || end <= start) return '';
  return (getWorkingMinutes(start, end) / 60).toFixed(2);
}

export function normalizeEndDateTime(start: Date, end: Date): Date {
  const normalized = new Date(end);
  // Selecting an end time earlier than the start means the work finishes next day.
  if (normalized <= start) normalized.setDate(normalized.getDate() + 1);
  return normalized;
}

/** Derives the end date/time used by edit forms from API start + productive hours. */
export function addWorkingHours(start: Date, hours: number): Date {
  let remainingMinutes = Math.max(0, hours * 60);
  const cursor = new Date(start);

  while (remainingMinutes > 0) {
    const dayStart = new Date(cursor);
    dayStart.setHours(SHOP_DAY_START_HOUR, 0, 0, 0);
    const breakStart = new Date(cursor);
    breakStart.setHours(SHOP_BREAK_START_HOUR, 0, 0, 0);
    const breakEnd = new Date(cursor);
    breakEnd.setHours(SHOP_BREAK_END_HOUR, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setHours(SHOP_DAY_END_HOUR, 0, 0, 0);

    if (cursor < dayStart) cursor.setTime(dayStart.getTime());
    if (cursor >= breakStart && cursor < breakEnd) cursor.setTime(breakEnd.getTime());
    if (cursor >= dayEnd) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(SHOP_DAY_START_HOUR, 0, 0, 0);
      continue;
    }

    const nextBoundary = cursor < breakStart ? breakStart : dayEnd;
    const availableMinutes = (nextBoundary.getTime() - cursor.getTime()) / 60000;
    const consumed = Math.min(remainingMinutes, availableMinutes);
    cursor.setMinutes(cursor.getMinutes() + consumed);
    remainingMinutes -= consumed;
  }

  return cursor;
}
