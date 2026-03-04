import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X, Search, Rows3, Columns3, Lock } from 'lucide-react';
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  isSameDay,
  getMonth,
  getYear,
  addMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetAllShopPlansQuery, useGetFabTypesQuery, useGetWorkstationsQuery, useGetEmployeesQuery } from '@/store/api';
import { formatTime } from '@/utils/date-utils';
import CreatePlanPage from './createPlanePage';


const DAY_START_HOUR = 7;
const DAY_END_HOUR = 19;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 80;   // px per hour — matches Figma spacing
const HOUR_WIDTH = 120;   // px per hour for time-row view

// Figma pastel palette (matches CutPlanning.tsx design)
const FAB_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  standard: { bg: '#d5e7ff', border: '#70a5f8', text: '#2563eb' },
  'fab only': { bg: '#caf2d7', border: '#5fd28c', text: '#16a34a' },
  'cust redo': { bg: '#ffebcf', border: '#ffb84d', text: '#b45309' },
  resurface: { bg: '#ffe0e3', border: '#ed7172', text: '#dc2626' },
  'fast track': { bg: '#c4edea', border: '#4db6ac', text: '#0f766e' },
  'ag redo': { bg: '#f1f2f4', border: '#8f929c', text: '#4b5563' },
};

const DEFAULT_COLOR = { bg: '#e8f5e9', border: '#81c784', text: '#2e7d32' };

function getFabTypeColor(fabType: string) {
  return FAB_TYPE_COLORS[fabType?.toLowerCase()] ?? DEFAULT_COLOR;
}

// Colour index fallback for unknown types
const COLOR_CYCLE = [
  { bg: '#d5e7ff', border: '#70a5f8', text: '#2563eb' },
  { bg: '#caf2d7', border: '#5fd28c', text: '#16a34a' },
  { bg: '#ffebcf', border: '#ffb84d', text: '#b45309' },
  { bg: '#ffe0e3', border: '#ed7172', text: '#dc2626' },
  { bg: '#c4edea', border: '#4db6ac', text: '#0f766e' },
  { bg: '#f3e8ff', border: '#c084fc', text: '#7c3aed' },
  { bg: '#fef9c3', border: '#fde047', text: '#854d0e' },
  { bg: '#f1f2f4', border: '#8f929c', text: '#4b5563' },
];

function getColorForFab(fabId: string | number, fabType: string) {
  const base = getFabTypeColor(fabType);
  if (base !== DEFAULT_COLOR) return base;
  const idx = Number(fabId) % COLOR_CYCLE.length;
  return COLOR_CYCLE[idx];
}

interface ShopCalendarPageProps {
  /** When provided (e.g. from the table "View" action), the calendar is locked to this FAB ID.
   *  The user cannot change the search while locked. */

  onNavigateToCreatePlan?: (fabId: string, date: Date) => void;
}

const ShopCalendarPage: React.FC<ShopCalendarPageProps> = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const params = new URLSearchParams(location.search);
  const lockedFabId = params.get('fabId');

  const [is12HourFormat] = useState(true);
  const [isAxisSwapped, setIsAxisSwapped] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Page nav
  const [activePage, setActivePage] = useState<'calendar' | 'create-plan'>('calendar');
  const [fabPickerOpen, setFabPickerOpen] = useState(false);
  const [fabPickerInput, setFabPickerInput] = useState('');
  const [createPlanFabId, setCreatePlanFabId] = useState<string>('');

  // ── Filters (all sent to server) ──
  const [searchFabId, setSearchFabId] = useState('');       // typed by user
  const [filterFabType, setFilterFabType] = useState('');
  const [filterWorkstation, setFilterWorkstation] = useState('');
  const [filterOperator, setFilterOperator] = useState('');

  // If lockedFabId is provided, we use it as the fab_id filter and disable search
  const effectiveFabId = lockedFabId || searchFabId;
  const isSearchLocked = !!lockedFabId;   // lock ONLY from prop, not from manual search

  // ── Server query (all filters passed as params) ──
  const queryParams = useMemo(() => ({
    month: getMonth(currentDate) + 1,
    year: getYear(currentDate),
    limit: 1000,
    ...(effectiveFabId && { fab_id: Number(effectiveFabId) }),
    ...(filterFabType && { fab_type: filterFabType }),
    ...(filterWorkstation && { workstation_id: Number(filterWorkstation) }),
    ...(filterOperator && { operator_id: Number(filterOperator) }),
  }), [currentDate, effectiveFabId, filterFabType, filterWorkstation, filterOperator]);

  const { data: plansResponse, isLoading } = useGetAllShopPlansQuery(queryParams);

  // ── Dropdown data ──
  const { data: fabTypesData } = useGetFabTypesQuery();
  const { data: workstationsData } = useGetWorkstationsQuery();
  const { data: employeesData } = useGetEmployeesQuery();

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
    const arr = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);
    return arr
      .map((e: any) => ({ id: String(e.id), name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [employeesData]);

  // ── Day ranges ──
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

  // ── Group plans by day (no client-side filtering — server did it) ──
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const allDays = viewMode === 'month' ? monthWeeks.flat() : displayDays;
    allDays.forEach((d) => { grouped[format(d, 'yyyy-MM-dd')] = []; });

    const plans = plansResponse?.data?.grouped_plans ?? plansResponse?.grouped_plans ?? [];
    plans.forEach((gp: any) => {
      const dateKey = format(new Date(gp.date), 'yyyy-MM-dd');
      if (dateKey in grouped) grouped[dateKey] = gp.plans ?? [];
    });
    return grouped;
  }, [plansResponse, displayDays, monthWeeks, viewMode]);

  const totalPlans = useMemo(
    () => Object.values(eventsByDay).reduce((acc, evs) => acc + evs.length, 0),
    [eventsByDay],
  );

  // ── Navigation ──
  const handlePrevious = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addMonths(currentDate, -1));
  };
  const handleNext = () => {
    if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  // ── Create / Edit ──
  const openFabPicker = (date: Date) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setFabPickerInput('');
    setFabPickerOpen(true);
  };

  const handleOpenCreatePlanWithFab = (fabId: string) => {
    setCreatePlanFabId(fabId);
    setFabPickerOpen(false);
    setActivePage('create-plan');
  };

  const handleOpenEditPlan = (event: any) => {
    setSelectedEvent(event);
    setSelectedDate(new Date(event.scheduled_start_date));
    setSelectedTimeSlot(format(new Date(event.scheduled_start_date), 'HH:mm'));
    setCreatePlanFabId(String(event.fab_id));
    setActivePage('create-plan');
  };

  const handleBackToCalendar = () => {
    setActivePage('calendar');
    setSelectedEvent(null);
    setCreatePlanFabId('');
  };

  // ── Current time indicator ──
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const currentTimeTop = useMemo(() => {
    const h = currentTime.getHours() + currentTime.getMinutes() / 60;
    return (h - DAY_START_HOUR) * HOUR_HEIGHT;
  }, [currentTime]);

  const showTimeIndicator = currentTime.getHours() >= DAY_START_HOUR && currentTime.getHours() < DAY_END_HOUR;

  // ── Layout helpers ──
  function getEventsWithPositions(events: any[]) {
    if (!events.length) return [];
    const sorted = [...events].sort(
      (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime(),
    );
    const ranges = sorted.map((ev) => {
      const s = new Date(ev.scheduled_start_date).getTime();
      const e = s + ev.estimated_hours * 3_600_000;
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
      const top = Math.max(0, (startH - DAY_START_HOUR) * HOUR_HEIGHT);
      const height = Math.max(HOUR_HEIGHT * 0.5, ev.estimated_hours * HOUR_HEIGHT);
      return { ...ev, _top: top, _height: height, _col: cols[i], _maxCol: maxCol };
    });
  }

  // ── Event card (Figma style) ──
  function renderEventCard(event: any) {
    const col = event._maxCol ?? 1;
    const { bg, border, text } = getColorForFab(event.fab_id, event.fab_type);
    const PAD = 4; // gap between cards
    const colW = `calc(${100 / col}% - ${PAD}px)`;
    const colLeft = `calc(${(event._col / col) * 100}% + ${PAD / 2}px)`;

    return (
      <div
        key={event.id}
        className="absolute cursor-pointer rounded-[12px] border overflow-hidden transition-opacity hover:opacity-90"
        style={{
          top: event._top + PAD,
          height: event._height - PAD,
          left: colLeft,
          width: colW,
          backgroundColor: bg,
          borderColor: border,
        }}
        onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(event); }}
      >
        <div className="px-3 py-2 h-full flex flex-col justify-start overflow-hidden">
          <p className="text-[13px] font-semibold truncate" style={{ color: text }}>
            Fab ID {event.fab_id}
          </p>
          <p className="text-[11px] truncate mt-0.5" style={{ color: text, opacity: 0.7 }}>
            {event.fab_type || event.percent_complete != null ? `${event.percent_complete ?? 0}%` : ''}
          </p>
          {event._height > 60 && (
            <p className="text-[10px] truncate mt-1" style={{ color: text, opacity: 0.6 }}>
              {event.workstation_name || ''}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Pages ──
  if (activePage === 'create-plan') {
    return (
      <CreatePlanPage
        onBack={handleBackToCalendar}
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        selectedEvent={selectedEvent}
        prefillFabId={createPlanFabId}
        onEventCreated={handleBackToCalendar}
      />
    );
  }

  // ── Calendar label helper ──
  const calLabel =
    viewMode === 'day'
      ? format(currentDate, 'EEEE, MMMM d, yyyy')
      : viewMode === 'week'
        ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
        : format(currentDate, 'MMMM yyyy');

  return (
    <div className="bg-white min-h-screen">

      {/* ── FAB Picker Dialog ── */}
      {fabPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setFabPickerOpen(false)}
        >
          <div
            className="bg-white rounded-[16px] border border-[#ecedf0] shadow-xl w-[420px] p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[20px] text-black">Select FAB ID</p>
                <p className="text-[13px] text-[#7c8689] mt-1">Enter the FAB ID to create a plan for</p>
              </div>
              <button onClick={() => setFabPickerOpen(false)} className="h-8 w-8 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-gray-50">
                <X className="h-4 w-4 text-[#7c8689]" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[#f0f4e8] rounded-[8px] px-4 py-3">
              <CalendarIcon className="h-4 w-4 text-[#7a9705]" />
              <span className="font-semibold text-[13px] text-[#4b545d]">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : format(currentDate, 'EEEE, MMMM d, yyyy')}
              </span>
            </div>

            <div>
              <label className="font-semibold text-[13px] text-[#4b545d] block mb-2">FAB ID *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78829d]" />
                <input
                  type="number"
                  placeholder="e.g. 2390"
                  value={fabPickerInput}
                  onChange={(e) => setFabPickerInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && fabPickerInput.trim()) handleOpenCreatePlanWithFab(fabPickerInput.trim()); }}
                  autoFocus
                  className="w-full h-[44px] bg-white border border-[#e2e4ed] rounded-[8px] pl-9 pr-4 text-[14px] text-[#4b545d] placeholder:text-[#78829d] outline-none focus:border-[#9cc15e] focus:ring-1 focus:ring-[#9cc15e]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setFabPickerOpen(false)}
                className="flex-1 h-[44px] border border-[#e2e4ed] rounded-[8px] text-[14px] text-[#4b545d] hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => fabPickerInput.trim() && handleOpenCreatePlanWithFab(fabPickerInput.trim())}
                disabled={!fabPickerInput.trim()}
                className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center gap-2 text-white text-[14px] font-semibold disabled:opacity-40"
                style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="border-b border-[#dfdfdf]">
        {/* Title row */}
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-[28px] leading-[32px] text-black">Shop Plan</p>
            <p className="font-semibold text-[20px] leading-[24px] text-[#4a4d59]">{calLabel}</p>
          </div>
          <button
            onClick={() => navigate('/shop/create-plan')}
            className="h-[44px] w-[150px] rounded-[8px] flex items-center justify-center gap-2 shrink-0 text-white font-semibold text-[14px] tracking-[-0.56px]"
            style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </button>
        </div>

        {/* View mode row */}
        <div className="flex items-center px-10 h-[65px]">
          <div className="bg-[#f9f9f9] h-[45px] rounded-[6px] flex items-start pt-[4px] px-[4px] gap-2">
            {(['day', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-[15px] py-[8px] rounded-[4px] font-semibold text-[14px] leading-[21px] capitalize transition-all ${viewMode === mode
                    ? 'bg-white text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                    : 'text-[#78829d]'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between px-10 h-[65px]">
          <div className="flex items-center gap-[10px]">

            {/* FAB ID Search */}
            {isSearchLocked ? (
              /* Locked from table action — read-only badge */
              <div className="flex items-center gap-2 h-[36px] bg-[#f0f4e8] border border-[#9cc15e] rounded-[6px] px-3">
                <Lock className="size-3.5 text-[#7a9705]" />
                <span className="font-semibold text-[13px] text-[#4b545d]">FAB-{lockedFabId}</span>
              </div>
            ) : (
              /* Free search — editable, updates server query */
              <div className="relative w-[194px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78829d]" />
                <input
                  placeholder="Search FAB ID..."
                  value={searchFabId}
                  onChange={(e) => setSearchFabId(e.target.value)}
                  className="w-full h-[36px] bg-white border border-[#e2e4ed] rounded-[6px] pl-9 pr-3 text-[13px] text-[#4b545d] placeholder:text-[#78829d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)] outline-none focus:ring-1 focus:ring-[#e2e4ed]"
                />
                {searchFabId && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchFabId('')}>
                    <X className="size-3.5 text-[#78829d]" />
                  </button>
                )}
              </div>
            )}

            {/* Other filters */}
            {/* {!isSearchLocked && ( */}
              <>
                <Select value={filterFabType || 'all'} onValueChange={(v) => setFilterFabType(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[133px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                    <SelectValue placeholder="All FAB Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All FAB Types</SelectItem>
                    {fabTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filterWorkstation || 'all'} onValueChange={(v) => setFilterWorkstation(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[146px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                    <SelectValue placeholder="All Workstations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workstations</SelectItem>
                    {workstations.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filterOperator || 'all'} onValueChange={(v) => setFilterOperator(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[137px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                    <SelectValue placeholder="All Operators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Operators</SelectItem>
                    {operators.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            {/* )} */}
          </div>

          {/* Row/col toggle */}
          {viewMode !== 'month' && (
            <div className="bg-[#eaebe7] rounded-[8px] flex items-center gap-[2px] p-[2px]">
              <button
                onClick={() => setIsAxisSwapped(false)}
                className={`p-[8px] rounded-[6px] transition-all ${!isAxisSwapped ? 'bg-white shadow-sm' : ''}`}
                title="Column view"
              >
                <Columns3 className="size-6 text-black" strokeWidth={2} />
              </button>
              <button
                onClick={() => setIsAxisSwapped(true)}
                className={`p-[8px] rounded-[6px] transition-all ${isAxisSwapped ? 'bg-white shadow-sm' : ''}`}
                title="Row view"
              >
                <Rows3 className="size-6 text-[#93948e]" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar Card ── */}
      <div className="p-4 md:p-6">
        <div className="border border-[#ecedf0] rounded-[16px] px-4 py-6 flex flex-col gap-4">

          {/* Toolbar */}
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="bg-white h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronLeft className="h-5 w-5 text-[#74798b]" />
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-3">
                    <CalendarIcon className="size-6 text-[#4b545d]" strokeWidth={2} />
                    <span className="font-semibold text-[20px] leading-[24px] text-[#4a4d59] whitespace-nowrap">{calLabel}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={currentDate} onSelect={(d) => d && setCurrentDate(d)} />
                </PopoverContent>
              </Popover>

              <button
                onClick={handleNext}
                className="bg-white h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronRight className="h-5 w-5 text-[#74798b]" />
              </button>
            </div>

            <div className="flex flex-col items-end gap-1">
              <p className="font-semibold text-[16px] leading-[24px] text-[#7c8689] whitespace-nowrap">
                Total Scheduled Plans
                {isSearchLocked && <span className="ml-2 text-[#7a9705]">· FAB-{lockedFabId}</span>}
              </p>
              <p className="font-semibold text-[20px] leading-[24px] text-black">
                {isLoading ? '–' : totalPlans}
              </p>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-[#7c8689]">Loading calendar events…</p>
            </div>
          ) : (
            <div className="border border-[#ecedf0] rounded-[8px] overflow-x-auto">

              {/* ── Month view ── */}
              {viewMode === 'month' && (
                <div className="min-w-max">
                  <div className="grid" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
                    <div className="p-2 border-b border-[#e2e4ed]" />
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <div key={d} className="text-center text-[12px] font-medium text-[#4b545d] uppercase p-2 border-b border-l border-[#ecedf0]">{d}</div>
                    ))}
                    {monthWeeks.map((week, wi) => (
                      <React.Fragment key={wi}>
                        <div className="text-[12px] font-medium text-[#7c8689] p-2 text-right pr-4 border-b border-[#ecedf0]">
                          Wk {format(week[0], 'w')}
                        </div>
                        {week.map((day) => {
                          const dk = format(day, 'yyyy-MM-dd');
                          const evs = eventsByDay[dk] || [];
                          const inMonth = getMonth(day) === getMonth(currentDate);
                          return (
                            <div
                              key={dk}
                              className={`border-b border-l border-[#ecedf0] p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${!inMonth ? 'bg-gray-50' : ''}`}
                              onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                            >
                              <div className={`text-right text-[13px] font-medium ${!inMonth ? 'text-[#c0c4cc]' : 'text-[#4b545d]'}`}>{format(day, 'd')}</div>
                              {evs.length > 0 && (
                                <Badge variant="outline" className="mt-1 text-[11px]">{evs.length} plan{evs.length !== 1 ? 's' : ''}</Badge>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Day / Week column view ── */}
              {viewMode !== 'month' && !isAxisSwapped && (
                <div className="min-w-max">
                  {/* Time grid */}
                  <div className="relative flex pt-5" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                    {/* Time labels */}
                    <div className="w-[90px] flex-shrink-0 border-r border-[#ecedf0] relative">
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                        const hour = DAY_START_HOUR + i;
                        const label = is12HourFormat
                          ? `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
                          : `${String(hour).padStart(2, '0')}:00`;
                        return (
                          <div
                            key={hour}
                            className="absolute w-full pr-3 flex items-start justify-end"
                            style={{ top: i * HOUR_HEIGHT - 9, height: HOUR_HEIGHT }}
                          >
                            <span className="text-[11px] font-medium text-[#7c8689] whitespace-nowrap">{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day columns */}
                    {displayDays.map((day) => {
                      const dk = format(day, 'yyyy-MM-dd');
                      const events = eventsByDay[dk] || [];
                      const positioned = getEventsWithPositions(events);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={dk}
                          className="flex-1 min-w-[160px] border-r border-[#ecedf0] relative"
                          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                          onClick={isSearchLocked ? () => { setSelectedDate(day); setFabPickerInput(''); setFabPickerOpen(true); } : undefined}
                        >
                          {/* Hour grid lines */}
                          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                            <div
                              key={i}
                              className="absolute w-full border-t border-[#ecedf0]"
                              style={{ top: i * HOUR_HEIGHT }}
                            />
                          ))}

                          {/* Today highlight */}
                          {isToday && (
                            <div className="absolute inset-0 bg-[#7a9705]/[0.02] pointer-events-none" />
                          )}

                          {/* Events */}
                          {positioned.map((ev) => renderEventCard(ev))}

                          {/* Current time line (only on today's column) */}
                          {isToday && showTimeIndicator && (
                            <div
                              className="absolute left-0 right-0 z-10 pointer-events-none"
                              style={{ top: currentTimeTop }}
                            >
                              <div className="relative flex items-center">
                                <div
                                  className="absolute -left-[90px] flex items-center justify-center rounded-[4px] px-1.5 py-0.5"
                                  style={{ backgroundColor: '#ee1a1d' }}
                                >
                                  <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                                    {format(currentTime, 'HH:mm')}
                                  </span>
                                </div>
                                <div className="w-full h-px bg-[#ee1a1d]" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Time-row view (axis swapped) ── */}
              {viewMode !== 'month' && isAxisSwapped && (
                <div className="min-w-max">
                  {/* Hour header */}
                  <div className="flex border-b border-[#e2e4ed] bg-white sticky top-0 z-10">
                    <div className="w-[90px] flex-shrink-0 border-r border-[#ecedf0]" />
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                      const hour = DAY_START_HOUR + i;
                      const label = is12HourFormat
                        ? `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`
                        : `${String(hour).padStart(2, '0')}:00`;
                      return (
                        <div
                          key={hour}
                          className="flex-1 border-r border-[#ecedf0] flex items-center justify-center py-3"
                          style={{ minWidth: HOUR_WIDTH }}
                        >
                          <span className="text-[11px] font-medium text-[#7c8689] whitespace-nowrap">{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day rows */}
                  {displayDays.map((day) => {
                    const dk = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay[dk] || [];
                    const ROW_LANE_H = 44;
                    const GAP = 4;

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
                    const rowHeight = Math.max(lanes.length, 1) * (ROW_LANE_H + GAP) + GAP;

                    return (
                      <div
                        key={dk}
                        className="flex border-b border-[#e2e4ed]"
                        style={{ minHeight: rowHeight + 8 }}
                      >
                        {/* Day label */}
                        <div className="w-[90px] flex-shrink-0 border-r border-[#ecedf0] flex flex-col justify-center items-center py-3 gap-0.5 bg-white">
                          <span className="text-[11px] text-[#7c8689] uppercase tracking-wide">{format(day, 'EEE')}</span>
                          <span
                            className={`text-[20px] font-semibold w-8 h-8 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-[#7a9705] text-white' : 'text-[#4b545d]'
                              }`}
                          >
                            {format(day, 'd')}
                          </span>
                        </div>

                        {/* Events */}
                        <div
                          className="relative"
                          style={{ height: rowHeight, minWidth: TOTAL_HOURS * HOUR_WIDTH }}
                          onClick={isSearchLocked ? () => { setSelectedDate(day); setFabPickerInput(''); setFabPickerOpen(true); } : undefined}
                        >
                          {/* Hour grid lines */}
                          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-l border-[#ecedf0]"
                              style={{ left: i * HOUR_WIDTH }}
                            />
                          ))}

                          {lanes.map((lane, laneIdx) =>
                            lane.map((ev) => {
                              const startDt = new Date(ev.scheduled_start_date);
                              const startH = startDt.getHours() + startDt.getMinutes() / 60;
                              const left = (startH - DAY_START_HOUR) * HOUR_WIDTH;
                              const width = ev.estimated_hours * HOUR_WIDTH;
                              const { bg, border, text } = getColorForFab(ev.fab_id, ev.fab_type);
                              return (
                                <div
                                  key={ev.id}
                                  className="absolute rounded-[10px] border overflow-hidden cursor-pointer transition-opacity hover:opacity-90"
                                  style={{
                                    left: Math.max(0, left) + GAP,
                                    width: Math.max(HOUR_WIDTH * 0.5, width) - GAP * 2,
                                    top: laneIdx * (ROW_LANE_H + GAP) + GAP,
                                    height: ROW_LANE_H,
                                    backgroundColor: bg,
                                    borderColor: border,
                                  }}
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(ev); }}
                                >
                                  <div className="px-2 py-1 h-full flex flex-col justify-center overflow-hidden">
                                    <p className="text-[12px] font-semibold truncate" style={{ color: text }}>Fab ID {ev.fab_id}</p>
                                    <p className="text-[10px] truncate" style={{ color: text, opacity: 0.7 }}>{ev.percent_complete ?? 0}%</p>
                                  </div>
                                </div>
                              );
                            }),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopCalendarPage;

