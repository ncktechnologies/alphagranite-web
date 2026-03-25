import { useState, useEffect, useRef } from 'react';

interface SCTTimerProps {
  startTime: string | null;  // draft_completed_date (UTC ISO string without Z)
  endTime: string | null;    // sct_completed_date or null
}

export const SCTTimer = ({ startTime, endTime }: SCTTimerProps) => {
  const [duration, setDuration] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse an ISO string as UTC – append 'Z' if no timezone indicator
  const parseUTCDate = (dateStr: string): number => {
    const hasTimezone = /[Z+-]/i.test(dateStr);
    const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
    return new Date(normalized).getTime();
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
            `${days} day${days !== 1 ? 's' : ''} ${
              remainingHours > 0 ? `${remainingHours} hr${remainingHours !== 1 ? 's' : ''}` : ''
            }`.trim()
          );
        } else if (hours > 0) {
          const remainingMinutes = minutes % 60;
          setDuration(
            `${hours} hr${hours !== 1 ? 's' : ''} ${
              remainingMinutes > 0 ? `${remainingMinutes} min` : ''
            }`.trim()
          );
        } else {
          setDuration(minutes > 0 ? `${minutes} min` : 'Just now');
        }
      } catch {
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
    <div className="bg-[#FF8D28] px-4 py-2 rounded-[6px] text-white flex flex-col items-center min-w-[120px]">
      <span className="text-xs font-medium text-[#EEEEEE] uppercase tracking-wide">
        Time in SCT
      </span>
      <p className="text-sm font-bold mt-0.5 whitespace-nowrap">
        {duration}
      </p>
    </div>
  );
};