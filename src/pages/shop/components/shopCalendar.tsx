import React, { useState, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, X, Search, Repeat } from 'lucide-react';
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

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 17;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const HOUR_HEIGHT = 60;

const ShopCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  const [is12HourFormat, setIs12HourFormat] = useState(true);
  const [isAxisSwapped, setIsAxisSwapped] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  
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

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return is12HourFormat ? format(d, 'hh:mm a') : format(d, 'HH:mm');
  };

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
    const startTime = formatTime(new Date(event.scheduled_start_date));
    const endTime = formatTime(new Date(new Date(event.scheduled_start_date).getTime() + event.estimated_hours * 60 * 60 * 1000));
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
        <div className="font-semibold truncate">FAB-{event.fab_id}</div>
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
    <div>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Shop Calendar"
            description={
              viewMode === 'day'
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : viewMode === 'week'
                ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMMM d')} – ${format(
                    addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6),
                    'MMMM d, yyyy'
                  )}`
                : format(currentDate, 'MMMM yyyy')
            }
          />
          <ToolbarActions className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 border-r pr-2">
              <Button variant={viewMode === 'day' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('day')}>
                Day
              </Button>
              <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>
                Week
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>
                Month
              </Button>
            </div>

            <div className="flex items-center gap-1 border-r pr-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(currentDate, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => date && setCurrentDate(date)}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setIs12HourFormat(!is12HourFormat)}>
              <Clock className="h-4 w-4 mr-2" />
              {is12HourFormat ? '12h' : '24h'}
            </Button>

            {viewMode !== 'month' && (
              <Button variant="outline" size="sm" onClick={() => setIsAxisSwapped(!isAxisSwapped)}>
                <Repeat className="h-4 w-4 mr-2" />
                {isAxisSwapped ? 'Day Rows' : 'Time Rows'}
              </Button>
            )}

            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search FAB ID..."
                value={filters.fabId}
                onChange={(e) => setFilters({ ...filters, fabId: e.target.value })}
                className="ps-9 w-[230px] h-[46px]"
              />
              {filters.fabId && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setFilters({ ...filters, fabId: '' })}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            <Select
              value={filters.fabType || 'all'}
              onValueChange={(value) => setFilters({ ...filters, fabType: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All FAB Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FAB Types</SelectItem>
                {availableFilters.fabTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.workstation || 'all'}
              onValueChange={(value) => setFilters({ ...filters, workstation: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Workstations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workstations</SelectItem>
                {availableFilters.workstations.map((ws) => (
                  <SelectItem key={ws} value={ws}>
                    {ws}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.operator || 'all'}
              onValueChange={(value) => setFilters({ ...filters, operator: value === 'all' ? '' : value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Operators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {availableFilters.operators.map((op) => (
                  <SelectItem key={op.id} value={String(op.id)}>
                    {op.first_name} {op.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => handleCreateEvent(currentDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Plan
            </Button>
          </ToolbarActions>
        </Toolbar>

        <Card className="mt-6">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg font-semibold">
              <p className="text-sm text-gray-600 mt-1">
                {viewMode === 'day'
                  ? format(currentDate, 'EEEE, MMMM d, yyyy')
                  : viewMode === 'week'
                  ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'EEEE, MMMM d')} – ${format(
                      addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6),
                      'EEEE, MMMM d, yyyy'
                    )}`
                  : format(currentDate, 'MMMM yyyy')}
              </p>
            </CardTitle>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {viewMode === 'month' ? 'Total Monthly Plans' : 'Total Scheduled Plans'}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {isLoading ? '-' : Object.values(eventsByDay).reduce((acc, events) => acc + events.length, 0)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-500">Loading calendar events...</p>
              </div>
            )}
            {!isLoading && (
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {viewMode === 'month' ? (
                    <div className="grid" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
                      <div className="p-2" />
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase p-2">
                          {day}
                        </div>
                      ))}
                      {monthWeeks.map((week, idx) => {
                        const weekNumber = format(week[0], 'w');
                        return (
                          <React.Fragment key={idx}>
                            <div className="text-xs font-medium text-gray-500 p-2 text-right pr-4">
                              Wk {weekNumber}
                            </div>
                            {week.map((day) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const dayEvents = eventsByDay[dateKey] || [];
                              const isCurrentMonth = getMonth(day) === getMonth(currentDate);
                              return (
                                <div
                                  key={dateKey}
                                  className={`border rounded p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${
                                    !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                                  }`}
                                  onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                  }}
                                >
                                  <div className="text-right text-sm font-medium">{format(day, 'd')}</div>
                                  {dayEvents.length > 0 && (
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs">
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
                  ) : (
                    <>
                      {!isAxisSwapped ? (
                        <div className="flex gap-2">
                          <div className="w-24 flex-shrink-0">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Time</div>
                            <div style={{ height: TOTAL_HOURS * HOUR_HEIGHT }} className="relative">
                              {Array.from({ length: TOTAL_HOURS }, (_, i) => {
                                const hour = DAY_START_HOUR + i;
                                return (
                                  <div
                                    key={hour}
                                    className="absolute w-full text-xs font-medium text-gray-600"
                                    style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT, lineHeight: `${HOUR_HEIGHT}px` }}
                                  >
                                    {formatTime(new Date().setHours(hour, 0, 0, 0))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {displayDays.map((day) => {
                            const dayEvents = eventsByDay[format(day, 'yyyy-MM-dd')] || [];
                            const positionedEvents = getEventsWithPositions(dayEvents);
                            return (
                              <div
                                key={format(day, 'yyyy-MM-dd')}
                                className="flex-1 min-w-[200px]"
                              >
                                <div className="text-center mb-2">
                                  <div className="text-xs font-semibold text-gray-500 uppercase">
                                    {format(day, 'EEE')}
                                  </div>
                                  <div
                                    className={`text-lg font-bold ${
                                      isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
                                    }`}
                                  >
                                    {format(day, 'd')}
                                  </div>
                                </div>
                                <div
                                  className="relative border border-gray-200 rounded"
                                  style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                                  onClick={() => handleCreateEvent(day)}
                                >
                                  {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                                    <div
                                      key={i}
                                      className="absolute w-full border-t border-gray-100"
                                      style={{ top: i * HOUR_HEIGHT }}
                                    />
                                  ))}
                                  {positionedEvents.map(renderEventCard)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <div className="w-24 flex-shrink-0">
                            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Day</div>
                            <div style={{ height: displayDays.length * 80 }}>
                              {displayDays.map((day, idx) => (
                                <div
                                  key={format(day, 'yyyy-MM-dd')}
                                  className="h-20 flex flex-col justify-center"
                                >
                                  <div className="text-xs font-semibold text-gray-500">
                                    {format(day, 'EEE')}
                                  </div>
                                  <div
                                    className={`text-lg font-bold ${
                                      isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-900'
                                    }`}
                                  >
                                    {format(day, 'd')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {timeSlots.map((time) => {
                            const hour = parseInt(time.split(':')[0]);
                            return (
                              <div key={time} className="flex-1 min-w-[100px]">
                                <div className="text-center mb-2">
                                  <div className="text-xs font-semibold text-gray-500 uppercase">
                                    {formatTime(new Date().setHours(hour, 0, 0, 0))}
                                  </div>
                                </div>
                                <div>
                                  {displayDays.map((day) => {
                                    const dayEvents = eventsByDay[format(day, 'yyyy-MM-dd')] || [];
                                    const eventsAtHour = dayEvents.filter(
                                      (e) => new Date(e.scheduled_start_date).getHours() === hour
                                    );
                                    return (
                                      <div
                                        key={format(day, 'yyyy-MM-dd') + time}
                                        className="border border-gray-200 rounded p-1 h-20 cursor-pointer hover:bg-gray-50 relative overflow-y-auto"
                                        onClick={() => handleCreateEvent(day, time)}
                                      >
                                        {eventsAtHour.map((e) => (
                                          <div
                                            key={e.id}
                                            className={`text-[10px] p-0.5 rounded truncate ${getFabTypeColor(e.fab_type)}`}
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              setSelectedEvent(e);
                                              setSelectedDate(new Date(e.scheduled_start_date));
                                              setSelectedTimeSlot(time);
                                              setShowCreateForm(true);
                                            }}
                                          >
                                            FAB-{e.fab_id}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showCreateForm && (
          <CreateEventForm
            onClose={() => setShowCreateForm(false)}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            selectedEvent={selectedEvent}
            onEventCreated={() => setShowCreateForm(false)}
          />
        )}
      </Container>
    </div>
  );
};

export default ShopCalendarPage;