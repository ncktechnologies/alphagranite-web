import { useState, useEffect, useRef } from 'react';

interface SCTTimerProps {
  startTime: string | null;  // UTC timestamp without timezone
  endTime: string | null;    // UTC timestamp or null
}

export const SCTTimer = ({ startTime, endTime }: SCTTimerProps) => {
  const [duration, setDuration] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse any ISO-like string as UTC (no local timezone interference)
  const parseUTCDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    // If it's already a number (timestamp)
    const asNumber = Number(dateStr);
    if (!isNaN(asNumber)) return asNumber;
    
    // Remove 'Z' if present to avoid double processing
    const cleanStr = dateStr.replace(/Z$/, '');
    // Split into date and time parts (accept both 'T' or space)
    const [datePart, timePart] = cleanStr.split(/[T ]/);
    if (!datePart) return 0;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart ? timePart.split(':').map(Number) : [0,0,0];
    
    return Date.UTC(year, month - 1, day, hour, minute, second);
  };

  useEffect(() => {
    const calculateDuration = () => {
      if (!startTime) {
        setDuration('Not started');
        return;
      }

      try {
        const start = parseUTCDate(startTime);
        const end = endTime ? parseUTCDate(endTime) : Date.now(); // Date.now() is UTC ms

        const diff = end - start;

        if (diff < 0) {
          setDuration('Pending');
          return;
        }

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          const remainingHours = hours % 24;
          setDuration(
            `${days}d ${remainingHours > 0 ? `${remainingHours}h` : ''}`.trim()
          );
        } else if (hours > 0) {
          const remainingMinutes = minutes % 60;
          setDuration(
            `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim()
          );
        } else {
          setDuration(minutes > 0 ? `${minutes}m` : 'Just now');
        }
      } catch (error) {
        console.error('Error calculating SCT duration:', error);
        setDuration('Invalid date');
      }
    };

    calculateDuration();

    if (!endTime) {
      intervalRef.current = setInterval(calculateDuration, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, endTime]);

  if (!startTime) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md border border-gray-200 w-auto max-w-64">
      <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
        Time in SCT:
      </span>
      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
        {duration}
      </span>
    </div>
  );
};