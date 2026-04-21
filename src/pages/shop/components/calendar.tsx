import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, X, Search, Rows3, Columns3 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useGetAllShopPlansQuery, useGetFabTypesQuery, useGetWorkstationsQuery, useGetEmployeesQuery } from '@/store/api';
import CreateEventForm from './createEvent';
import { formatTime } from '@/utils/date-utils';

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 17;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 60;
const HOUR_WIDTH = 100;

const ShopCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const [is12HourFormat, setIs12HourFormat] = useState(true);
  const [isAxisSwapped, setIsAxisSwapped] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  const [filters, setFilters] = useState({
    fabType: '',
    workstation: '',
    operator: '',
    fabId: '',
  });

  const { data: plansResponse, isLoading } = useGetAllShopPlansQuery({
    month: getMonth(currentDate) + 1,
    year: getYear(currentDate),
    limit: 1000,
  });

  const { data: fabTypesData } = useGetFabTypesQuery();
  const { data: workstationsData } = useGetWorkstationsQuery();
  const { data: employeesData } = useGetEmployeesQuery();

  const displayDays = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
  }, [currentDate, viewMode]);

  const monthWeeks = useMemo(() => {
    if (viewMode !== 'month') return [];
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate, viewMode]);

  const availableFilters = useMemo(() => {
    let fabTypesArray: string[] = [];
    if (Array.isArray(fabTypesData)) {
      fabTypesArray = fabTypesData.map((ft: any) => ft.name || ft).sort();
    } else if (fabTypesData?.data && Array.isArray(fabTypesData.data)) {
      fabTypesArray = fabTypesData.data.map((ft: any) => ft.name || ft).sort();
    }

    let workstationsArray: string[] = [];
    if (workstationsData?.data && Array.isArray(workstationsData.data)) {
      workstationsArray = workstationsData.data.map((ws: any) => ws.name || ws).sort();
    } else if (Array.isArray(workstationsData)) {
      workstationsArray = workstationsData.map((ws: any) => ws.name || ws).sort();
    }

    let operatorsArray: Array<{ id: string | number; first_name: string; last_name: string }> = [];
    if (employeesData?.data && Array.isArray(employeesData.data)) {
      operatorsArray = employeesData.data.map((emp: any) => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
      }));
    } else if (Array.isArray(employeesData)) {
      operatorsArray = employeesData.map((emp: any) => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
      }));
    }
    operatorsArray.sort((a, b) => a.first_name.localeCompare(b.first_name));

    return {
      fabTypes: fabTypesArray,
      workstations: workstationsArray,
      operators: operatorsArray,
    };
  }, [fabTypesData, workstationsData, employeesData]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const allDays = viewMode === 'month' ? monthWeeks.flat() : displayDays;
    allDays.forEach((day) => {
      grouped[format(day, 'yyyy-MM-dd')] = [];
    });

    const plans = plansResponse?.data?.grouped_plans || plansResponse?.grouped_plans || [];
    plans.forEach((groupedPlan: any) => {
      const dateKey = format(new Date(groupedPlan.date), 'yyyy-MM-dd');
      if (grouped[dateKey] !== undefined) {
        let filtered = groupedPlan.plans || [];
        if (filters.fabId) {
          filtered = filtered.filter((p: any) => String(p.fab_id).includes(filters.fabId));
        }
        if (filters.fabType) {
          filtered = filtered.filter((p: any) => p.fab_type === filters.fabType);
        }
        if (filters.workstation) {
          filtered = filtered.filter((p: any) => String(p.workstation_id) === filters.workstation);
        }
        if (filters.operator) {
          filtered = filtered.filter((p: any) => String(p.operator_id) === filters.operator);
        }
        grouped[dateKey] = filtered;
      }
    });
    return grouped;
  }, [plansResponse, displayDays, monthWeeks, viewMode, filters]);

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

  const handleCreateEvent = (date: Date, timeSlot?: string) => {
    setSelectedEvent(null);
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot || null);
    setShowCreateForm(true);
  };

  // ✅ Define timeSlots – this must be present before the JSX that uses it
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 7 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });
  


  const getFabTypeColor = (fabType: string) => {
    const map: Record<string, string> = {
      standard: 'bg-[#9eeb47] text-gray-900 border-[#9eeb47]',
      'fab only': 'bg-[#5bd1d7] text-gray-900 border-[#5bd1d7]',
      'cust redo': 'bg-[#f0bf4c] text-gray-900 border-[#f0bf4c]',
      "resurface": 'bg-[#d094ea] text-gray-900 border-[#d094ea]',
      'fast track': 'bg-[#f59794] text-gray-900 border-[#f59794]',
      'ag redo': 'bg-[#f5cc94] text-gray-900 border-[#f5cc94]',
    };
    return map[fabType?.toLowerCase()] || 'bg-gray-200 text-gray-900 border-gray-200';
  };

  const getEventPosition = (event: any) => {
    const start = new Date(event.scheduled_start_date);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const startOffset = (startHour - DAY_START_HOUR) * HOUR_HEIGHT;
    const durationHours = event.estimated_hours;
    const height = durationHours * HOUR_HEIGHT;
    return { top: Math.max(0, startOffset), height: Math.max(HOUR_HEIGHT * 0.5, height) };
  };

  const getEventsWithPositions = (events: any[]) => {
    if (!events.length) return [];
    const sorted = [...events].sort((a, b) =>
      new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime()
    );
    const ranges = sorted.map((event, idx) => {
      const start = new Date(event.scheduled_start_date);
      const end = new Date(start.getTime() + event.estimated_hours * 60 * 60 * 1000);
      return { start: start.getTime(), end: end.getTime(), idx, event };
    });
    const columns: number[] = new Array(events.length).fill(0);
    ranges.forEach((range, i) => {
      const overlappingCols = new Set<number>();
      for (let j = 0; j < i; j++) {
        if (ranges[j].end > range.start) {
          overlappingCols.add(columns[j]);
        }
      }
      let col = 0;
      while (overlappingCols.has(col)) col++;
      columns[i] = col;
    });
    const maxCol = Math.max(...columns, 0) + 1;
    return sorted.map((event, idx) => {
      const { top, height } = getEventPosition(event);
      return {
        ...event,
        _top: top,
        _height: height,
        _left: (columns[idx] / maxCol) * 100,
        _width: 100 / maxCol,
      };
    });
  };

  const renderEventCard = (event: any) => {
    const startTime = formatTime(new Date(event.scheduled_start_date), is12HourFormat);
    const endTime = formatTime(new Date(new Date(event.scheduled_start_date).getTime() + event.estimated_hours * 60 * 60 * 1000), is12HourFormat);
    return (
      <div
        key={event.id}
        className={`absolute rounded border-l-4 overflow-hidden text-[10px] leading-tight p-0.5 cursor-pointer ${getFabTypeColor(event.fab_type)}`}
        style={{
          top: `${event._top}px`,
          height: `${event._height}px`,
          left: `${event._left}%`,
          width: `${event._width}%`,
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEvent(event);
          setSelectedDate(new Date(event.scheduled_start_date));
          setSelectedTimeSlot(format(new Date(event.scheduled_start_date), 'HH:mm'));
          setShowCreateForm(true);
        }}
      >
        <div className="font-semibold truncate">{event.fab_id}</div>
        <div className="truncate">{event.fab_type}</div>
        <div className="truncate text-gray-700">{event.workstation_name}</div>
        <div className="truncate">{event.operator_name}</div>
        <div className="flex items-center gap-0.5">
          <Clock className="h-2 w-2" />
          <span>{startTime} - {endTime}</span>
        </div>
        <div>{event.estimated_hours}h</div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen">
      {/* ── Page header ── */}
      <div className="border-b border-[#dfdfdf]">
        {/* Title row */}
        <div className="flex items-center justify-between px-10 pt-5 pb-5 gap-10">
          <div className="flex flex-col gap-2">
            <p className="font-['Proxima_Nova:Semibold',sans-serif] text-[28px] leading-[32px] text-black font-semibold">Shop Plan</p>
            <p className="font-['Proxima_Nova:Semibold',sans-serif] text-[20px] leading-[24px] text-[#4a4d59] font-semibold">
              {viewMode === 'day'
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : viewMode === 'week'
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </p>
          </div>
          <button
            onClick={() => handleCreateEvent(currentDate)}
            className="h-[44px] w-[150px] rounded-[8px] flex items-center justify-center gap-2 shrink-0 text-white font-['Proxima_Nova:Semibold',sans-serif] text-[14px] leading-[20px] font-semibold tracking-[-0.56px]"
            style={{ backgroundImage: 'linear-gradient(90deg, #7a9705 0%, #9cc15e 100%)' }}
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </button>
        </div>

        {/* View mode row */}
        <div className="flex items-center px-10 h-[65px]">
          {/* Day / Month switcher */}
          <div className="bg-[#f9f9f9] h-[45px] rounded-[6px] flex items-start pt-[4px] px-[4px] gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-[15px] py-[8px] rounded-[4px] font-['Proxima_Nova:Semibold',sans-serif] text-[14px] leading-[21px] font-semibold transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                  : 'text-[#78829d]'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-[12px] py-[8px] rounded-[4px] font-['Proxima_Nova:Semibold',sans-serif] text-[14px] leading-[21px] font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-black shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]'
                  : 'text-[#78829d]'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center justify-between px-10 h-[65px]">
          {/* Left: filters */}
          <div className="flex items-center gap-[10px]">
            {/* Search */}
            <div className="relative w-[194px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#78829d]" />
              <input
                placeholder="Search FAB ID..."
                value={filters.fabId}
                onChange={(e) => setFilters({ ...filters, fabId: e.target.value })}
                className="w-full h-[36px] bg-white border border-[#e2e4ed] rounded-[6px] pl-9 pr-3 text-[13px] font-['Proxima_Nova:Regular',sans-serif] text-[#4b545d] placeholder:text-[#78829d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)] outline-none focus:ring-1 focus:ring-[#e2e4ed]"
              />
              {filters.fabId && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setFilters({ ...filters, fabId: '' })}
                >
                  <X className="size-3.5 text-[#78829d]" />
                </button>
              )}
            </div>

            {/* FAB Types */}
            <Select
              value={filters.fabType || 'all'}
              onValueChange={(value) => setFilters({ ...filters, fabType: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[133px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                <SelectValue placeholder="All FAB Types" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="all">All FAB Types</SelectItem>
                {availableFilters.fabTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workstations */}
            <Select
              value={filters.workstation || 'all'}
              onValueChange={(value) => setFilters({ ...filters, workstation: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[146px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                <SelectValue placeholder="All Workstations" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="all">All Workstations</SelectItem>
                {availableFilters.workstations.map((ws) => (
                  <SelectItem key={ws} value={ws}>{ws}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operators */}
            <Select
              value={filters.operator || 'all'}
              onValueChange={(value) => setFilters({ ...filters, operator: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-[137px] h-[34px] bg-white border border-[#e2e4ed] rounded-[6px] text-[13px] text-[#4b545d] shadow-[0px_2px_3px_0px_rgba(0,0,0,0.05)]">
                <SelectValue placeholder="All Operators" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                <SelectItem value="all">All Operators</SelectItem>
                {availableFilters.operators.map((op) => (
                  <SelectItem key={op.id} value={String(op.id)}>
                    {op.first_name} {op.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: row/column toggle (only in non-month view) */}
          {viewMode !== 'month' && (
            <div className="bg-[#eaebe7] rounded-[8px] flex items-center gap-[2px] p-[2px]">
              <button
                onClick={() => setIsAxisSwapped(false)}
                title="Day columns"
                className={`p-[8px] rounded-[6px] transition-all ${!isAxisSwapped ? 'bg-white shadow-sm' : ''}`}
              >
                <Columns3 className="size-6 text-black" strokeWidth={2} />
              </button>
              <button
                onClick={() => setIsAxisSwapped(true)}
                title="Time rows"
                className={`p-[8px] rounded-[6px] transition-all ${isAxisSwapped ? 'bg-white shadow-sm' : ''}`}
              >
                <Rows3 className="size-6 text-[#93948e]" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="p-4 md:p-6">
        <div className="border border-[#ecedf0] rounded-[16px] px-4 py-6 flex flex-col gap-4">

          {/* CalendarToolbar */}
          <div className="flex items-center justify-between pl-4">
            {/* Left: prev + calendar icon + date + next */}
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="bg-white h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 text-[#74798b]" />
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-3">
                    <CalendarIcon className="size-6 text-[#4b545d]" strokeWidth={2} />
                    <span className="font-['Proxima_Nova:Semibold',sans-serif] text-[20px] leading-[24px] text-[#4a4d59] font-semibold whitespace-nowrap">
                      {viewMode === 'day'
                        ? format(currentDate, 'EEEE, MMMM d, yyyy')
                        : viewMode === 'week'
                        ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMMM d')} – ${format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'MMMM d, yyyy')}`
                        : format(currentDate, 'MMMM yyyy')}
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
                className="bg-white h-[34px] px-3 py-[7px] rounded-[6px] border border-[#e2e4e9] flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5 text-[#74798b]" />
              </button>
            </div>

            {/* Right: totals */}
            <div className="flex flex-col items-end gap-[10px]">
              <p className="font-['Proxima_Nova:Semibold',sans-serif] text-[16px] leading-[24px] text-[#7c8689] font-semibold whitespace-nowrap">
                {viewMode === 'month' ? 'Total Monthly Plans' : 'Total Scheduled Plans'}
              </p>
              <p className="font-['Proxima_Nova:Semibold',sans-serif] text-[20px] leading-[24px] text-black font-semibold">
                {isLoading ? '-' : Object.values(eventsByDay).reduce((acc, events) => acc + events.length, 0)}
              </p>
            </div>
          </div>

          {/* Timeline / Calendar grid */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-[#7c8689]">Loading calendar events...</p>
            </div>
          )}

          {!isLoading && (
            <div className="border border-[#ecedf0] rounded-[8px] overflow-x-auto">
              {viewMode === 'month' ? (
                /* ── Month grid ── */
                <div className="min-w-max">
                  <div className="grid" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
                    <div className="p-2" />
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="text-center text-[12px] font-medium text-[#4b545d] uppercase p-2 border-b border-[#e2e4ed]">
                        {day}
                      </div>
                    ))}
                    {monthWeeks.map((week, idx) => {
                      const weekNumber = format(week[0], 'w');
                      return (
                        <React.Fragment key={idx}>
                          <div className="text-[12px] font-medium text-[#7c8689] p-2 text-right pr-4 border-b border-[#e2e4ed]">
                            Wk {weekNumber}
                          </div>
                          {week.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayEvents = eventsByDay[dateKey] || [];
                            const isCurrentMonth = getMonth(day) === getMonth(currentDate);
                            return (
                              <div
                                key={dateKey}
                                className={`border-b border-r border-[#ecedf0] p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50 text-[#c0c4cc]' : ''}`}
                                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                              >
                                <div className="text-right text-[13px] font-medium">{format(day, 'd')}</div>
                                {dayEvents.length > 0 && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-[11px]">
                                      {dayEvents.length} plan{dayEvents.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              ) : !isAxisSwapped ? (
                /* ── Day-column (time rows) layout ── */
                <div className="min-w-max">
                  {/* Time header */}
                  <div className="flex border-b border-[#e2e4ed]">
                    <div className="w-24 flex-shrink-0 border-r border-[#ecedf0]" />
                    {displayDays.map((day) => (
                      <div
                        key={format(day, 'yyyy-MM-dd')}
                        className="flex-1 min-w-[200px] border-r border-[#ecedf0] flex flex-col items-center py-3"
                      >
                        <div className="font-['Inter:Medium',sans-serif] text-[12px] text-[#4b545d] text-center">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`font-['Inter:Medium',sans-serif] text-[20px] font-medium ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-[#4b545d]'}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time grid */}
                  <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                    {/* Time labels */}
                    <div className="w-24 flex-shrink-0 border-r border-[#ecedf0] relative">
                      {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                        const hour = DAY_START_HOUR + i;
                        return (
                          <div
                            key={hour}
                            className="absolute w-full flex items-center justify-center font-['Inter:Medium',sans-serif] text-[12px] text-[#4b545d]"
                            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                          >
                            {formatTime(new Date().setHours(hour, 0, 0, 0), is12HourFormat)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Day columns */}
                    {displayDays.map((day) => {
                      const dayEvents = eventsByDay[format(day, 'yyyy-MM-dd')] || [];
                      const positionedEvents = getEventsWithPositions(dayEvents);
                      return (
                        <div
                          key={format(day, 'yyyy-MM-dd')}
                          className="flex-1 min-w-[200px] border-r border-[#ecedf0] relative cursor-pointer hover:bg-gray-50/50"
                          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                          onClick={() => handleCreateEvent(day)}
                        >
                          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                            <div key={i} className="absolute w-full border-t border-[#ecedf0]" style={{ top: i * HOUR_HEIGHT }} />
                          ))}
                          {positionedEvents.map(renderEventCard)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── Time-row layout — each day is a row; events span horizontally ── */
                <div className="min-w-max">
                  {/* Time header */}
                  <div className="flex border-b border-[#e2e4ed]">
                    <div className="w-24 flex-shrink-0 border-r border-[#ecedf0]" />
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                      const hour = DAY_START_HOUR + i;
                      return (
                        <div
                          key={hour}
                          className="flex-1 border-r border-[#ecedf0] flex items-center justify-center py-3"
                          style={{ minWidth: HOUR_WIDTH }}
                        >
                          <span className="font-['Inter:Medium',sans-serif] text-[12px] text-[#4b545d] text-center">
                            {formatTime(new Date().setHours(hour, 0, 0, 0), is12HourFormat)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day rows */}
                  {displayDays.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay[dateKey] || [];
                    const ROW_LANE_HEIGHT = 36;

                    const sorted = [...dayEvents].sort(
                      (a, b) => new Date(a.scheduled_start_date).getTime() - new Date(b.scheduled_start_date).getTime()
                    );
                    const lanes: any[][] = [];
                    sorted.forEach((event) => {
                      const start = new Date(event.scheduled_start_date).getTime();
                      let placed = false;
                      for (const lane of lanes) {
                        const last = lane[lane.length - 1];
                        const lastEnd = new Date(last.scheduled_start_date).getTime() + last.estimated_hours * 3600000;
                        if (lastEnd <= start) { lane.push(event); placed = true; break; }
                      }
                      if (!placed) lanes.push([event]);
                    });
                    const numLanes = Math.max(lanes.length, 1);
                    const rowHeight = numLanes * ROW_LANE_HEIGHT + 8;

                    return (
                      <div key={dateKey} className="flex border-b border-[#e2e4ed]">
                        {/* Day label */}
                        <div className="w-24 flex-shrink-0 border-r border-[#ecedf0] flex flex-col justify-center px-3 py-2">
                          <div className="font-['Inter:Medium',sans-serif] text-[12px] text-[#4b545d]">{format(day, 'EEE')}</div>
                          <div className={`font-['Inter:Medium',sans-serif] text-[20px] font-medium ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-[#4b545d]'}`}>
                            {format(day, 'd')}
                          </div>
                        </div>

                        {/* Event area */}
                        <div
                          className="relative cursor-pointer hover:bg-gray-50/50"
                          style={{ height: rowHeight, minWidth: TOTAL_HOURS * HOUR_WIDTH }}
                          onClick={() => handleCreateEvent(day)}
                        >
                          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-[#ecedf0]" style={{ left: i * HOUR_WIDTH }} />
                          ))}
                          {lanes.map((lane, laneIdx) =>
                            lane.map((event) => {
                              const startDt = new Date(event.scheduled_start_date);
                              const startHour = startDt.getHours() + startDt.getMinutes() / 60;
                              const leftOffset = (startHour - DAY_START_HOUR) * HOUR_WIDTH;
                              const width = event.estimated_hours * HOUR_WIDTH;
                              return (
                                <div
                                  key={event.id}
                                  className={`absolute rounded-[4px] border overflow-hidden text-[10px] leading-tight px-2 cursor-pointer ${getFabTypeColor(event.fab_type)}`}
                                  style={{
                                    left: Math.max(0, leftOffset) + 1,
                                    width: Math.max(HOUR_WIDTH * 0.5, width) - 3,
                                    top: laneIdx * ROW_LANE_HEIGHT + 4,
                                    height: ROW_LANE_HEIGHT - 6,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                    setSelectedDate(new Date(event.scheduled_start_date));
                                    setSelectedTimeSlot(format(new Date(event.scheduled_start_date), 'HH:mm'));
                                    setShowCreateForm(true);
                                  }}
                                >
                                  <div className="font-['Proxima_Nova:Semibold',sans-serif] font-semibold truncate">{event.fab_id}</div>
                                  <div className="truncate text-[9px]">{event.fab_type}</div>
                                </div>
                              );
                            })
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

      {showCreateForm && (
        <CreateEventForm
          onClose={() => setShowCreateForm(false)}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          selectedEvent={selectedEvent}
          onEventCreated={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

export default ShopCalendarPage;