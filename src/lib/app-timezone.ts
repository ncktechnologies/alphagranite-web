/**
 * The whole app runs on America/Chicago wall-clock time, regardless of the
 * viewer's own timezone.
 *
 * Model: every Date in the app holds Chicago wall-clock time in its *local*
 * fields, so getHours(), date-fns format(), toLocaleString(), date pickers and
 * calendars all show Chicago time without knowing about timezones.
 *  - Incoming: server timestamps ("2026-09-30T14:00:00-05:00") are rewritten to
 *    naive Chicago wall-clock strings ("2026-09-30T14:00:00"), which JS parses
 *    as local time.
 *  - Outgoing: Dates and ISO strings with Z/an offset are sent as naive local
 *    wall-clock strings; the backend reads naive values as Chicago time.
 *  - Clock: outside Chicago, `new Date()` / `Date.now()` are shifted so "now"
 *    reads Chicago wall-clock in local fields. In Chicago nothing is patched.
 */
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const APP_TIME_ZONE = 'America/Chicago';

const RealDate = Date;

// ISO date-time carrying Z or a UTC offset, e.g. 2026-09-30T14:00:00.123456-05:00
const ZONED_ISO = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/i;

export const isZonedIsoString = (value: unknown): value is string =>
  typeof value === 'string' && ZONED_ISO.test(value);

// Browser-safe instant: "T" separator, at most millisecond precision, "+hh:mm" offset.
const parseZonedIso = (value: string): Date => {
  const [, date, time, fraction = '', zone] = value.match(ZONED_ISO)!;
  const offset = /^[+-]\d{4}$/.test(zone) ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone;
  return new RealDate(`${date}T${time}${fraction.slice(0, 4)}${offset}`);
};

/** Server timestamp with an offset -> naive Chicago wall-clock string (JS parses it as local time). */
export const toAppWallClock = (value: string): string => {
  const match = value.match(ZONED_ISO);
  if (!match) return value;
  const instant = parseZonedIso(value);
  if (isNaN(instant.getTime())) return value;
  const hasSeconds = match[2].length > 5;
  const pattern = match[3] ? "yyyy-MM-dd'T'HH:mm:ss.SSS" : hasSeconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm";
  return formatInTimeZone(instant, APP_TIME_ZONE, pattern);
};

/** Date -> naive Chicago wall-clock datetime for the API, e.g. "2026-09-30T14:00:00". */
export const toServerDateTime = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm:ss");

/** Date -> Chicago calendar date for the API, e.g. "2026-09-30". */
export const toServerDate = (date: Date): string => format(date, 'yyyy-MM-dd');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

const mapLeaves = (value: unknown, mapLeaf: (leaf: unknown) => unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => mapLeaves(item, mapLeaf));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) out[key] = mapLeaves(value[key], mapLeaf);
    return out;
  }
  return mapLeaf(value);
};

/** Rewrite every server timestamp in a response body to Chicago wall-clock. */
export const fromServerPayload = <T>(data: T): T =>
  mapLeaves(data, (leaf) => (isZonedIsoString(leaf) ? toAppWallClock(leaf) : leaf)) as T;

const toServerLeaf = (leaf: unknown): unknown => {
  if (leaf instanceof RealDate) return isNaN(leaf.getTime()) ? leaf : toServerDateTime(leaf);
  if (isZonedIsoString(leaf)) {
    const instant = parseZonedIso(leaf);
    return isNaN(instant.getTime()) ? leaf : toServerDateTime(instant);
  }
  return leaf;
};

/** Rewrite Dates / zoned ISO strings in a request body or params to naive Chicago wall-clock. */
export const toServerPayload = <T>(data: T): T => {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const out = new FormData();
    data.forEach((value, key) => out.append(key, typeof value === 'string' ? (toServerLeaf(value) as string) : value));
    return out as T;
  }
  return mapLeaves(data, toServerLeaf) as T;
};

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------

const chicagoParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Milliseconds to add to a real instant so its local fields read Chicago wall-clock. */
const shiftToChicago = (realMs: number): number => {
  const parts: Record<string, number> = {};
  for (const { type, value } of chicagoParts.formatToParts(new RealDate(realMs))) parts[type] = Number(value);
  const wall = new RealDate(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, realMs % 1000);
  return wall.getTime() - realMs;
};

let shiftMs = 0;
let shiftComputedAt = -Infinity;

const appNowMs = (): number => {
  const real = RealDate.now();
  if (real - shiftComputedAt > 60_000) {
    shiftMs = shiftToChicago(real);
    shiftComputedAt = real;
  }
  return real + shiftMs;
};

const browserTimeZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
})();

/**
 * Make `new Date()` and `Date.now()` read Chicago wall-clock in browsers outside
 * Chicago. Dates built from explicit arguments are untouched. Must run before
 * the rest of the app is imported (see src/lib/install-app-clock.ts).
 */
export const installAppClock = (): void => {
  if (browserTimeZone === APP_TIME_ZONE || (RealDate as any).__appClock) return;

  function AppDate(this: unknown, ...args: any[]) {
    if (!new.target) return new RealDate(appNowMs()).toString();
    return args.length === 0 ? new RealDate(appNowMs()) : new (RealDate as any)(...args);
  }
  Object.setPrototypeOf(AppDate, RealDate); // Date.parse / Date.UTC
  AppDate.prototype = RealDate.prototype; // `instanceof Date` keeps working
  (AppDate as any).now = appNowMs;
  (AppDate as any).__appClock = true;
  (globalThis as any).Date = AppDate;
};
