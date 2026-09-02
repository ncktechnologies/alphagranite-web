'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { ChevronLeft, ChevronRight, MapPin, FileText, Rows3, Columns3, Calendar as CalendarIcon } from 'lucide-react';
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    addMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getMonth,
} from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import { WorkstationToggle } from './components/WorkstationToggle';
import { useGetCurrentOperatorTasksQuery, useGetOperatorWorkstationsQuery } from '@/store/api/operator';
import { useSelector } from 'react-redux';

// ─── Constants ──────────────────────────────────────────────────────────────
const DAY_START_HOUR = 7;          // 7 AM
const DAY_END_HOUR = 16;           // 4 PM
const BREAK_START_HOUR = 12;       // 12 PM
const BREAK_END_HOUR = 13;         // 1 PM
const BREAK_DURATION = BREAK_END_HOUR - BREAK_START_HOUR; // 1 hour
const TOTAL_WORK_HOURS = DAY_END_HOUR - DAY_START_HOUR; // 9 hours (including break slot)
const HOUR_WIDTH = 120;
const ROW_LANE_HEIGHT = 44;        // fixed lane height (like Shop Calendar)
const TIME_LABEL_HEIGHT = 40;
const DATE_LABEL_WIDTH = 80;
const GRID_WIDTH = DATE_LABEL_WIDTH + TOTAL_WORK_HOURS * HOUR_WIDTH;

// ─── Helper: calculate horizontal position (linear, no break gap) ──────────
const getTimePosition = (hour: number): number => (hour - DAY_START_HOUR) * HOUR_WIDTH;
const getHorizontalPosition = getTimePosition;

// ─── Color mapping ──────────────────────────────────────────────────────────
const FAB_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    'standard': { bg: '#9eeb47', border: '#7bc62e', text: '#2c5a0e' },
    'fab only': { bg: '#5bd1d7', border: '#2fa7ae', text: '#0a5c62' },
    'cust redo': { bg: '#f0bf4c', border: '#d99e1a', text: '#704d0a' },
    'resurface': { bg: '#d094ea', border: '#b267e0', text: '#4a1d6e' },
    'fast track': { bg: '#f59794', border: '#e05e5a', text: '#8b1a1a' },
    'ag redo': { bg: '#f5cc94', border: '#e6a832', text: '#7a4b0e' },
};

const DEFAULT_COLOR = { bg: '#ffffff', border: '#000000', text: '#1e293b' };

function getColorForFabType(fabType?: string) {
    if (!fabType) return DEFAULT_COLOR;
    const normalized = fabType.toLowerCase();
    return FAB_TYPE_COLORS[normalized] ?? DEFAULT_COLOR;
}

const isSameDay = (d1: Date, d2: Date) =>
    format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');

const setHoursLocal = (date: Date, hours: number) => {
    const d = new Date(date);
    d.setHours(hours, 0, 0, 0);
    return d;
};

export function OperatorDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUser = useSelector((s: any) => s.user.user);
    const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

    const getInitialDate = () => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const parsed = new Date(dateParam);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    };

    const getInitialViewMode = (): 'day' | 'week' | 'month' => {
        const viewParam = searchParams.get('view');
        return viewParam === 'day' || viewParam === 'week' || viewParam === 'month' ? viewParam : 'day';
    };

    const [currentDate, setCurrentDate] = useState(getInitialDate);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(getInitialViewMode);
    const [selectedWorkstation, setSelectedWorkstation] = useState<number | null>(null);
    const [isAxisSwapped, setIsAxisSwapped] = useState(false);

    useEffect(() => {
        const nextView = viewMode;
        const nextDate = format(currentDate, 'yyyy-MM-dd');
        const currentView = searchParams.get('view');
        const currentDateValue = searchParams.get('date');

        if (currentView !== nextView || currentDateValue !== nextDate) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('view', nextView);
            nextParams.set('date', nextDate);
            setSearchParams(nextParams, { replace: true });
        }
    }, [currentDate, viewMode, searchParams, setSearchParams]);

    const { data: workstationsData, isLoading: isWorkstationsLoading } =
        useGetOperatorWorkstationsQuery(
            { operator_id: currentEmployeeId },
            { skip: !currentEmployeeId }
        );

    const { data: tasksData, isLoading: isTasksLoading, isFetching: isTasksFetching } =
        useGetCurrentOperatorTasksQuery(
            { view: viewMode, reference_date: format(currentDate, 'yyyy-MM-dd') },
            { skip: !currentEmployeeId }
        );

    // ─── Display days ────────────────────────────────────────────────────────
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

    const shouldShowToday = useMemo(() => {
        if (viewMode === 'day') {
            return isSameDay(currentDate, new Date());
        }
        if (viewMode === 'week') {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            const weekEnd = addDays(weekStart, 6);
            const today = new Date();
            return today >= weekStart && today <= weekEnd;
        }
        if (viewMode === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            const today = new Date();
            return today >= monthStart && today <= monthEnd;
        }
        return false;
    }, [currentDate, viewMode]);

    // ─── Reliable event splitting (break + multi‑day) ──────────────────────
    const eventsByDay = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        const allDays = viewMode === 'month' ? monthWeeks.flat() : displayDays;
        allDays.forEach((d) => { grouped[format(d, 'yyyy-MM-dd')] = []; });

        if (!tasksData) return grouped;
        const tasksArray = Array.isArray(tasksData) ? tasksData : (tasksData as any)?.data || [];

        tasksArray
            .filter((task: any) =>
                selectedWorkstation === null || selectedWorkstation === task.workstation_id
            )
            .forEach((task: any) => {
                const startDate = new Date(task.scheduled_start_date);
                if (!startDate) return;
                let remainingHours = Number(task.estimated_hours) || 1;
                let currentDate = startDate;
                let currentHour = startDate.getHours() + startDate.getMinutes() / 60;
                const originalHours = remainingHours;

                const addPart = (day: Date, hour: number, hours: number) => {
                    const key = format(day, 'yyyy-MM-dd');
                    if (hours <= 0 || !(key in grouped)) return;
                    const partStart = new Date(day);
                    partStart.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
                    grouped[key].push({
                        ...task,
                        _isSplitPart: true,
                        _originalHours: originalHours,
                        estimated_hours: hours,
                        scheduled_start_date: partStart.toISOString(),
                        work_percentage: task.work_percentage || 0,
                        plan_name: task.planning_section_name || task.current_stage || '',
                    });
                };

                while (remainingHours > 0) {
                    if (currentHour >= BREAK_START_HOUR && currentHour < BREAK_END_HOUR) {
                        currentHour = BREAK_END_HOUR;
                    }

                    if (currentHour < BREAK_START_HOUR) {
                        const beforeBreak = Math.min(remainingHours, BREAK_START_HOUR - currentHour);
                        if (beforeBreak > 0) {
                            addPart(currentDate, currentHour, beforeBreak);
                            remainingHours -= beforeBreak;
                            currentHour += beforeBreak;
                        }
                        if (remainingHours > 0) {
                            currentHour = BREAK_END_HOUR;
                            continue;
                        }
                    } else if (currentHour >= BREAK_END_HOUR) {
                        const afterBreak = Math.min(remainingHours, DAY_END_HOUR - currentHour);
                        if (afterBreak > 0) {
                            addPart(currentDate, currentHour, afterBreak);
                            remainingHours -= afterBreak;
                            currentHour += afterBreak;
                        }
                    }

                    if (remainingHours > 0) {
                        currentDate = addDays(currentDate, 1);
                        currentHour = DAY_START_HOUR;
                    }
                }
            });

        return grouped;
    }, [tasksData, displayDays, monthWeeks, viewMode, selectedWorkstation]);

    // ─── Navigation ──────────────────────────────────────────────────────────
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

    const handleEventClick = useCallback((task: any) => {
        const params = new URLSearchParams();
        if (task.task_id) params.set('task_id', String(task.task_id));
        if (task.workstation_id) params.set('workstation_id', String(task.workstation_id));
        if (task.scheduled_start_date) params.set('scheduled_start_date', task.scheduled_start_date);
        navigate(`/operator/task/${task.job_id}?${params.toString()}`);
    }, [navigate]);

    // ─── Event positioning with dynamic row height ──────────────────────────
    const getEventsWithXPositions = useCallback((events: any[]) => {
        if (!events.length) return { events: [], rowHeight: ROW_LANE_HEIGHT };

        const sorted = [...events].sort(
            (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime()
        );

        const ranges = sorted.map((ev) => {
            const s = new Date(ev.scheduled_start_date).getTime();
            const start = new Date(ev.scheduled_start_date);
            const startHour = start.getHours() + start.getMinutes() / 60;
            const productiveHours = Number(ev.estimated_hours) || 1;
            const endHour = startHour + productiveHours;
            const e = new Date(start).setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
            return { s, e };
        });

        const lanes: number[] = new Array(sorted.length).fill(0);
        ranges.forEach((r, i) => {
            const used = new Set<number>();
            for (let j = 0; j < i; j++) if (ranges[j].e > r.s) used.add(lanes[j]);
            let c = 0;
            while (used.has(c)) c++;
            lanes[i] = c;
        });
        const maxLane = Math.max(...lanes, 0) + 1;
        const rowHeight = maxLane * ROW_LANE_HEIGHT;

        const positioned = sorted.map((ev, i) => {
            const start = new Date(ev.scheduled_start_date);
            const startH = start.getHours() + start.getMinutes() / 60;
            const left = Math.max(0, getTimePosition(startH));
            const duration = Number(ev.estimated_hours) || 1;
            const width = Math.max(HOUR_WIDTH * 0.5, duration * HOUR_WIDTH);
            const top = lanes[i] * ROW_LANE_HEIGHT;
            const height = ROW_LANE_HEIGHT - 4;

            return { ...ev, _left: left, _width: width, _top: top, _height: height, _lane: lanes[i], _maxLane: maxLane };
        });

        return { events: positioned, rowHeight };
    }, []);

    // ─── Render a single event card with pointer-events-none tooltip ──────
    const renderEventCard = useCallback((event: any) => {
        const { bg, border, text } = getColorForFabType(event.fab_type);
        const finalBorderColor = event.has_pending_shop_revision ? '#ff0000' : border;

        const startTime = event.scheduled_start_date
            ? format(new Date(event.scheduled_start_date), 'h:mma')
            : null;
        const tooltipHours = event._originalHours ?? event.estimated_hours;
        const endTime = event.scheduled_start_date && tooltipHours
            ? format(new Date(new Date(event.scheduled_start_date).getTime() + Number(tooltipHours) * 3_600_000), 'h:mma')
            : null;

        return (
            <Tooltip key={`${event.task_id || event.id}`} delayDuration={300}>
                <TooltipTrigger asChild>
                    <div
                        className="absolute cursor-pointer rounded-[8px] border overflow-hidden transition-opacity hover:opacity-90 select-none"
                        style={{
                            left: event._left + 'px',
                            width: Math.max(event._width, 20) + 'px',
                            top: event._top + 2,
                            height: event._height,
                            backgroundColor: bg,
                            borderColor: finalBorderColor,
                            borderWidth: event.has_pending_shop_revision ? 2 : 1,
                        }}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                    >
                        <div className="px-2 py-1 h-full flex flex-col justify-start overflow-hidden gap-0.5">
                            <div className="flex items-center gap-1">
                                <p className="text-[12px] font-bold truncate leading-tight shrink-0" style={{ color: text }}>
                                    {event.fab_id}
                                </p>
                                {event.job_name && (
                                    <p className="text-[11px] font-medium truncate leading-tight" style={{ color: text, opacity: 0.85 }}>
                                        · {event.job_name}
                                    </p>
                                )}
                            </div>
                            {event.account_name && (
                                <p className="text-[10px] truncate leading-tight" style={{ color: text, opacity: 0.7 }}>
                                    {event.account_name}
                                </p>
                            )}
                            {event._height > 44 && (
                                <div className="flex items-center gap-1.5">
                                    {event.workstation_name && (
                                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.5)', color: text }}>
                                            {event.workstation_name}
                                        </span>
                                    )}
                                    {event.planning_section_name && (
                                        <span className="text-[9px] truncate" style={{ color: text, opacity: 0.65 }}>
                                            {event.planning_section_name}
                                        </span>
                                    )}
                                </div>
                            )}
                            {event._height > 58 && startTime && (
                                <p className="text-[9px] leading-tight" style={{ color: text, opacity: 0.6 }}>
                                    {startTime}{endTime ? ` – ${endTime}` : ''}
                                    {tooltipHours ? ` · ${tooltipHours}h` : ''}
                                </p>
                            )}
                            {event._height > 68 && event.work_percentage > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="flex-1 bg-white/50 rounded-full h-1">
                                        <div className="h-1 rounded-full" style={{ width: `${event.work_percentage}%`, backgroundColor: text }} />
                                    </div>
                                    <span className="text-[9px] font-medium" style={{ color: text }}>{event.work_percentage}%</span>
                                </div>
                            )}
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={6} className="bg-white border border-gray-200 shadow-lg rounded-md p-2 text-xs text-gray-700 pointer-events-none">
                    <div className="space-y-1">
                        <p><span className="font-semibold">FAB ID:</span> {event.fab_id}</p>
                        <p><span className="font-semibold">Workstation:</span> {event.workstation_name || 'N/A'}</p>
                        <p><span className="font-semibold">Est. Hours:</span> {event._originalHours ?? event.estimated_hours ?? 'N/A'}</p>
                        <p><span className="font-semibold">% Complete:</span> {event.work_percentage ?? 0}%</p>
                        <p><span className="font-semibold">Job:</span> {`${event.job_name}-${event.job_number}` || 'N/A'}</p>
                        <p><span className="font-semibold">Job No:</span> {event.job_number || 'N/A'}</p>
                        <p><span className="font-semibold">Account Name:</span> {event.account_name || 'N/A'}</p>
                        <p><span className="font-semibold">Plan:</span> {event.planning_section_name}</p>
                        {event.notes && <p><span className="font-semibold">Notes:</span> {event.notes}</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    }, [handleEventClick]);

    // ─── Calendar label ──────────────────────────────────────────────────────
    const calLabel =
        viewMode === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : viewMode === 'week'
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy');

    // ─── Stats ──────────────────────────────────────────────────────────────
    const totalTasksCount = Object.values(eventsByDay).reduce((acc, evs) => acc + evs.length, 0);
    const workstationCount = selectedWorkstation ? 1 : (workstationsData as any)?.data?.length || 0;
    const activeTimerFabs = useMemo(() => {
        const raw = (tasksData as any)?.running_timer_fab_ids;
        if (Array.isArray(raw)) return raw;
        const nested = (tasksData as any)?.data?.running_timer_fab_ids;
        if (Array.isArray(nested)) return nested;
        return [];
    }, [tasksData]);
    // Hours to render (7 to 16)
    const hoursToRender: number[] = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) hoursToRender.push(h);

    // ─── Show loading skeleton only on first load ───────────────────────────
    if (isTasksLoading && !tasksData) {
        return (
            <div className="bg-white min-h-screen">
                <div className="border-b border-[#dfdfdf]">
                    <div className="px-10 pt-5 pb-5">
                        <Skeleton className="h-[32px] w-[300px] mb-2" />
                        <Skeleton className="h-[24px] w-[400px]" />
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-center py-12">
                        <p className="text-[#7c8689]">Loading calendar events...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="bg-white min-h-screen">
                {/* Header */}
                <div className="border-b border-[#dfdfdf]">
                    <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
                        <div className="flex flex-col gap-2">
                            <p className="text-[28px] leading-[32px] text-black font-semibold">
                                {t('OPERATOR.MY_SCHEDULE')}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            {!isWorkstationsLoading && workstationsData && (
                                <WorkstationToggle
                                    workstations={Array.isArray(workstationsData) ? workstationsData : (workstationsData as any)?.data || []}
                                    selectedWorkstation={selectedWorkstation}
                                    onSelect={setSelectedWorkstation}
                                />
                            )}
                            {activeTimerFabs.length > 0 && (
                                <div className="flex max-w-[760px] flex-wrap justify-end gap-2" aria-label={t('OPERATOR.ACTIVE_TIMERS')}>
                                    {activeTimerFabs.slice(0, 5).map((fabId: number) => (
                                        <div key={fabId} className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                                            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                                            <span className="font-semibold text-foreground">FAB-{fabId}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-10 h-[65px]">
                        <div className="bg-[#f9f9f9] h-[45px] rounded-[6px] flex items-start pt-[4px] px-[4px] gap-2">
                            {(['day', 'week', 'month'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-[15px] py-[8px] rounded-[4px] font-['Proxima_Nova:Semibold',sans-serif] text-[14px] leading-[21px] font-semibold capitalize transition-all ${viewMode === mode
                                        ? 'bg-white text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                                        : 'text-[#78829d]'
                                        }`}
                                >
                                    {t(`CALENDAR.${mode.toUpperCase()}`)}
                                </button>
                            ))}
                        </div>

                        {/* Axis swap buttons removed for clarity; can add back if needed */}
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrevious}
                            className="h-8 w-8 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-3 rounded-[6px] border border-[#e2e4ed] bg-white px-3 py-2 hover:bg-gray-50">
                                    <CalendarIcon className="size-5 text-[#4b545d]" strokeWidth={2} />
                                    <span className="text-[20px] leading-[24px] text-[#4a4d59] font-semibold whitespace-nowrap">
                                        {calLabel}
                                    </span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(date) => date && setCurrentDate(date)}
                                />
                            </PopoverContent>
                        </Popover>

                        <button
                            onClick={handleNext}
                            className="h-8 w-8 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>

                        {shouldShowToday && (
                            <button
                                onClick={() => setCurrentDate(new Date())}
                                className="h-[44px] px-6 rounded-[8px] text-[14px] font-semibold text-white"
                                style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
                            >
                                {t('COMMON.TODAY')}
                            </button>
                        )}
                    </div>

                    {/* ─── Calendar Grid ───────────────────────────────────── */}
                    <div className="relative bg-white border border-[#e2e4ed] rounded-[8px] max-h-[70vh] overflow-auto">
                        {/* ── Loading overlay (when fetching) ── */}
                        {isTasksFetching && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none rounded-[8px]">
                                <div className="bg-white border border-[#e2e4ed] rounded-[8px] px-4 py-2 shadow-sm flex items-center gap-2">
                                    <div className="animate-spin border-2 border-[#7a9705] border-t-transparent rounded-full h-4 w-4" />
                                    <span className="text-[13px] font-medium text-[#4b545d]">Updating calendar...</span>
                                </div>
                            </div>
                        )}

                        {(viewMode === 'day' || viewMode === 'week') && (
                            <div style={{ minWidth: GRID_WIDTH }}>
                                {/* Time header row */}
                                <div className="flex sticky top-0 z-10 bg-[#f9fafb] border-b border-[#e2e4ed]" style={{ minWidth: GRID_WIDTH }}>
                                    <div className="flex-shrink-0 border-r border-[#e2e4ed]" style={{ width: DATE_LABEL_WIDTH, height: TIME_LABEL_HEIGHT }} />
                                    <div className="relative" style={{ height: TIME_LABEL_HEIGHT, flex: 1 }}>
                                        {hoursToRender.map((hour) => (
                                            <div
                                                key={hour}
                                                className="absolute text-[11px] text-[#7c8689] flex items-center justify-center font-medium"
                                                style={{ left: getTimePosition(hour), width: HOUR_WIDTH, height: TIME_LABEL_HEIGHT }}
                                            >
                                                {format(setHoursLocal(new Date(), hour), 'h a')}
                                            </div>
                                        ))}
                                        <div
                                            className="absolute text-[11px] text-[#7c8689] flex items-center justify-center font-medium"
                                            style={{ left: getTimePosition(DAY_END_HOUR), width: HOUR_WIDTH, height: TIME_LABEL_HEIGHT }}
                                        >
                                            {format(setHoursLocal(new Date(), DAY_END_HOUR), 'h a')}
                                        </div>
                                    </div>
                                </div>

                                {displayDays.map((day, dayIdx) => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const events = eventsByDay[dateKey] || [];
                                    const { events: positioned, rowHeight } = getEventsWithXPositions(events);
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={dayIdx}
                                            className="flex border-b border-[#e2e4ed] last:border-b-0"
                                            style={{ height: Math.max(ROW_LANE_HEIGHT, rowHeight) }}
                                        >
                                            <div
                                                className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-[#e2e4ed] px-2 ${isToday ? 'bg-[#f0f4e8]' : 'bg-[#f9fafb]'}`}
                                                style={{ width: DATE_LABEL_WIDTH }}
                                            >
                                                <span className={`text-[11px] font-semibold ${isToday ? 'text-[#7a9705]' : 'text-[#4b545d]'}`}>
                                                    {format(day, 'EEE')}
                                                </span>
                                                <span className={`text-[18px] font-bold leading-tight ${isToday ? 'text-[#7a9705]' : 'text-[#111827]'}`}>
                                                    {format(day, 'd')}
                                                </span>
                                            </div>

                                            <div
                                                className="relative flex-1"
                                                style={{ height: Math.max(ROW_LANE_HEIGHT, rowHeight) }}
                                            >
                                                <div className="absolute inset-y-0  flex items-center justify-center bg-orange-100/95 border-x border-orange-300 pointer-events-none" style={{ left: getTimePosition(BREAK_START_HOUR), width: HOUR_WIDTH }}>
                                                    <span className="text-[10px] font-semibold uppercase text-orange-600 [writing-mode:vertical-rl]">Break</span>
                                                </div>
                                                {hoursToRender.map((hour, idx) => {
                                                    const left = getTimePosition(hour);
                                                    return (
                                                        <div key={idx} className="absolute top-0 bottom-0 border-r border-[#e2e4ed]" style={{ left }} />
                                                    );
                                                })}
                                                <div className="absolute top-0 bottom-0 border-r border-[#e2e4ed]" style={{ left: getTimePosition(DAY_END_HOUR) }} />
                                                {positioned.map((event: any) => renderEventCard(event))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viewMode === 'month' && (
                            <div className="grid grid-cols-7 gap-px bg-[#e2e4ed]">
                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                                    <div key={day} className="bg-[#f9fafb] py-2 text-center text-[13px] font-semibold text-[#4b545d]">
                                        {t(`CALENDAR.DAYS.${day}`)}
                                    </div>
                                ))}
                                {monthWeeks.map((week, weekIdx) => (
                                    <React.Fragment key={weekIdx}>
                                        {week.map((day, dayIdx) => {
                                            const dateKey = format(day, 'yyyy-MM-dd');
                                            const events = eventsByDay[dateKey] || [];
                                            const isCurrentMonth = day.getMonth() === getMonth(currentDate);
                                            const isToday = isSameDay(day, new Date());

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className={`min-h-[120px] bg-white p-2 ${!isCurrentMonth ? 'bg-[#f9fafb]' : ''}`}
                                                >
                                                    <div className={`text-[13px] mb-2 ${isToday ? 'text-[#7a9705] font-bold' : isCurrentMonth ? 'text-[#4b545d]' : 'text-[#9ca3af]'}`}>
                                                        {format(day, 'd')}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {events.slice(0, 3).map((event: any) => {
                                                            const { bg, border, text } = getColorForFabType(event.fab_type);
                                                            const cardBorderColor = event.has_pending_shop_revision ? '#ff0000' : border;
                                                            return (
                                                                <div
                                                                    key={event.task_id || event.id}
                                                                    className="text-[11px] px-2 py-1 rounded cursor-pointer truncate"
                                                                    style={{ backgroundColor: bg, borderColor: cardBorderColor, color: text, borderWidth: event.has_pending_shop_revision ? 2 : 1 }}
                                                                    onClick={() => handleEventClick(event)}
                                                                    title={`${event.fab_number || event.fab_id || 'FAB'} . ${event.planning_section_name || event.plan_name || 'Plan'} · ${event.estimated_hours ?? 'N/A'}h · ${event.work_percentage ?? 0}% complete`}
                                                                >
                                                                    <div className="font-medium truncate">{event.fab_number || event.fab_id}</div>
                                                                    {event.plan_name && <div className="text-[9px] opacity-70 truncate">{event.plan_name}</div>}
                                                                    {event.work_percentage > 0 && (
                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                            <div className="flex-1 bg-white/50 rounded-full h-1">
                                                                                <div className="h-1 rounded-full" style={{ width: `${event.work_percentage}%`, backgroundColor: text }} />
                                                                            </div>
                                                                            <span className="text-[8px] font-medium">{event.work_percentage}%</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {events.length > 3 && (
                                                            <div className="text-[10px] text-[#7c8689] pl-2">
                                                                +{events.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                        <div className="flex items-center gap-3 p-4 rounded-[8px] border border-[#e2e4ed] bg-white">
                            <div className="h-10 w-10 rounded-[6px] bg-[#d5e7ff] flex items-center justify-center">
                                <FileText className="w-5 h-5 text-[#2563eb]" />
                            </div>
                            <div>
                                <p className="text-[13px] text-[#4b545d]">{t('OPERATOR.TOTAL_TASKS')}</p>
                                <p className="text-2xl font-semibold text-black">{totalTasksCount}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-[8px] border border-[#e2e4ed] bg-white">
                            <div className="h-10 w-10 rounded-[6px] bg-[#f3e8ff] flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-[#7c3aed]" />
                            </div>
                            <div>
                                <p className="text-[13px] text-[#4b545d]">{t('OPERATOR.WORKSTATIONS')}</p>
                                <p className="text-2xl font-semibold text-black">{workstationCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}