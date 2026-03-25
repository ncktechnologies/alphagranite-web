'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, MapPin, FileText, Rows3, Columns3 } from 'lucide-react';
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
import { WorkstationToggle } from './components/WorkstationToggle';
import { useGetCurrentOperatorTasksQuery, useGetOperatorWorkstationsQuery } from '@/store/api/operator';
import { useSelector } from 'react-redux';

// ── Layout constants ──────────────────────────────────────────────────────────
const DAY_START_HOUR = 7;
const DAY_END_HOUR   = 19;
const TOTAL_HOURS    = DAY_END_HOUR - DAY_START_HOUR;

// X-axis = time  (each hour column)
const HOUR_WIDTH  = 120; // px per hour on the X axis
const ROW_HEIGHT  = 80;  // px per day row on the Y axis
const TIME_LABEL_HEIGHT = 40; // header row showing hour labels
const DATE_LABEL_WIDTH  = 80; // left column showing date labels

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

function getColorForFab(fabId: string | number) {
    return COLOR_CYCLE[Number(fabId) % COLOR_CYCLE.length];
}

const isSameDay = (d1: Date, d2: Date) =>
    format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');

const setHoursLocal = (date: Date, hours: number) => {
    const d = new Date(date);
    d.setHours(hours, 0, 0, 0);
    return d;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function OperatorDashboard() {
    const navigate  = useNavigate();
    const currentUser = useSelector((s: any) => s.user.user);
    const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

    const [currentDate, setCurrentDate]               = useState(new Date());
    const [viewMode, setViewMode]                     = useState<'day' | 'week' | 'month'>('week');
    const [selectedWorkstation, setSelectedWorkstation] = useState<number | null>(null);

    const { data: workstationsData, isLoading: isWorkstationsLoading } =
        useGetOperatorWorkstationsQuery(
            { operator_id: currentEmployeeId },
            { skip: !currentEmployeeId }
        );

    const { data: tasksData, isLoading: isTasksLoading } =
        useGetCurrentOperatorTasksQuery(
            { view: viewMode, reference_date: format(currentDate, 'yyyy-MM-dd') },
            { skip: !currentEmployeeId }
        );

    // ── Display days ──────────────────────────────────────────────────────────
    const displayDays = useMemo(() => {
        if (viewMode === 'day') return [currentDate];
        if (viewMode === 'week') {
            const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
            return Array.from({ length: 5 }, (_, i) => addDays(ws, i));
        }
        return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
    }, [currentDate, viewMode]);

    const monthWeeks = useMemo(() => {
        if (viewMode !== 'month') return [];
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end   = endOfWeek(endOfMonth(currentDate),   { weekStartsOn: 1 });
        const days  = eachDayOfInterval({ start, end });
        const weeks: Date[][] = [];
        for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
        return weeks;
    }, [currentDate, viewMode]);

    // ── Events grouped by day ─────────────────────────────────────────────────
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
                const scheduledDate = task.scheduled_start_date
                    ? format(new Date(task.scheduled_start_date), 'yyyy-MM-dd')
                    : null;
                if (scheduledDate && scheduledDate in grouped) {
                    grouped[scheduledDate].push({
                        ...task,
                        work_percentage: task.work_percentage || 0,
                        plan_name: task.planning_section_name || task.current_stage || '',
                    });
                }
            });

        return grouped;
    }, [tasksData, displayDays, monthWeeks, viewMode, selectedWorkstation]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handlePrevious = () => {
        if (viewMode === 'day')   setCurrentDate(addDays(currentDate, -1));
        else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
        else setCurrentDate(addMonths(currentDate, -1));
    };

    const handleNext = () => {
        if (viewMode === 'day')   setCurrentDate(addDays(currentDate, 1));
        else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
        else setCurrentDate(addMonths(currentDate, 1));
    };

    // ── Event click — pass scheduled_start_date in URL params ─────────────────
    const handleEventClick = useCallback((task: any) => {
        const params = new URLSearchParams();
        if (task.task_id)              params.set('task_id',              String(task.task_id));
        if (task.workstation_id)       params.set('workstation_id',       String(task.workstation_id));
        if (task.scheduled_start_date) params.set('scheduled_start_date', task.scheduled_start_date);
        navigate(`/operator/task/${task.job_id}?${params.toString()}`);
    }, [navigate]);

    // ── Compute event position on X axis (time) ───────────────────────────────
    // Each event sits in the row for its day (Y) and is placed by start time (X).
    const getEventsWithXPositions = useCallback((events: any[]) => {
        if (!events.length) return [];

        const sorted = [...events].sort(
            (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime()
        );

        // Overlap detection on the time axis — assign vertical sub-lanes within the row
        const ranges = sorted.map((ev) => {
            const s = new Date(ev.scheduled_start_date).getTime();
            const e = s + (ev.estimated_hours || 1) * 3_600_000;
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

        return sorted.map((ev, i) => {
            const start   = new Date(ev.scheduled_start_date);
            const startH  = start.getHours() + start.getMinutes() / 60;
            // X = distance from DAY_START_HOUR along time axis
            const left    = Math.max(0, (startH - DAY_START_HOUR) * HOUR_WIDTH);
            const width   = Math.max(HOUR_WIDTH * 0.5, (ev.estimated_hours || 1) * HOUR_WIDTH);
            // Within a row, overlapping events stack vertically using sub-lanes
            const laneH   = ROW_HEIGHT / maxLane;
            const top     = lanes[i] * laneH;
            const height  = laneH - 4;

            return { ...ev, _left: left, _width: width, _top: top, _height: height, _lane: lanes[i], _maxLane: maxLane };
        });
    }, []);

    // ── Render a single event card ────────────────────────────────────────────
    const renderEventCard = useCallback((event: any) => {
        const { bg, border, text } = getColorForFab(event.fab_id || event.id);
        // Format time range from scheduled dates
        const startTime = event.scheduled_start_date
            ? format(new Date(event.scheduled_start_date), 'h:mma')
            : null;
        const endTime = event.scheduled_end_date
            ? format(new Date(event.scheduled_end_date), 'h:mma')
            : null;

        return (
            <div
                key={`${event.task_id || event.id}`}
                className="absolute cursor-pointer rounded-[8px] border overflow-hidden transition-opacity hover:opacity-90 select-none"
                style={{
                    left:   event._left + 2,
                    width:  event._width - 4,
                    top:    event._top + 2,
                    height: event._height,
                    backgroundColor: bg,
                    borderColor: border,
                }}
                onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
            >
                <div className="px-2 py-1 h-full flex flex-col justify-start overflow-hidden gap-0.5">
                    {/* FAB ID + job name on same line */}
                    <div className="flex items-center gap-1">
                        <p className="text-[12px] font-bold truncate leading-tight shrink-0" style={{ color: text }}>
                            FAB-{event.fab_id}
                        </p>
                        {event.job_name && (
                            <p className="text-[11px] font-medium truncate leading-tight" style={{ color: text, opacity: 0.85 }}>
                                · {event.job_name}
                            </p>
                        )}
                    </div>

                    {/* Account name */}
                    {event._height > 30 && event.account_name && (
                        <p className="text-[10px] truncate leading-tight" style={{ color: text, opacity: 0.7 }}>
                            {event.account_name}
                        </p>
                    )}

                    {/* Workstation + stage */}
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

                    {/* Time range */}
                    {event._height > 58 && startTime && (
                        <p className="text-[9px] leading-tight" style={{ color: text, opacity: 0.6 }}>
                            {startTime}{endTime ? ` – ${endTime}` : ''}
                            {event.estimated_hours ? ` · ${event.estimated_hours}h` : ''}
                        </p>
                    )}

                    {/* Work percentage bar */}
                    {event._height > 68 && event.work_percentage > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 bg-white/50 rounded-full h-1">
                                <div
                                    className="h-1 rounded-full"
                                    style={{ width: `${event.work_percentage}%`, backgroundColor: text }}
                                />
                            </div>
                            <span className="text-[9px] font-medium" style={{ color: text }}>
                                {event.work_percentage}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [handleEventClick]);

    // ── Calendar label ────────────────────────────────────────────────────────
    const calLabel =
        viewMode === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : viewMode === 'week'
                ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy');

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isTasksLoading) {
        return (
            <div className="bg-white min-h-screen">
                <div className="border-b border-[#dfdfdf]">
                    <div className="px-10 pt-5 pb-5">
                        <Skeleton className="h-[32px] w-[300px] mb-2" />
                        <Skeleton className="h-[24px] w-[400px]" />
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    <Skeleton className="h-[100px] w-full" />
                    <Skeleton className="h-[600px] w-full" />
                </div>
            </div>
        );
    }

    // ── Total grid width for horizontal scroll ────────────────────────────────
    const gridWidth = DATE_LABEL_WIDTH + TOTAL_HOURS * HOUR_WIDTH;

    return (
        <div className="bg-white min-h-screen">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="border-b border-[#dfdfdf]">
                <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
                    <div className="flex flex-col gap-2">
                        <p className="text-[28px] leading-[32px] text-black font-semibold">My Schedule</p>
                        <p className="text-[20px] leading-[24px] text-[#4a4d59] font-semibold">{calLabel}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrevious}
                            className="h-8 w-8 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="h-8 w-8 rounded-[6px] border border-[#e2e4ed] flex items-center justify-center hover:bg-gray-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="h-[44px] px-6 rounded-[8px] text-[14px] font-semibold text-white"
                            style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
                        >
                            Today
                        </button>

                        {/* View toggle */}
                        <div className="flex items-center gap-1 border border-[#e2e4ed] rounded-[8px] p-1 bg-white">
                            {(['day', 'week', 'month'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all capitalize ${
                                        viewMode === mode
                                            ? 'bg-[#7a9705] text-white'
                                            : 'text-[#4b545d] hover:bg-gray-50'
                                    }`}
                                >
                                    {mode === 'day' && <Columns3 className="w-4 h-4" />}
                                    {mode === 'week' && <Rows3 className="w-4 h-4" />}
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Workstation filter */}
                {!isWorkstationsLoading && workstationsData && (
                    <WorkstationToggle
                        workstations={Array.isArray(workstationsData) ? workstationsData : (workstationsData as any)?.data || []}
                        selectedWorkstation={selectedWorkstation}
                        onSelect={setSelectedWorkstation}
                    />
                )}

                {/* ── Calendar grid ─────────────────────────────────────────── */}
                <div className="bg-white border border-[#e2e4ed] rounded-[8px] overflow-auto">

                    {/* ── Day / Week view — Y = dates, X = time ──────────────── */}
                    {(viewMode === 'day' || viewMode === 'week') && (
                        <div style={{ minWidth: gridWidth }}>
                            {/* Time header row */}
                            <div className="flex sticky top-0 z-10 bg-[#f9fafb] border-b border-[#e2e4ed]">
                                {/* Corner cell */}
                                <div
                                    className="flex-shrink-0 border-r border-[#e2e4ed]"
                                    style={{ width: DATE_LABEL_WIDTH, height: TIME_LABEL_HEIGHT }}
                                />
                                {/* Hour labels along X axis */}
                                {Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START_HOUR + i).map((hour) => (
                                    <div
                                        key={hour}
                                        className="flex-shrink-0 text-[11px] text-[#7c8689] flex items-center justify-center border-r border-[#e2e4ed] font-medium"
                                        style={{ width: HOUR_WIDTH, height: TIME_LABEL_HEIGHT }}
                                    >
                                        {format(setHoursLocal(new Date(), hour), 'h a')}
                                    </div>
                                ))}
                            </div>

                            {/* One row per day */}
                            {displayDays.map((day, dayIdx) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const events  = eventsByDay[dateKey] || [];
                                const eventsWithPositions = getEventsWithXPositions(events);
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={dayIdx}
                                        className="flex border-b border-[#e2e4ed] last:border-b-0"
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        {/* Date label (Y axis) */}
                                        <div
                                            className={`flex-shrink-0 flex flex-col items-center justify-center border-r border-[#e2e4ed] px-2 ${
                                                isToday ? 'bg-[#f0f4e8]' : 'bg-[#f9fafb]'
                                            }`}
                                            style={{ width: DATE_LABEL_WIDTH }}
                                        >
                                            <span className={`text-[11px] font-semibold ${isToday ? 'text-[#7a9705]' : 'text-[#4b545d]'}`}>
                                                {format(day, 'EEE')}
                                            </span>
                                            <span className={`text-[18px] font-bold leading-tight ${isToday ? 'text-[#7a9705]' : 'text-[#111827]'}`}>
                                                {format(day, 'd')}
                                            </span>
                                        </div>

                                        {/* Time cells + events */}
                                        <div
                                            className="relative flex-1"
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            {/* Vertical hour grid lines */}
                                            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute top-0 bottom-0 border-r border-[#e2e4ed]"
                                                    style={{ left: i * HOUR_WIDTH }}
                                                />
                                            ))}

                                            {/* Events positioned on X axis by time */}
                                            {eventsWithPositions.map((event: any) => renderEventCard(event))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Month view (unchanged grid layout) ─────────────────── */}
                    {viewMode === 'month' && (
                        <div className="grid grid-cols-7 gap-px bg-[#e2e4ed]">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                <div key={day} className="bg-[#f9fafb] py-2 text-center text-[13px] font-semibold text-[#4b545d]">
                                    {day}
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
                                                <div className={`text-[13px] mb-2 ${
                                                    isToday ? 'text-[#7a9705] font-bold'
                                                    : isCurrentMonth ? 'text-[#4b545d]'
                                                    : 'text-[#9ca3af]'
                                                }`}>
                                                    {format(day, 'd')}
                                                </div>
                                                <div className="space-y-1">
                                                    {events.slice(0, 3).map((event: any) => {
                                                        const { bg, border, text } = getColorForFab(event.fab_id || event.id);
                                                        return (
                                                            <div
                                                                key={event.task_id || event.id}
                                                                className="text-[11px] px-2 py-1 rounded cursor-pointer truncate"
                                                                style={{ backgroundColor: bg, borderColor: border, color: text, borderWidth: 1 }}
                                                                onClick={() => handleEventClick(event)}
                                                            >
                                                                <div className="font-medium truncate">
                                                                    FAB-{event.fab_number || event.fab_id}
                                                                </div>
                                                                {event.plan_name && (
                                                                    <div className="text-[9px] opacity-70 truncate">{event.plan_name}</div>
                                                                )}
                                                                {event.work_percentage > 0 && (
                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                        <div className="flex-1 bg-white/50 rounded-full h-1">
                                                                            <div
                                                                                className="h-1 rounded-full"
                                                                                style={{ width: `${event.work_percentage}%`, backgroundColor: text }}
                                                                            />
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

                {/* ── Quick stats ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                    <div className="flex items-center gap-3 p-4 rounded-[8px] border border-[#e2e4ed] bg-white">
                        <div className="h-10 w-10 rounded-[6px] bg-[#d5e7ff] flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#2563eb]" />
                        </div>
                        <div>
                            <p className="text-[13px] text-[#4b545d]">Total Tasks</p>
                            <p className="text-2xl font-semibold text-black">
                                {Object.values(eventsByDay).reduce((acc, evs) => acc + evs.length, 0)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-[8px] border border-[#e2e4ed] bg-white">
                        <div className="h-10 w-10 rounded-[6px] bg-[#caf2d7] flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[#16a34a]" />
                        </div>
                        <div>
                            <p className="text-[13px] text-[#4b545d]">Active Jobs</p>
                            <p className="text-2xl font-semibold text-black">
                                {Object.values(eventsByDay).flat().filter((e: any) => e.estimated_hours).length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-[8px] border border-[#e2e4ed] bg-white">
                        <div className="h-10 w-10 rounded-[6px] bg-[#f3e8ff] flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-[#7c3aed]" />
                        </div>
                        <div>
                            <p className="text-[13px] text-[#4b545d]">Workstations</p>
                            <p className="text-2xl font-semibold text-black">
                                {selectedWorkstation ? 1 : (workstationsData as any)?.data?.length || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}