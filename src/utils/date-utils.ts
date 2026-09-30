import { format, parseISO, isValid } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { isZonedIsoString, toAppWallClock, toServerDate, toServerDateTime } from '@/lib/app-timezone';

// Get user's timezone offset in minutes (native JS method)
export const getTimezoneOffsetMinutes = (): number => {
  return new Date().getTimezoneOffset();
};

// Get user's timezone name
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// Unified date formats for the entire application
export const DATE_FORMATS = {
  // Display formats (America/Chicago wall-clock; see lib/app-timezone)
  DISPLAY_SHORT: 'MMM d, yyyy',           // Jan 15, 2024
  DISPLAY_MEDIUM: 'MMMM d, yyyy',         // January 15, 2024
  DISPLAY_LONG: 'PPP',                    // Full localized date
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a', // Jan 15, 2024 2:30 PM
  DISPLAY_TIME_ONLY: 'h:mm a',            // 2:30 PM
  DISPLAY_US_FORMAT: 'MM/dd/yyyy',        // 10/12/2026
  
  // Input/API formats - America/Chicago wall-clock
  ISO_DATE: 'yyyy-MM-dd',                 // 2024-01-15
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",  // 2024-01-15T14:30:00
  
  // Backend formats - naive America/Chicago wall-clock
  BACKEND_DATE: 'yyyy-MM-dd',
  BACKEND_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// Format date for display (Dates already hold America/Chicago wall-clock time)
export const formatForDisplay = (date: Date | string | null | undefined, formatType: keyof typeof DATE_FORMATS = 'DISPLAY_MEDIUM'): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(isZonedIsoString(date) ? toAppWallClock(date) : date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, DATE_FORMATS[formatType], { locale: enUS });
  } catch (error) {
    console.warn('Invalid date format for display:', date, error);
    return '';
  }
};

// Format date for backend as an America/Chicago calendar date
export const formatForBackend = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return toServerDate(dateObj);
  } catch (error) {
    console.warn('Invalid date for backend:', date, error);
    return '';
  }
};

// Format datetime for backend as naive America/Chicago wall-clock
export const formatDateTimeForBackend = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return toServerDateTime(dateObj);
  } catch (error) {
    console.warn('Invalid datetime for backend:', date, error);
    return '';
  }
};

// Parse date from various input formats
/**
 * Parse a timestamp from the API into a valid Date, or `undefined`.
 *
 * Accepts every shape the backend has sent for session times:
 *   "2026-09-27T14:03:22.123456"        (naive — America/Chicago wall-clock)
 *   "2026-09-27T14:03:22.123456-05:00"  (explicit offset; converted to Chicago wall-clock)
 *   "2026-09-27T14:03:22.123456Z"       (explicit UTC; converted to Chicago wall-clock)
 *   "2026-09-27 14:03:22"               (space separator)
 * plus epoch numbers and Date objects. Fractional seconds are trimmed to
 * milliseconds because some browsers (Safari) reject longer fractions.
 * Never returns an Invalid Date.
 */
export const parseServerDateTime = (value: string | number | Date | null | undefined): Date | undefined => {
  if (value === null || value === undefined || value === '') return undefined;

  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  let str = String(value).trim();
  if (!str) return undefined;

  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    return isNaN(d.getTime()) ? undefined : d;
  }

  // "YYYY-MM-DD HH:MM..." → "YYYY-MM-DDTHH:MM..."
  str = str.replace(/^(\d{4}-\d{2}-\d{2})[ T]/, '$1T');
  // Trim fractional seconds to 3 digits
  str = str.replace(/(\.\d{3})\d+/, '$1');

  // Zoned values become Chicago wall-clock; naive values already are (parsed as local).
  if (isZonedIsoString(str)) str = toAppWallClock(str);

  const d = new Date(str);
  return isNaN(d.getTime()) ? undefined : d;
};

export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) return isoDate;
    return null;
  } catch (error) {
    console.warn('Failed to parse date:', dateString, error);
    return null;
  }
};

// Get today's date formatted consistently
export const getTodayFormatted = (formatType: keyof typeof DATE_FORMATS = 'DISPLAY_MEDIUM'): string => {
  return formatForDisplay(new Date(), formatType);
};

// Format date range for display
export const formatDateRange = (from: Date | string | null | undefined, to: Date | string | null | undefined): string => {
  if (!from) return '';
  
  const fromDate = formatForDisplay(from, 'DISPLAY_SHORT');
  if (!to) return fromDate;
  
  const toDate = formatForDisplay(to, 'DISPLAY_SHORT');
  return `${fromDate} - ${toDate}`;
};

// Check if date is valid
export const isValidDate = (date: Date | string | null | undefined): boolean => {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj);
  } catch {
    return false;
  }
};

// Add days to a date
export const addDays = (date: Date | string, days: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
};

// Get date difference in days
export const getDateDifference = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Create a consistent calendar date for navigation
export const getCalendarMonth = (date?: Date | string | null): Date => {
  if (!date) return new Date();
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return new Date();
    
    // Return first day of month for consistent calendar navigation
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
  } catch {
    return new Date();
  }
};

// Format date for consistent calendar display
export const formatCalendarDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    // Format specifically for calendar components to prevent jumping
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.warn('Failed to format calendar date:', date, error);
    return '';
  }
};

// Format date for US display (MM/dd/yyyy)
export const formatUsDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    return format(dateObj, DATE_FORMATS.DISPLAY_US_FORMAT, { locale: enUS });
  } catch (error) {
    console.warn('Failed to format US date:', date, error);
    return '';
  }
};

// Backward compatibility alias
export const formatDate = formatForDisplay;

export default {
  formatForDisplay,
  formatForBackend,
  formatDateTimeForBackend,
  parseDate,
  getTodayFormatted,
  formatDateRange,
  isValidDate,
  addDays,
  getDateDifference,
  getCalendarMonth,
  formatCalendarDate,
  getUserTimezone,
  getTimezoneOffsetMinutes,
  DATE_FORMATS,
  // Alias for backward compatibility
  formatDate,
};

export const formatTime = (date: Date | string, is12HourFormat: boolean) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return is12HourFormat ? format(d, 'hh:mm a') : format(d, 'HH:mm');
};      

