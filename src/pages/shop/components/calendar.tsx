import React, { useState, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, getMonth, getYear } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGetAllShopPlansQuery } from '@/store/api';
import CreateEventForm from './createEvent';

const ShopCalendarPages = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Fetch shop plans for current month
  const { data: plansResponse, isLoading } = useGetAllShopPlansQuery({
    month: getMonth(currentDate) + 1,
    year: getYear(currentDate),
    limit: 1000,
  });

  // Get week start
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Process plans data
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    weekDays.forEach((day) => {
      grouped[format(day, 'yyyy-MM-dd')] = [];
    });

    console.log('[v0] plansResponse:', plansResponse);

    if (plansResponse?.data?.grouped_plans) {
      console.log('[v0] grouped_plans:', plansResponse.data.grouped_plans);
      plansResponse.data.grouped_plans.forEach((groupedPlan: any) => {
        const dateKey = format(new Date(groupedPlan.date), 'yyyy-MM-dd');
        console.log('[v0] Processing plan for date:', dateKey, 'plans:', groupedPlan.plans);
        if (grouped[dateKey]) {
          grouped[dateKey] = groupedPlan.plans || [];
        }
      });
    } else if (plansResponse?.grouped_plans) {
      // Alternative structure without nested .data
      console.log('[v0] grouped_plans (alt):', plansResponse.grouped_plans);
      plansResponse.grouped_plans.forEach((groupedPlan: any) => {
        const dateKey = format(new Date(groupedPlan.date), 'yyyy-MM-dd');
        console.log('[v0] Processing plan for date (alt):', dateKey, 'plans:', groupedPlan.plans);
        if (grouped[dateKey]) {
          grouped[dateKey] = groupedPlan.plans || [];
        }
      });
    }

    console.log('[v0] Final grouped events:', grouped);
    return grouped;
  }, [plansResponse, weekDays]);

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

  const getEventColor = (workPercentage: number) => {
    if (workPercentage === 100) return 'bg-green-100 border-green-300';
    if (workPercentage >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-blue-100 border-blue-300';
  };

  return (
    <div>
      <Container>
        <Toolbar>
          {/* <ToolbarHeading
            title="Shop Calendar"
            description={`Week of ${format(weekStart, 'MMMM d, yyyy')} - ${format(addDays(weekStart, 6), 'MMMM d, yyyy')}`}
          /> */}
          <ToolbarActions className="flex items-center gap-2">
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

            {/* Create Event Button */}
            <Button onClick={() => handleCreateEvent(currentDate)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
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
                <div className="border-t divide-y  divide-gray-200 space-y-1">
                  {timeSlots.map((time) => (
                    <div key={time} className="flex gap-2 min-h-16">
                      <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-600 py-2">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const dayEvents = eventsByDay[format(day, 'yyyy-MM-dd')] || [];
                        const dayDate = format(day, 'yyyy-MM-dd');
                        const eventsInTimeSlot = dayEvents.filter((event) => {
                          if (!event.scheduled_start_date) return false;
                          const eventTime = format(new Date(event.scheduled_start_date), 'HH:00');
                          return eventTime === time;
                        });

                        return (
                          <div
                            key={dayDate + time}
                            className="flex-1 min-w-[200px] border-l border-gray-200 rounded py-1 cursor-pointer hover:bg-gray-50 relative"
                            onClick={() => handleCreateEvent(day, time)}
                          >
                            {eventsInTimeSlot.length > 0 && (
                              <div className="space-y-1">
                                {eventsInTimeSlot.slice(0, 2).map((event) => (
                                  <div
                                    key={event.id}
                                    className={`text-xs p-1.5 rounded border-l-2 ${getEventColor(event.work_percentage)}`}
                                  >
                                    <div className="font-semibold">FAB-{event.fab_id}</div>
                                    <div className="flex items-center gap-1 text-xs">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(event.scheduled_start_date), 'HH:mm')}
                                    </div>
                                    <div className="text-xs">
                                      Hrs: {event.estimated_hours}h
                                    </div>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {event.work_percentage}%
                                    </Badge>
                                  </div>
                                ))}
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

export default ShopCalendarPages;
