import { useState, useEffect } from 'react';

interface SCTTimerProps {
    startTime: string | null;  // draft_completed_date
    endTime: string | null;    // sct_completed_date or null
}

export const SCTTimer = ({ startTime, endTime }: SCTTimerProps) => {
    const [duration, setDuration] = useState<string>('');

    useEffect(() => {
        const calculateDuration = () => {
            if (!startTime) {
                setDuration('Not started');
                return;
            }

            const start = new Date(startTime).getTime();
            const end = endTime ? new Date(endTime).getTime() : new Date().getTime();

            // Calculate difference in milliseconds
            const diff = end - start;

            // Generate friendly duration string
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
                // Format: "1 day 8 hrs"
                setDuration(`${days} day${days !== 1 ? 's' : ''} ${remainingHours} hr${remainingHours !== 1 ? 's' : ''}`);
            } else {
                const remainingMinutes = minutes % 60;
                // Format: "18 hrs 22 min"
                setDuration(`${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min`);
            }
        };

        // Initial calculation
        calculateDuration();

        // If not completed (endTime is null), update every minute
        let interval: NodeJS.Timeout;
        if (!endTime) {
            interval = setInterval(calculateDuration, 60000); // Update every minute
        }

        return () => {
            if (interval) clearInterval(interval);
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
