'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parse } from 'date-fns';
import CreateEventForm from './createEvent';
import { useGetAllShopPlansQuery } from '@/store/api';

interface ShopEvent {
  id: string;
  fab_id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  color: string;
  description?: string;
}



const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = 5 + i;
  return `${hour}:00`;
});

// Helper function to get color based on workstation
const getColorForWorkstation = (workstationId: number): string => {
  const colors = [
    'bg-blue-100 border-blue-400',
    'bg-purple-100 border-purple-400',
    'bg-yellow-100 border-yellow-400',
    'bg-pink-100 border-pink-400',
    'bg-green-100 border-green-400',
    'bg-indigo-100 border-indigo-400',
    'bg-red-100 border-red-400',
    'bg-teal-100 border-teal-400',
  ];
  return colors[workstationId % colors.length];
};

export const ShopCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 11)); // Feb 11, 2025
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Fetch shop plans from API
  const { data: shopPlansData, isLoading, isError, refetch } = useGetAllShopPlansQuery();
  
  // Transform API data to ShopEvent format
  const events = useMemo<ShopEvent[]>(() => {
    if (!shopPlansData?.data?.plans) return [];
    console.log(shopPlansData.data.plans, "hhhhhh")
    return shopPlansData.data.plans.map(plan => ({
      id: plan.id.toString(),
      fab_id: `FAB-${plan.fab_id}`,
      title: `FAB-${plan.fab_id}`,
      startTime: plan.scheduled_start_date ? 
        format(new Date(plan.scheduled_start_date), 'H:mm') : '9:00',
      endTime: plan.scheduled_start_date ? 
        format(new Date(new Date(plan.scheduled_start_date).getTime() + (plan.estimated_hours * 60 * 60 * 1000)), 'H:mm') : '17:00',
      date: plan.scheduled_start_date ? 
        format(new Date(plan.scheduled_start_date), 'yyyy-MM-dd') : 
        format(currentDate, 'yyyy-MM-dd'),
      color: getColorForWorkstation(plan.workstation_id),
      description: `${plan.estimated_hours} hrs`,
    }));
  }, [shopPlansData, currentDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Tuesday
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i + 1)); // Wed-Sun

  const handlePrevWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const getEventsForDay = (date: Date): ShopEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter((event) => event.date === dateStr);
  };

  const getEventsForTimeSlot = (date: Date, timeSlot: string): ShopEvent[] => {
    return getEventsForDay(date).filter(
      (event) =>
        parseInt(event.startTime.split(':')[0]) === parseInt(timeSlot.split(':')[0])
    );
  };

  const handleCreateEvent = () => {
    // In a real implementation, this would create a new shop plan via API
    console.log('Event created');
    setShowEventForm(false);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventForm(true);
  };

  return (
    <div className="w-full space-y-4">
      {/* Loading and Error States */}
      {isLoading && (
        <div className="text-center py-8 text-gray-500">
          Loading shop plans...
        </div>
      )}
      
      {isError && (
        <div className="text-center py-8 text-red-500">
          Error loading shop plans. 
          <button 
            onClick={() => refetch()} 
            className="ml-2 text-blue-500 underline"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold min-w-[200px] text-center">
            {format(weekStart, 'MMM yyyy')}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowEventForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Calendar */}
      {!isLoading && !isError && (
        <div className="rounded-lg border bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-6 border-b bg-gray-50">
          <div className="border-r p-3 text-sm font-medium text-gray-600 w-20">
            TIME
          </div>
          {weekDays.map((date) => (
            <div
              key={date.toISOString()}
              className="border-r p-3 text-center font-medium"
            >
              <div className="text-sm text-gray-600">
                {format(date, 'EEE').toUpperCase()}
              </div>
              <div className="text-lg font-bold">{format(date, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time slots and events */}
        <div>
          {TIME_SLOTS.map((timeSlot) => (
            <div key={timeSlot} className="grid grid-cols-6 border-b">
              {/* Time label */}
              <div className="border-r p-3 text-sm font-medium text-gray-600 bg-gray-50 w-20">
                {timeSlot}
              </div>

              {/* Day cells */}
              {weekDays.map((date) => (
                <div
                  key={`${date.toISOString()}-${timeSlot}`}
                  className="border-r p-2 min-h-[80px] relative bg-white hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => handleDateClick(date)}
                >
                  {getEventsForTimeSlot(date, timeSlot).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-2 rounded border mb-1 ${event.color}`}
                    >
                      <div className="font-semibold text-gray-900">
                        {event.title}
                      </div>
                      <div className="text-gray-700">
                        {event.startTime} - {event.endTime}
                      </div>
                      {event.description && (
                        <div className="text-gray-600">{event.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Event form drawer */}
      {showEventForm && (
        <CreateEventForm
          selectedDate={selectedDate}
          onClose={() => setShowEventForm(false)}
          onEventCreated={handleCreateEvent}
        />
      )}
    </div>
  );
};
