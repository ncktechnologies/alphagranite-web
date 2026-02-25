import React, { useState, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, X, Filter, Search } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, getMonth, getYear } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useGetAllShopPlansQuery, useGetFabTypesQuery, useGetWorkstationsQuery, useGetEmployeesQuery } from '@/store/api';
import CreateEventForm from './createEvent';

const ShopCalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    fabType: '' as string,
    workstation: '' as string,
    operator: '' as string,
    fabId: '' as string,
  });

  // Fetch shop plans for current month
  const { data: plansResponse, isLoading } = useGetAllShopPlansQuery({
    month: getMonth(currentDate) + 1,
    year: getYear(currentDate),
    limit: 1000,
  });

  // Fetch FAB types
  const { data: fabTypesData } = useGetFabTypesQuery();

  // Fetch workstations
  const { data: workstationsData } = useGetWorkstationsQuery();

  // Fetch employees (for operators)
  const { data: employeesData } = useGetEmployeesQuery();

  // Get week start
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Extract available filter options from API endpoints
  const availableFilters = useMemo(() => {
    // Extract fab types from API - returns array directly
    let fabTypesArray: string[] = [];
    if (Array.isArray(fabTypesData)) {
      fabTypesArray = fabTypesData.map((ft: any) => ft.name || ft).sort();
    } else if (fabTypesData?.data && Array.isArray(fabTypesData.data)) {
      fabTypesArray = fabTypesData.data.map((ft: any) => ft.name || ft).sort();
    }

    // Extract workstations from API - returns paginated response
    let workstationsArray: string[] = [];
    if (workstationsData?.data && Array.isArray(workstationsData.data)) {
      workstationsArray = workstationsData.data.map((ws: any) => ws.name || ws).sort();
    } else if (Array.isArray(workstationsData)) {
      workstationsArray = workstationsData.map((ws: any) =>ws.name || ws).sort();
    }

    // Extract employees (operators) from API - returns paginated response
    let employeesArray: string[] = [];
    if (employeesData?.data && Array.isArray(employeesData.data)) {
      employeesArray = employeesData.data.map((emp: any) =>  emp).sort();
    } else if (Array.isArray(employeesData)) {
      employeesArray = employeesData.map((emp: any) =>  emp).sort();
    }

    return {
      fabTypes: fabTypesArray,
      workstations: workstationsArray,
      operators: employeesArray,
    };
  }, [fabTypesData, workstationsData, employeesData]);

  // Process plans data with filters applied
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    weekDays.forEach((day) => {
      grouped[format(day, 'yyyy-MM-dd')] = [];
    });

    if (plansResponse?.data?.grouped_plans) {
      plansResponse.data.grouped_plans.forEach((groupedPlan: any) => {
        const dateKey = format(new Date(groupedPlan.date), 'yyyy-MM-dd');
        if (grouped[dateKey]) {
          let plans = groupedPlan.plans || [];
          
          // Apply filters
          if (filters.fabId) {
            plans = plans.filter((p: any) => String(p.fab_id).includes(filters.fabId));
          }
          if (filters.fabType) {
            plans = plans.filter((p: any) => p.fab_type === filters.fabType);
          }
          if (filters.workstation) {
            plans = plans.filter((p: any) => String(p.workstation_id) === filters.workstation);
          }
          if (filters.operator) {
            plans = plans.filter((p: any) => String(p.operator_id) === filters.operator);
          }
          
          grouped[dateKey] = plans;
        }
      });
    } else if (plansResponse?.grouped_plans) {
      plansResponse.grouped_plans.forEach((groupedPlan: any) => {
        const dateKey = format(new Date(groupedPlan.date), 'yyyy-MM-dd');
        if (grouped[dateKey]) {
          let plans = groupedPlan.plans || [];
          
          if (filters.fabId) {
            plans = plans.filter((p: any) => String(p.fab_id).includes(filters.fabId));
          }
          if (filters.fabType) {
            plans = plans.filter((p: any) => p.fab_type === filters.fabType);
          }
          if (filters.workstation) {
            plans = plans.filter((p: any) => String(p.workstation_id) === filters.workstation);
          }
          if (filters.operator) {
            plans = plans.filter((p: any) => String(p.operator_id) === filters.operator);
          }
          
          grouped[dateKey] = plans;
        }
      });
    }
    return grouped;
  }, [plansResponse, weekDays, filters]);

  const handlePrevWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handleCreateEvent = (date: Date, timeSlot?: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(timeSlot || null);
    setShowCreateForm(true);
  };

  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 7 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Map fab types to colors
  const getFabTypeColor = (fabType: string) => {
    const typeColorMap: Record<string, string> = {
      'standard': 'bg-[#9eeb47] text-gray-900 border-[#9eeb47]',
      'fab only': 'bg-[#5bd1d7] text-gray-900 border-[#5bd1d7]',
      'cust redo': 'bg-[#f0bf4c] text-gray-900 border-[#f0bf4c]',
      'resurface': 'bg-[#d094ea] text-gray-900 border-[#d094ea]',
      'fast track': 'bg-[#f59794] text-gray-900 border-[#f59794]',
      'ag redo': 'bg-[#f5cc94] text-gray-900 border-[#f5cc94]',
    };
    return typeColorMap[fabType?.toLowerCase()] || 'bg-gray-200 text-gray-900 border-gray-200';
  };

  // Calculate end time based on start time + estimated hours
  const getEndTime = (startDateStr: string, estimatedHours: number) => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate.getTime() + estimatedHours * 60 * 60 * 1000);
    return format(endDate, 'HH:mm');
  };

  return (
    <div>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Shop Calendar"
            description={`Week of ${format(weekStart, 'MMMM d, yyyy')} - ${format(addDays(weekStart, 6), 'MMMM d, yyyy')}`}
          />
          <ToolbarActions className="flex items-center gap-2 flex-wrap">
            {/* Week Navigation */}
            <div className="flex items-center gap-1 border-r pr-2">
              <Button variant="outline" size="sm" onClick={handlePrevWeek} title="Previous week">
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
                    onSelect={(date) => {
                      if (date) setCurrentDate(date);
                    }}
                    disabled={(date) =>
                      date > new Date('2099-12-31') || date < new Date('2000-01-01')
                    }
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={handleNextWeek} title="Next week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Search FAB ID */}
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

            {/* FAB Type Dropdown */}
            <Select value={filters.fabType || 'all'} onValueChange={(value) => setFilters({ ...filters, fabType: value === 'all' ? '' : value })}>
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

            {/* Workstation Dropdown */}
            <Select value={filters.workstation || 'all'} onValueChange={(value) => setFilters({ ...filters, workstation: value === 'all' ? '' : value })}>
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

            {/* Operator Dropdown */}
            <Select value={filters.operator || 'all'} onValueChange={(value) => setFilters({ ...filters, operator: value === 'all' ? '' : value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Operators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operators</SelectItem>
                {availableFilters.operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                     {op.first_name}  {op.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Create Event Button */}
            <Button onClick={() => handleCreateEvent(currentDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Plan
            </Button>
          </ToolbarActions>
        </Toolbar>

        <Card className="mt-6">
          <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-lg font-semibold">
                          {/* <CardTitle>Weekly Schedule</CardTitle> */}
                          <p className="text-sm text-gray-600 mt-1">
                            {format(weekStart, 'EEEE, MMMM d')} - {format(addDays(weekStart, 6), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </CardTitle>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">Total Scheduled Plans</p>
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
                {/* Header with days */}
                <div className="flex gap-2 mb-4">
                  <div className="w-24 flex-shrink-0">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Time</div>
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={format(day, 'yyyy-MM-dd')}
                      className="flex-1 min-w-[200px] text-center"
                    >
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        {format(day, 'EEE')}
                      </div>
                      <div
                        className={`text-lg font-bold ${
                          isSameDay(day, new Date())
                            ? 'text-blue-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time slots and events */}
                <div className="border-t space-y-1">
                  {timeSlots.map((time) => (
                    <div key={time} className="flex gap-2 min-h-16">
                      <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-600 py-2">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const dayEvents = eventsByDay[format(day, 'yyyy-MM-dd')] || [];
                        const dayDate = format(day, 'yyyy-MM-dd');
                        
                        // Get events that span this time slot
                        const eventsInTimeSlot = dayEvents.filter((event) => {
                          if (!event.scheduled_start_date) return false;
                          const eventStart = new Date(event.scheduled_start_date);
                          const eventEnd = new Date(eventStart.getTime() + event.estimated_hours * 60 * 60 * 1000);
                          const currentHour = parseInt(time.split(':')[0]);
                          const slotStart = currentHour;
                          const slotEnd = currentHour + 1;
                          
                          // Check if event overlaps with this time slot
                          return eventStart.getHours() < slotEnd && eventEnd.getHours() >= slotStart;
                        });

                        return (
                          <div
                            key={dayDate + time}
                            className="flex-1 min-w-[200px] border border-gray-200 rounded p-1 cursor-pointer hover:bg-gray-50 relative min-h-16"
                            onClick={() => handleCreateEvent(day, time)}
                          >
                            {eventsInTimeSlot.length > 0 && (
                              <div className="space-y-1">
                                {eventsInTimeSlot.slice(0, 2).map((event) => {
                                  const startTime = format(new Date(event.scheduled_start_date), 'HH:mm');
                                  const endTime = getEndTime(event.scheduled_start_date, event.estimated_hours);
                                  return (
                                    <div
                                      key={event.id}
                                      className={`text-xs p-1.5 rounded border-l-4 ${getFabTypeColor(event.fab_type)}`}
                                    >
                                      <div className="font-semibold">FAB-{event.fab_id}</div>
                                      <div className="text-xs font-medium">{event.fab_type}</div>
                                      <div className="text-xs font-medium text-gray-700">{event.workstation_name}</div>
                                      <div className="text-xs text-gray-600">{event.plan_name}</div>
                                      <div className="flex items-center gap-1 text-xs mt-1">
                                        <Clock className="h-3 w-3" />
                                        {startTime} - {endTime}
                                      </div>
                                      <div className="text-xs mt-1">
                                        {event.estimated_hours}h
                                      </div>
                                    </div>
                                  );
                                })}
                                {eventsInTimeSlot.length > 2 && (
                                  <div className="text-xs text-gray-500 px-1">
                                    +{eventsInTimeSlot.length - 2} more
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Create Event Form Sidebar */}
        {showCreateForm && (
          <CreateEventForm
            onClose={() => setShowCreateForm(false)}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            onEventCreated={() => {
              setShowCreateForm(false);
            }}
          />
        )}
      </Container>
    </div>
  );
};

export default ShopCalendarPage;
