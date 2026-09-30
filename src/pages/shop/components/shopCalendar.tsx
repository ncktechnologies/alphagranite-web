import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  CalendarX2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Lock,
  Plus,
  Rows3,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTypingTarget } from '@/lib/keyboard';
import {
  format,
  addDays,
  addHours,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isWeekend,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getMonth,
} from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useGetAllShopPlansQuery, useGetFabTypesQuery, useGetWorkstationsQuery, useGetEmployeesQuery, useGetPlanningSectionsQuery, useGetRolesQuery } from '@/store/api';
import CreatePlanPage from './createPlanePage';
import {
  SHOP_DAY_START_HOUR,
  SHOP_DAY_END_HOUR,
  SHOP_BREAK_START_HOUR,
  SHOP_BREAK_END_HOUR,
} from '@/lib/shop-time';

// ─── Constants ───────────────────────────────────────────────────────────────
const DAY_START_HOUR = SHOP_DAY_START_HOUR;
const DAY_END_HOUR = SHOP_DAY_END_HOUR;
const BREAK_START_HOUR = SHOP_BREAK_START_HOUR;
const BREAK_END_HOUR = SHOP_BREAK_END_HOUR;
const BREAK_DURATION = BREAK_END_HOUR - BREAK_START_HOUR;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const DISPLAY_HOURS = TOTAL_HOURS;
const HOUR_HEIGHT = 80;
const HOUR_WIDTH = 220;
const DAY_COL_MIN_WIDTH = 160;
const EVENT_MIN_WIDTH = 96; // keeps overlapping blocks legible instead of "41…" slivers
const ROW_LANE_H = 64;
const END_GUTTER_X = 96; // closed time after the shop day ends (timeline layout)
const END_GUTTER_Y = 40; // same for the columns layout
const LANE_GAP = 4;
const VIEW_STORAGE_KEY = 'shop_calendar_view_v1';

// ─── Helper functions ──────────────────────────────────────────────────────
const getTimePosition = (hour: number) => (hour - DAY_START_HOUR) * HOUR_HEIGHT;
const getHorizontalPosition = (hour: number) => (hour - DAY_START_HOUR) * HOUR_WIDTH;

const getVisualEndPosition = (startHour: number, duration: number, unit: number) => {
  const endHour = startHour + duration;
  const crossesBreak = startHour < BREAK_START_HOUR && endHour > BREAK_START_HOUR;
  return (endHour - DAY_START_HOUR + (crossesBreak ? BREAK_DURATION : 0)) * unit;
};

const formatHour = (hour: number, is12: boolean) =>
  is12
    ? `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`
    : `${String(hour).padStart(2, '0')}:00`;

const FAB_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'standard': { bg: '#9eeb47', border: '#6b9e2f', text: '#1e293b' },
  'fab only': { bg: '#5bd1d7', border: '#2e8b8f', text: '#1e293b' },
  'cust redo': { bg: '#f0bf4c', border: '#b88a2a', text: '#1e293b' },
  'resurface': { bg: '#d094ea', border: '#8f5ca8', text: '#1e293b' },
  'fast track': { bg: '#f59794', border: '#b35e5b', text: '#1e293b' },
  'ag redo': { bg: '#f5cc94', border: '#b58f4f', text: '#1e293b' },
};
const FAB_TYPE_LABELS: Record<string, string> = {
  'standard': 'Standard',
  'fab only': 'FAB only',
  'cust redo': 'Cust redo',
  'resurface': 'Resurface',
  'fast track': 'Fast track',
  'ag redo': 'AG redo',
};
const DEFAULT_COLOR = { bg: '#ffffff', border: '#9aa1ad', text: '#1e293b' };

function getColorForFab(_fabId: string | number, fabType: string) {
  return FAB_TYPE_COLORS[fabType?.toLowerCase()] ?? DEFAULT_COLOR;
}

const eventKey = (ev: any) => `${ev._planId ?? ev.id}-${ev.scheduled_start_date}`;

const timeRange = (ev: any) => {
  const start = new Date(ev.scheduled_start_date);
  const end = addHours(start, Number(ev.estimated_hours) || 0);
  return `${format(start, 'h:mm')} – ${format(end, 'h:mm a')}`;
};

const BREAK_PATTERN =
  'bg-[repeating-linear-gradient(135deg,rgb(148_155_140/0.18)_0px,rgb(148_155_140/0.18)_6px,transparent_6px,transparent_12px)]';

// ─── Small presentational pieces ─────────────────────────────────────────────
function EventDetails({ ev }: { ev: any }) {
  const job = [ev.job_name, ev.job_number].filter(Boolean).join(' · ');
  const totalHours = ev._originalHours ?? ev.estimated_hours;
  const rows: [string, React.ReactNode][] = [
    ['Time', timeRange(ev)],
    ['Operator', ev.operator_name || '—'],
    ['Workstation', ev.workstation_name || '—'],
    ['Est. hours', totalHours ?? '—'],
    ['Job', job || '—'],
    ['Account', ev.account_name || '—'],
    ['Plan', ev.plan_name || '—'],
  ];
  const { bg } = getColorForFab(ev.fab_id, ev.fab_type);
  const pct = Math.max(0, Math.min(100, Number(ev.work_percentage) || 0));

  return (
    <div className="w-64 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">FAB #{ev.fab_id}</span>
        {ev.fab_type && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[13px] font-medium text-text">
            <span className="size-2 rounded-full" style={{ backgroundColor: bg }} />
            {ev.fab_type}
          </span>
        )}
      </div>
      {ev.has_pending_shop_revision && (
        <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[13px] font-medium text-destructive">
          <AlertTriangle className="size-3.5" /> Pending shop revision
        </div>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate text-foreground">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div>
        <div className="mb-1 flex justify-between text-[13px] text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums text-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {ev.notes && <p className="border-t border-border pt-2 text-xs text-text">{ev.notes}</p>}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-black/10">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

interface MultiSelectFilterProps {
  allLabel: string;
  unitLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholderContent?: React.ReactNode;
}

function MultiSelectFilter({
  allLabel,
  unitLabel,
  searchPlaceholder,
  emptyText,
  options,
  selected,
  onChange,
  placeholderContent,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.name ?? `1 ${unitLabel}`
        : `${selected.length} ${unitLabel}s`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 min-w-[140px] max-w-[200px] items-center justify-between gap-2 rounded-lg border bg-background px-3 text-sm shadow-xs shadow-black/[0.03] transition-colors hover:border-[#CDD2C6] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
            selected.length ? 'border-primary-light/70 bg-primary-soft/60 text-primary-accent font-medium' : 'border-input text-text',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {placeholderContent && options.length === 0
                ? placeholderContent
                : options.map((o) => {
                    const isSelected = selected.includes(o.id);
                    return (
                      <CommandItem
                        key={o.id}
                        onSelect={() =>
                          onChange(isSelected ? selected.filter((id) => id !== o.id) : [...selected, o.id])
                        }
                      >
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-[4px] border border-[#CDD2C6]',
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : '[&_svg]:invisible',
                          )}
                        >
                          <Check className="size-3!" />
                        </div>
                        <span className="truncate">{o.name}</span>
                      </CommandItem>
                    );
                  })}
            </CommandGroup>
          </CommandList>
          {selected.length > 0 && (
            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-md px-2 py-1.5 text-start text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-background text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function readStoredView(): { viewMode: 'day' | 'week' | 'month'; isAxisSwapped: boolean } {
  try {
    const raw = localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return {
        viewMode: ['day', 'week', 'month'].includes(v.viewMode) ? v.viewMode : 'week',
        isAxisSwapped: typeof v.isAxisSwapped === 'boolean' ? v.isAxisSwapped : true,
      };
    }
  } catch {
    /* storage unavailable */
  }
  return { viewMode: 'week', isAxisSwapped: true };
}

// ─── Main Component ─────────────────────────────────────────────────────────
const ShopCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const lockedFabId = params.get('fabId');
  const urlDate = params.get('date');

  const [currentDate, setCurrentDate] = useState(() => {
    if (urlDate) {
      const parsed = new Date(urlDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [, setSelectedDate] = useState<Date | null>(null);
  const [is12HourFormat] = useState(true);
  const [isAxisSwapped, setIsAxisSwapped] = useState(() => readStoredView().isAxisSwapped);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(() => readStoredView().viewMode);
  const [activePage, setActivePage] = useState<'calendar' | 'create-plan'>('calendar');
  const [, setFabPickerOpen] = useState(false);
  const [, setFabPickerInput] = useState('');
  const [createPlanFabId, setCreatePlanFabId] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [searchFabId, setSearchFabId] = useState('');
  const [searchType, setSearchType] = useState<'fab_id' | 'job_number'>('fab_id');
  const [filterFabType, setFilterFabType] = useState('');
  const [filterWorkstation, setFilterWorkstation] = useState<string[]>([]);
  const [filterOperator, setFilterOperator] = useState<string[]>([]);
  const [filterPlanningSections, setFilterPlanningSections] = useState<string[]>([]);

  const isSearchLocked = !!lockedFabId;

  // Remember the preferred view per browser
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify({ viewMode, isAxisSwapped }));
    } catch {
      /* storage unavailable */
    }
  }, [viewMode, isAxisSwapped]);

  // ── Data fetching ──
  const { data: fabTypesData } = useGetFabTypesQuery();
  const { data: workstationsData } = useGetWorkstationsQuery();

  // ─── Fetch Roles to get "operator" role ID ──────────────────────────────
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();
  const operatorRoleId = useMemo(() => {
    if (!rolesData) return null;
    const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
    if (!Array.isArray(roles)) return null;
    const role = roles.find((r: any) => (r.name || '').toLowerCase().trim() === 'operator');
    return role?.id ?? null;
  }, [rolesData]);

  // ─── Fetch Employees filtered by operator role ──────────────────────────
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery(
    { role_id: operatorRoleId ?? undefined },
    { skip: !operatorRoleId }
  );

  const { data: planningSectionsData } = useGetPlanningSectionsQuery();

  const fabTypes = useMemo(() => {
    if (Array.isArray(fabTypesData)) return fabTypesData.map((f: any) => f.name || f).sort();
    if (fabTypesData?.data) return fabTypesData.data.map((f: any) => f.name || f).sort();
    return [];
  }, [fabTypesData]);

  const workstations = useMemo(() => {
    const arr = workstationsData?.data || (Array.isArray(workstationsData) ? workstationsData : []);
    return arr.map((w: any) => ({ id: String(w.id), name: w.name || `WS ${w.id}` }));
  }, [workstationsData]);

  const operators = useMemo(() => {
    if (!employeesData) return [];
    const employees = employeesData?.data ?? employeesData;
    if (!Array.isArray(employees)) return [];
    return employees
      .map((e: any) => ({
        id: String(e.id),
        name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [employeesData]);

  const planningSections = useMemo(() => {
    const arr = (planningSectionsData as any)?.data || (Array.isArray(planningSectionsData) ? planningSectionsData : []);
    return arr.map((s: any) => ({ id: String(s.id), name: s.plan_name || `Section ${s.id}` }));
  }, [planningSectionsData]);

  // ── Build query parameters ──
  const buildQueryParams = useCallback(() => {
    const qp: any = {
      view: viewMode,
      reference_date: format(currentDate, 'yyyy-MM-dd'),
      limit: 1000,
    };

    if (lockedFabId) {
      qp.fab_id = Number(lockedFabId);
    } else if (searchFabId) {
      qp.search = searchFabId;
      qp.type = searchType;
    }

    if (filterFabType) qp.fab_type = filterFabType;
    if (filterWorkstation.length > 0) qp.workstation_id = filterWorkstation.map(Number);
    if (filterOperator.length > 0) qp.operator_id = filterOperator.map(Number);
    if (filterPlanningSections.length > 0) qp.planning_section_id = filterPlanningSections.map(Number);

    return qp;
  }, [currentDate, viewMode, lockedFabId, searchFabId, searchType, filterFabType, filterWorkstation, filterOperator, filterPlanningSections]);

  const queryParams = buildQueryParams();

  // NOTE: we deliberately use `currentData` (not `data`) everywhere below.
  // `data` holds the *previous* successful response and keeps returning it
  // while a new request for different args is in flight — that's what was
  // causing stale events to render during a filter change. `currentData`
  // is undefined until the response for the *current* args resolves, so
  // combined with the isFetching overlay below, the grid correctly shows
  // "nothing yet" instead of "old filter's results" while fetching.
  const {
    currentData: plansResponse,
    isLoading,
    isFetching,
  } = useGetAllShopPlansQuery(queryParams);

  const flatPlans = useMemo(
    () => plansResponse?.data?.plans ?? plansResponse?.plans ?? [],
    [plansResponse],
  );

  const planMap = useMemo(() => {
    const map: Record<number, any> = {};
    flatPlans.forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [flatPlans]);

  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const displayDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  }, [currentDate, viewMode]);

  const monthWeeks = useMemo(() => {
    if (viewMode !== 'month') return [];
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  }, [currentDate, viewMode]);

  // ─── Group events by day (splitting work around the break / end of day) ─
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const allDays = viewMode === 'month' ? monthWeeks.flat() : displayDays;
    allDays.forEach((d) => { grouped[format(d, 'yyyy-MM-dd')] = []; });

    const plans = Array.isArray(flatPlans) ? flatPlans : [];

    plans.forEach((event: any) => {
      const startDate = new Date(event.scheduled_start_date);
      let remainingHours = Number(event.estimated_hours) || 0;
      let currentDate = startDate;
      let currentHour = startDate.getHours() + startDate.getMinutes() / 60;

      // If start time falls inside break, move to end of break
      if (currentHour >= BREAK_START_HOUR && currentHour < BREAK_END_HOUR) {
        currentHour = BREAK_END_HOUR;
        currentDate.setHours(BREAK_END_HOUR, 0, 0, 0);
      }

      while (remainingHours > 0) {
        let hoursToday = 0;
        if (currentHour < BREAK_START_HOUR) {
          hoursToday = Math.min(remainingHours, BREAK_START_HOUR - currentHour);
        } else if (currentHour >= BREAK_END_HOUR) {
          hoursToday = Math.min(remainingHours, DAY_END_HOUR - currentHour);
        } else {
          // Should not happen – skip to break end
          currentHour = BREAK_END_HOUR;
          continue;
        }

        if (hoursToday > 0) {
          const partStart = new Date(currentDate);
          partStart.setHours(currentHour, 0, 0, 0);
          const key = format(currentDate, 'yyyy-MM-dd');
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push({
            ...event,
            _isSplitPart: true,
            _originalHours: event.estimated_hours,
            estimated_hours: hoursToday,
            scheduled_start_date: partStart.toISOString(),
            _planId: event.id,
          });
          remainingHours -= hoursToday;
          currentHour += hoursToday;
        }

        // If we've reached the break, skip over it
        if (currentHour >= BREAK_START_HOUR && currentHour < BREAK_END_HOUR) {
          currentHour = BREAK_END_HOUR;
        }

        // If we've reached end of day or no time left, move to next day
        if (currentHour >= DAY_END_HOUR || remainingHours <= 0) {
          currentDate = addDays(currentDate, 1);
          currentHour = DAY_START_HOUR;
        }
      }
    });

    return grouped;
  }, [flatPlans, displayDays, monthWeeks, viewMode]);

  // Count distinct plans (a plan split around lunch is still one plan) and hours in view
  const { planCount, scheduledHours } = useMemo(() => {
    // Month view only counts days inside the month (not the padding days of adjacent months)
    const visibleKeys = new Set(displayDays.map((d) => format(d, 'yyyy-MM-dd')));
    const ids = new Set<number | string>();
    let hours = 0;
    Object.entries(eventsByDay).forEach(([k, evs]) => {
      if (!visibleKeys.has(k)) return;
      evs.forEach((ev) => {
        ids.add(ev._planId ?? ev.id);
        hours += Number(ev.estimated_hours) || 0;
      });
    });
    return { planCount: ids.size, scheduledHours: Math.round(hours * 10) / 10 };
  }, [eventsByDay, displayDays]);

  const handlePrevious = useCallback(() => {
    if (viewMode === 'day') setCurrentDate((d) => addDays(d, -1));
    else if (viewMode === 'week') setCurrentDate((d) => addDays(d, -7));
    else setCurrentDate((d) => addMonths(d, -1));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === 'day') setCurrentDate((d) => addDays(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addDays(d, 7));
    else setCurrentDate((d) => addMonths(d, 1));
  }, [viewMode]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleOpenEditPlan = useCallback((event: any) => {
    const planId = event._planId || event.id;
    const fullPlan = planMap[planId];
    if (fullPlan) {
      setSelectedPlan(fullPlan);
      setCreatePlanFabId(String(fullPlan.fab_id));
    } else {
      setSelectedPlan(event);
      setCreatePlanFabId(String(event.fab_id));
    }
    setActivePage('create-plan');
  }, [planMap]);

  const handleBackToCalendar = useCallback(() => {
    setActivePage('calendar');
    setSelectedPlan(null);
    setCreatePlanFabId('');
  }, []);

  const openDay = useCallback((day: Date) => {
    setCurrentDate(day);
    setViewMode('day');
  }, []);

  const hasActiveFilters =
    !!searchFabId ||
    !!filterFabType ||
    filterWorkstation.length > 0 ||
    filterOperator.length > 0 ||
    filterPlanningSections.length > 0;

  const clearFilters = () => {
    setSearchFabId('');
    setFilterFabType('');
    setFilterWorkstation([]);
    setFilterOperator([]);
    setFilterPlanningSections([]);
  };

  // ─── Keyboard: ← / → navigate, T today, D / W / M views ────────────────
  useEffect(() => {
    if (activePage !== 'calendar') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'ArrowRight') handleNext();
      else if (k === 't') handleToday();
      else if (k === 'd') setViewMode('day');
      else if (k === 'w') setViewMode('week');
      else if (k === 'm') setViewMode('month');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePage, handlePrevious, handleNext, handleToday]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const nowHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  const showTimeIndicator = nowHour >= DAY_START_HOUR && nowHour < DAY_END_HOUR;

  // ─── Column view: position events ──────────────────────────────────────
  const getEventsWithPositions = useMemo(() => {
    return (events: any[]) => {
      if (!events.length) return [];
      const sorted = [...events].sort(
        (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime(),
      );
      const ranges = sorted.map((ev) => {
        const s = new Date(ev.scheduled_start_date).getTime();
        const e = s + (Number(ev.estimated_hours) || 0) * 3_600_000;
        return { s, e };
      });
      const cols: number[] = new Array(sorted.length).fill(0);
      ranges.forEach((r, i) => {
        const used = new Set<number>();
        for (let j = 0; j < i; j++) if (ranges[j].e > r.s) used.add(cols[j]);
        let c = 0;
        while (used.has(c)) c++;
        cols[i] = c;
      });
      const maxCol = Math.max(...cols, 0) + 1;
      return sorted.map((ev, i) => {
        const start = new Date(ev.scheduled_start_date);
        const startH = start.getHours() + start.getMinutes() / 60;
        const top = getTimePosition(startH);
        const height = Math.max(HOUR_HEIGHT * 0.5, getVisualEndPosition(startH, Number(ev.estimated_hours) || 0, HOUR_HEIGHT) - top);
        return { ...ev, _top: Math.max(0, top), _height: height, _col: cols[i], _maxCol: maxCol };
      });
    };
  }, []);

  // Per-day layout so header + body columns share the same (overlap-aware) width
  const dayLayouts = useMemo(
    () =>
      displayDays.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const positioned = getEventsWithPositions(eventsByDay[key] || []);
        const maxCol = positioned[0]?._maxCol ?? 1;
        const minWidth = Math.max(viewMode === 'day' ? 320 : DAY_COL_MIN_WIDTH, maxCol * EVENT_MIN_WIDTH);
        return { day, key, positioned, minWidth };
      }),
    [displayDays, eventsByDay, getEventsWithPositions, viewMode],
  );

  const renderEventCard = useCallback((event: any) => {
    const col = event._maxCol ?? 1;
    const { bg, border, text } = getColorForFab(event.fab_id, event.fab_type);
    const PAD = 3;
    const colW = `calc(${100 / col}% - ${PAD * 2}px)`;
    const colLeft = `calc(${(event._col / col) * 100}% + ${PAD}px)`;
    const h = event._height - PAD * 2;
    const pendingRevision = !!event?.has_pending_shop_revision;

    return (
      <Tooltip key={eventKey(event)} delayDuration={250}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'group absolute z-[2] cursor-pointer overflow-hidden rounded-lg border text-start shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[box-shadow,transform] hover:z-[3] hover:-translate-y-px hover:shadow-card-hover focus-visible:z-[3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pendingRevision && 'ring-2 ring-destructive ring-offset-1',
            )}
            style={{
              top: event._top + PAD,
              height: h,
              left: colLeft,
              width: colW,
              backgroundColor: bg,
              borderColor: border,
            }}
            onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(event); }}
            aria-label={`FAB ${event.fab_id}, ${event.plan_name ?? ''}, ${timeRange(event)}`}
          >
            <div className="@container flex h-full flex-col gap-0.5 px-2 py-1.5" style={{ color: text }}>
              <div className="flex items-center gap-1 min-w-0">
                {pendingRevision && <AlertTriangle className="size-3 shrink-0 text-destructive" />}
                <span className="truncate text-[14px] font-semibold tabular-nums">#{event.fab_id}</span>
                {h >= 48 && (
                  <span className="ms-auto hidden shrink-0 text-[12px] font-semibold tabular-nums opacity-70 @[104px]:inline">
                    {event.work_percentage ?? 0}%
                  </span>
                )}
              </div>
              {h >= 48 && (
                <p className="truncate text-[13px] font-medium opacity-80">
                  {[event.plan_name, event.operator_name].filter(Boolean).join(' · ')}
                </p>
              )}
              {h >= 84 && <p className="truncate text-[12px] opacity-70">{timeRange(event)}</p>}
              {h >= 110 && event.workstation_name && (
                <p className="truncate text-[12px] opacity-70">{event.workstation_name}</p>
              )}
              {h >= 40 && (
                <div className="mt-auto">
                  <ProgressBar value={event.work_percentage} color={border} />
                </div>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" variant="light" className="p-3">
          <EventDetails ev={event} />
        </TooltipContent>
      </Tooltip>
    );
  }, [handleOpenEditPlan]);

  if (activePage === 'create-plan') {
    return (
      <CreatePlanPage
        onBack={handleBackToCalendar}
        selectedDate={null}
        selectedTimeSlot={null}
        selectedEvent={selectedPlan ?? null}
        prefillFabId={createPlanFabId}
        onEventCreated={handleBackToCalendar}
      />
    );
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const calLabel =
    viewMode === 'day'
      ? format(currentDate, 'EEEE, MMMM d, yyyy')
      : viewMode === 'week'
        ? `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
        : format(currentDate, 'MMMM yyyy');

  const viewsToday = displayDays.some((d) => isSameDay(d, new Date()));
  const hourMarks = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading title="Shop Plan" description="Schedule and track cut plans across workstations and operators" />
          <ToolbarActions>
            <Button size="lg" onClick={() => navigate('/shop/create-plan')}>
              <Plus />
              Create plan
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card className="overflow-hidden">
          {/* ─── Navigation row ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="md" onClick={handleToday} disabled={viewsToday}>
                    Today
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Jump to today <Kbd size="xs" className="ms-1 bg-white/15 border-white/20 text-white font-sans">T</Kbd></TooltipContent>
              </Tooltip>
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" mode="icon" onClick={handlePrevious} aria-label={`Previous ${viewMode}`}>
                      <ChevronLeft className="size-[18px]!" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous {viewMode} <Kbd size="xs" className="ms-1 bg-white/15 border-white/20 text-white font-sans">←</Kbd></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" mode="icon" onClick={handleNext} aria-label={`Next ${viewMode}`}>
                      <ChevronRight className="size-[18px]!" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next {viewMode} <Kbd size="xs" className="ms-1 bg-white/15 border-white/20 text-white font-sans">→</Kbd></TooltipContent>
                </Tooltip>
              </div>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">{calLabel}</span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    selected={currentDate}
                    defaultMonth={currentDate}
                    onSelect={(d) => {
                      if (d) {
                        setCurrentDate(d);
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Calendar view"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'day', label: 'Day', title: 'Day view (D)' },
                  { value: 'week', label: 'Week', title: 'Week view (W)' },
                  { value: 'month', label: 'Month', title: 'Month view (M)' },
                ]}
              />
              {viewMode !== 'month' && (
                <SegmentedControl
                  label="Layout"
                  value={isAxisSwapped ? 'rows' : 'columns'}
                  onChange={(v) => setIsAxisSwapped(v === 'rows')}
                  options={[
                    { value: 'rows', label: <><Rows3 className="size-4" /><span className="hidden sm:inline">Timeline</span></>, title: 'Days as rows, time across' },
                    { value: 'columns', label: <><Columns3 className="size-4" /><span className="hidden sm:inline">Columns</span></>, title: 'Days as columns, time down' },
                  ]}
                />
              )}
            </div>
          </div>

          {/* ─── Filters row ─── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {isSearchLocked ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-primary-light/70 bg-primary-soft px-3 text-sm">
                  <Lock className="size-3.5 text-primary-accent" />
                  <span className="font-semibold text-primary-accent">FAB #{lockedFabId}</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Select value={searchType} onValueChange={(v) => setSearchType(v as 'fab_id' | 'job_number')}>
                    <SelectTrigger className="h-9 w-[124px] rounded-e-none border-e-0 text-sm">
                      <SelectValue placeholder="Search by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fab_id">FAB ID</SelectItem>
                      <SelectItem value="job_number">Job number</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder={`Search ${searchType === 'fab_id' ? 'FAB ID' : 'job number'}…`}
                      value={searchFabId}
                      onChange={(e) => setSearchFabId(e.target.value)}
                      className="h-9 w-[200px] rounded-lg rounded-s-none border border-input bg-background ps-9 pe-8 text-sm text-foreground shadow-xs shadow-black/[0.03] outline-none transition-[border-color,box-shadow] placeholder:text-placeholder hover:border-[#CDD2C6] focus-visible:border-primary-light focus-visible:ring-[3px] focus-visible:ring-ring/25"
                    />
                    {searchFabId && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={() => setSearchFabId('')}
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <Select value={filterFabType || 'all'} onValueChange={(v) => setFilterFabType(v === 'all' ? '' : v)}>
                <SelectTrigger
                  className={cn(
                    'h-9 min-w-[140px] w-auto text-sm',
                    filterFabType && 'border-primary-light/70 bg-primary-soft/60 text-primary-accent font-medium',
                  )}
                >
                  <SelectValue placeholder="All FAB types" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px] overflow-y-auto">
                  <SelectItem value="all">All FAB types</SelectItem>
                  {fabTypes.map((t: string) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full border border-black/10" style={{ backgroundColor: getColorForFab(0, t).bg }} />
                        {t}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <MultiSelectFilter
                allLabel="All workstations"
                unitLabel="workstation"
                searchPlaceholder="Search workstations…"
                emptyText="No workstations found."
                options={workstations}
                selected={filterWorkstation}
                onChange={setFilterWorkstation}
              />
              <MultiSelectFilter
                allLabel="All operators"
                unitLabel="operator"
                searchPlaceholder="Search operators…"
                emptyText="No operators found."
                options={operators}
                selected={filterOperator}
                onChange={setFilterOperator}
                placeholderContent={
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    {employeesLoading || rolesLoading ? 'Loading operators…' : 'No operator users found'}
                  </div>
                }
              />
              <MultiSelectFilter
                allLabel="All plans"
                unitLabel="plan"
                searchPlaceholder="Search sections…"
                emptyText="No sections found."
                options={planningSections}
                selected={filterPlanningSections}
                onChange={setFilterPlanningSections}
              />

              {hasActiveFilters && (
                <Button variant="ghost" size="md" onClick={clearFilters} className="text-muted-foreground">
                  <X />
                  Clear filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm" aria-live="polite">
              {isFetching ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                  Updating…
                </span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground tabular-nums">{planCount}</span>{' '}
                  {planCount === 1 ? 'plan' : 'plans'}
                  <span className="mx-1.5 text-border">•</span>
                  <span className="font-semibold text-foreground tabular-nums">{scheduledHours}</span> h scheduled
                </span>
              )}
            </div>
          </div>

          {/* ─── Legend ─── */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border/80 px-4 py-2.5 text-xs text-muted-foreground">
            {Object.entries(FAB_TYPE_COLORS).map(([k, c]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-[4px] border" style={{ backgroundColor: c.bg, borderColor: c.border }} />
                {FAB_TYPE_LABELS[k]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-[4px] bg-background ring-2 ring-destructive" />
              Pending revision
            </span>
            {viewMode !== 'month' && (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('size-3 rounded-[4px] border border-border', BREAK_PATTERN)} />
                Lunch break
              </span>
            )}
          </div>

          {/* ─── Calendar body ─── */}
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-[420px] w-full rounded-lg" />
            </div>
          ) : (
            <TooltipProvider>
              {/* isolate: keep the sticky headers/overlays' z-indices from stacking above the app sidebar/header */}
              <div className="relative isolate">
                {isFetching && (
                  <div className="pointer-events-none absolute inset-0 z-40 bg-background/50 backdrop-blur-[1px]" aria-hidden />
                )}
                {!isFetching && planCount === 0 && (
                  <div className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center px-4">
                    <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-background/95 px-6 py-5 text-center shadow-popover">
                      <span className="flex size-10 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                        <CalendarX2 className="size-5 text-muted-foreground" />
                      </span>
                      <p className="text-sm font-semibold text-foreground">No plans scheduled this {viewMode}</p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters ? 'Try widening your filters.' : 'Create a plan to start filling the schedule.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                      ) : (
                        <Button size="sm" onClick={() => navigate('/shop/create-plan')}>
                          <Plus /> Create plan
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-auto" style={{ maxHeight: 'max(440px, calc(100vh - 330px))' }}>
                  {/* ─── Month view ─── */}
                  {viewMode === 'month' && (
                    <div className="min-w-[760px]">
                      <div className="sticky top-0 z-20 grid border-b border-border/80 bg-background" style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}>
                        <div />
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                          <div key={d} className="border-s border-border/70 px-2 py-2.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                            {d}
                          </div>
                        ))}
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))' }}>
                        {monthWeeks.map((week, wi) => (
                          <React.Fragment key={wi}>
                            <div className="border-b border-border/70 px-2 py-2 text-end text-[13px] font-medium text-muted-foreground tabular-nums">
                              W{format(week[0], 'w')}
                            </div>
                            {week.map((day) => {
                              const dk = format(day, 'yyyy-MM-dd');
                              const seen = new Set<number | string>();
                              const evs = (eventsByDay[dk] || [])
                                .filter((ev) => {
                                  const id = ev._planId ?? ev.id;
                                  if (seen.has(id)) return false;
                                  seen.add(id);
                                  return true;
                                })
                                .sort((a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime());
                              const inMonth = getMonth(day) === getMonth(currentDate);
                              const today = isSameDay(day, new Date());
                              return (
                                <div
                                  key={dk}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openDay(day)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') openDay(day); }}
                                  className={cn(
                                    'group/cell flex min-h-[112px] cursor-pointer flex-col gap-1 border-b border-s border-border/70 p-1.5 text-start transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                                    !inMonth && 'bg-muted/60',
                                    inMonth && isWeekend(day) && 'bg-muted/30',
                                  )}
                                >
                                  <div className="flex items-center justify-between px-0.5">
                                    <span
                                      className={cn(
                                        'flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                                        today ? 'bg-primary text-white' : inMonth ? 'text-text' : 'text-muted-foreground/60',
                                      )}
                                    >
                                      {format(day, 'd')}
                                    </span>
                                  </div>
                                  {evs.slice(0, 3).map((ev) => {
                                    const c = getColorForFab(ev.fab_id, ev.fab_type);
                                    return (
                                      <button
                                        key={eventKey(ev)}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(ev); }}
                                        className={cn(
                                          'flex h-5 w-full items-center gap-1 truncate rounded-[5px] px-1.5 text-start text-[13px] font-medium transition-[filter] hover:brightness-95',
                                          ev.has_pending_shop_revision && 'ring-1 ring-destructive',
                                        )}
                                        style={{ backgroundColor: c.bg, color: c.text }}
                                        title={`FAB #${ev.fab_id} · ${ev.plan_name ?? ''} · ${timeRange(ev)}`}
                                      >
                                        <span className="tabular-nums opacity-70">{format(new Date(ev.scheduled_start_date), 'h:mm')}</span>
                                        <span className="truncate">#{ev.fab_id}{ev.plan_name ? ` · ${ev.plan_name}` : ''}</span>
                                      </button>
                                    );
                                  })}
                                  {evs.length > 3 && (
                                    <span className="px-1.5 text-[13px] font-medium text-muted-foreground group-hover/cell:text-foreground">
                                      +{evs.length - 3} more
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ─── Day / Week: days as columns, time down ─── */}
                  {viewMode !== 'month' && !isAxisSwapped && (
                    <div className="min-w-max">
                      <div className="sticky top-0 z-30 flex border-b border-border/80 bg-background">
                        <div className="sticky left-0 z-30 w-[72px] flex-shrink-0 border-e border-border/70 bg-background" />
                        {dayLayouts.map(({ day, key, minWidth }) => {
                          const today = isSameDay(day, new Date());
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => viewMode === 'week' && openDay(day)}
                              className={cn(
                                'flex flex-1 flex-col items-center gap-0.5 border-e border-border/70 py-2.5 transition-colors',
                                viewMode === 'week' ? 'cursor-pointer hover:bg-accent/60' : 'cursor-default',
                                isWeekend(day) && 'bg-muted/40',
                              )}
                              style={{ minWidth }}
                              title={viewMode === 'week' ? `Open ${format(day, 'EEEE, MMM d')}` : undefined}
                            >
                              <span className={cn('text-[13px] font-semibold uppercase tracking-[0.06em]', today ? 'text-primary' : 'text-muted-foreground')}>
                                {format(day, 'EEE')}
                              </span>
                              <span
                                className={cn(
                                  'flex size-8 items-center justify-center rounded-full text-lg font-semibold tabular-nums',
                                  today ? 'bg-primary text-white shadow-primary' : 'text-text',
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative flex" style={{ height: DISPLAY_HOURS * HOUR_HEIGHT + 8 + END_GUTTER_Y }}>
                        <div className="sticky left-0 z-20 w-[72px] flex-shrink-0 border-e border-border/70 bg-background">
                          {hourMarks.map((hour) => (
                            <div
                              key={hour}
                              className="absolute w-full pe-2.5 text-end"
                              style={{ top: getTimePosition(hour) + 8 - 7 }}
                            >
                              {hour === DAY_END_HOUR ? (
                                <span className="flex flex-col items-end leading-tight">
                                  <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
                                    {formatHour(hour, is12HourFormat)}
                                  </span>
                                  <span className="text-[12px] font-medium text-muted-foreground whitespace-nowrap">End of day</span>
                                </span>
                              ) : (
                                <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">
                                  {formatHour(hour, is12HourFormat)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {dayLayouts.map(({ day, key, positioned, minWidth }) => {
                          const today = isSameDay(day, new Date());
                          return (
                            <div
                              key={key}
                              className={cn('relative flex-1 border-e border-border/70', isWeekend(day) && 'bg-muted/30', today && 'bg-primary-soft/25')}
                              style={{ minWidth }}
                              onClick={isSearchLocked ? () => { setSelectedDate(day); setFabPickerInput(''); setFabPickerOpen(true); } : undefined}
                            >
                              <div
                                className={cn('pointer-events-none absolute inset-x-0 bottom-0 bg-muted/70', BREAK_PATTERN)}
                                style={{ top: 8 + getTimePosition(DAY_END_HOUR) }}
                                aria-hidden
                              />
                              <div className="absolute inset-x-0" style={{ top: 8, height: DISPLAY_HOURS * HOUR_HEIGHT }}>
                                {hourMarks.map((hour) => (
                                  <div
                                    key={hour}
                                    className={cn(
                                      'absolute w-full border-t',
                                      hour === DAY_END_HOUR ? 'border-t-2 border-foreground/25' : 'border-border/60',
                                    )}
                                    style={{ top: getTimePosition(hour) }}
                                  />
                                ))}
                                {hourMarks.slice(0, -1).map((hour) => (
                                  <div key={`h${hour}`} className="absolute w-full border-t border-dashed border-border/35" style={{ top: getTimePosition(hour + 0.5) }} />
                                ))}

                                <div
                                  className={cn('pointer-events-none absolute inset-x-0 z-[1] flex items-center justify-center', BREAK_PATTERN)}
                                  style={{ top: getTimePosition(BREAK_START_HOUR), height: BREAK_DURATION * HOUR_HEIGHT }}
                                >
                                  <span className="rounded-full bg-background/80 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                    Lunch
                                  </span>
                                </div>

                                {positioned.map((ev) => renderEventCard(ev))}

                                {today && showTimeIndicator && (
                                  <div className="pointer-events-none absolute inset-x-0 z-[4]" style={{ top: getTimePosition(nowHour) }}>
                                    <div className="relative h-0.5 bg-destructive">
                                      <span className="absolute -start-1 -top-[3px] size-2 rounded-full bg-destructive" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─── Day / Week: timeline (days as rows, time across) ─── */}
                  {viewMode !== 'month' && isAxisSwapped && (
                    <div className="min-w-max">
                      <div className="sticky top-0 z-30 flex border-b border-border/80 bg-background">
                        <div className="sticky left-0 z-30 w-[88px] flex-shrink-0 border-e border-border/70 bg-background" />
                        <div className="relative" style={{ minWidth: DISPLAY_HOURS * HOUR_WIDTH + END_GUTTER_X, height: 40 }}>
                          <div
                            className="absolute inset-y-0 flex flex-col justify-center border-s-2 border-foreground/25 ps-2 leading-tight"
                            style={{ left: getHorizontalPosition(DAY_END_HOUR), width: END_GUTTER_X }}
                          >
                            <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
                              {formatHour(DAY_END_HOUR, is12HourFormat)}
                            </span>
                            <span className="text-[12px] font-medium text-muted-foreground whitespace-nowrap">End of day</span>
                          </div>
                          {hourMarks.slice(0, -1).map((hour) => (
                            <div
                              key={hour}
                              className="absolute inset-y-0 flex items-center border-s border-border/70 ps-2"
                              style={{ left: getHorizontalPosition(hour), width: HOUR_WIDTH }}
                            >
                              {hour === DAY_END_HOUR ? (
                                <span className="flex flex-col items-end leading-tight">
                                  <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
                                    {formatHour(hour, is12HourFormat)}
                                  </span>
                                  <span className="text-[12px] font-medium text-muted-foreground whitespace-nowrap">End of day</span>
                                </span>
                              ) : (
                                <span className="text-[13px] font-medium text-muted-foreground whitespace-nowrap">
                                  {formatHour(hour, is12HourFormat)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {displayDays.map((day) => {
                        const dk = format(day, 'yyyy-MM-dd');
                        const dayEvents = eventsByDay[dk] || [];
                        const today = isSameDay(day, new Date());

                        const sorted = [...dayEvents].sort(
                          (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime(),
                        );
                        const lanes: any[][] = [];
                        sorted.forEach((ev) => {
                          const s = new Date(ev.scheduled_start_date).getTime();
                          let placed = false;
                          for (const lane of lanes) {
                            const last = lane[lane.length - 1];
                            const lastEnd = new Date(last.scheduled_start_date).getTime() + last.estimated_hours * 3_600_000;
                            if (lastEnd <= s) { lane.push(ev); placed = true; break; }
                          }
                          if (!placed) lanes.push([ev]);
                        });
                        const rowHeight = Math.max(lanes.length, 1) * (ROW_LANE_H + LANE_GAP) + LANE_GAP;

                        return (
                          <div
                            key={dk}
                            className={cn('flex border-b border-border/70', isWeekend(day) && 'bg-muted/30', today && 'bg-primary-soft/25')}
                            style={{ minHeight: rowHeight }}
                          >
                            <button
                              type="button"
                              onClick={() => viewMode === 'week' && openDay(day)}
                              className={cn(
                                'sticky left-0 z-20 flex w-[88px] flex-shrink-0 flex-col items-center justify-center gap-0.5 border-e border-border/70 bg-background py-2',
                                viewMode === 'week' ? 'cursor-pointer hover:bg-accent' : 'cursor-default',
                              )}
                              title={viewMode === 'week' ? `Open ${format(day, 'EEEE, MMM d')}` : undefined}
                            >
                              <span className={cn('text-[13px] font-semibold uppercase tracking-[0.06em]', today ? 'text-primary' : 'text-muted-foreground')}>
                                {format(day, 'EEE')}
                              </span>
                              <span
                                className={cn(
                                  'flex size-8 items-center justify-center rounded-full text-base font-semibold tabular-nums',
                                  today ? 'bg-primary text-white shadow-primary' : 'text-text',
                                )}
                              >
                                {format(day, 'd')}
                              </span>
                              {dayEvents.length > 0 && (
                                <span className="text-[12px] text-muted-foreground tabular-nums">
                                  {new Set(dayEvents.map((e) => e._planId ?? e.id)).size} plans
                                </span>
                              )}
                            </button>

                            <div
                              className="relative"
                              style={{ height: rowHeight, minWidth: DISPLAY_HOURS * HOUR_WIDTH + END_GUTTER_X }}
                              onClick={isSearchLocked ? () => { setSelectedDate(day); setFabPickerInput(''); setFabPickerOpen(false); } : undefined}
                            >
                              {hourMarks.map((hour) => (
                                <div
                                  key={hour}
                                  className={cn(
                                    'absolute inset-y-0 border-s',
                                    hour === DAY_END_HOUR ? 'border-s-2 border-foreground/25' : 'border-border/60',
                                  )}
                                  style={{ left: getHorizontalPosition(hour) }}
                                />
                              ))}
                              <div
                                className={cn('pointer-events-none absolute inset-y-0 bg-muted/70', BREAK_PATTERN)}
                                style={{ left: getHorizontalPosition(DAY_END_HOUR) + 2, width: END_GUTTER_X - 2 }}
                                aria-hidden
                              />

                              <div
                                className={cn('pointer-events-none absolute inset-y-0 z-[1] flex items-center justify-center', BREAK_PATTERN)}
                                style={{ left: getHorizontalPosition(BREAK_START_HOUR), width: BREAK_DURATION * HOUR_WIDTH }}
                              >
                                <span className="rounded-full bg-background/80 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                  Lunch
                                </span>
                              </div>

                              {lanes.map((lane, laneIdx) =>
                                lane.map((ev) => {
                                  const startDt = new Date(ev.scheduled_start_date);
                                  const startH = startDt.getHours() + startDt.getMinutes() / 60;
                                  const left = getHorizontalPosition(startH);
                                  const right = getVisualEndPosition(startH, ev.estimated_hours, HOUR_WIDTH);
                                  const width = Math.max(HOUR_WIDTH * 0.5, right - left) - LANE_GAP;
                                  const { bg, border, text } = getColorForFab(ev.fab_id, ev.fab_type);
                                  const pendingRevision = !!ev?.has_pending_shop_revision;

                                  return (
                                    <Tooltip key={eventKey(ev)} delayDuration={250}>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            'absolute z-[2] cursor-pointer overflow-hidden rounded-lg border text-start shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[box-shadow,transform] hover:z-[3] hover:-translate-y-px hover:shadow-card-hover focus-visible:z-[3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            pendingRevision && 'ring-2 ring-destructive ring-offset-1',
                                          )}
                                          style={{
                                            left: Math.max(0, left) + LANE_GAP / 2,
                                            width,
                                            top: laneIdx * (ROW_LANE_H + LANE_GAP) + LANE_GAP,
                                            height: ROW_LANE_H,
                                            backgroundColor: bg,
                                            borderColor: border,
                                          }}
                                          onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(ev); }}
                                          aria-label={`FAB ${ev.fab_id}, ${ev.plan_name ?? ''}, ${timeRange(ev)}`}
                                        >
                                          <div className="flex h-full flex-col justify-center gap-0.5 px-2.5 py-1.5" style={{ color: text }}>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              {pendingRevision && <AlertTriangle className="size-3 shrink-0 text-destructive" />}
                                              <span className="truncate text-[14px] font-semibold">
                                                <span className="tabular-nums">#{ev.fab_id}</span>
                                                {ev.plan_name ? ` · ${ev.plan_name}` : ''}
                                              </span>
                                              <span className="ms-auto shrink-0 text-[12px] font-semibold tabular-nums opacity-70">
                                                {ev.work_percentage ?? 0}%
                                              </span>
                                            </div>
                                            <p className="truncate text-[13px] opacity-75">
                                              {[ev.operator_name, timeRange(ev)].filter(Boolean).join(' · ')}
                                            </p>
                                            <div className="mt-0.5">
                                              <ProgressBar value={ev.work_percentage} color={border} />
                                            </div>
                                          </div>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" variant="light" className="p-3">
                                        <EventDetails ev={ev} />
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })
                              )}

                              {today && showTimeIndicator && (
                                <div className="pointer-events-none absolute inset-y-0 z-[4]" style={{ left: getHorizontalPosition(nowHour) }}>
                                  <div className="relative h-full w-0.5 bg-destructive">
                                    <span className="absolute -start-[3px] -top-1 size-2 rounded-full bg-destructive" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TooltipProvider>
          )}
        </Card>

        <p className="mt-3 hidden text-xs text-muted-foreground lg:block">
          Tip: <Kbd size="xs" className="bg-background font-sans">←</Kbd> <Kbd size="xs" className="bg-background font-sans">→</Kbd> move between periods,{' '}
          <Kbd size="xs" className="bg-background font-sans">T</Kbd> jumps to today,{' '}
          <Kbd size="xs" className="bg-background font-sans">D</Kbd> <Kbd size="xs" className="bg-background font-sans">W</Kbd> <Kbd size="xs" className="bg-background font-sans">M</Kbd> switch views. Click a day heading to open it.
        </p>
      </Container>
    </>
  );
};

export default ShopCalendarPage;
