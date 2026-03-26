import { formatForDisplay } from '@/utils/date-utils'

interface TimeDisplayProps {
    startTime?: Date | null
    endTime?: Date | null
    totalTime?: number // in seconds
}

export const TimeDisplay = ({ startTime, endTime, totalTime }: TimeDisplayProps) => {
    const formatTime = (date?: Date | null) => {
        if (!date) return '--'
        return formatForDisplay(date, 'DISPLAY_WITH_TIME')
    }

    const formatDuration = (seconds: number) => {
        if (seconds < 0) seconds = 0;
        const days = Math.floor(seconds / (24 * 3600));
        const remainingSeconds = seconds % (24 * 3600);
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const secs = remainingSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');

        if (days > 0) {
            return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
        }
        return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    };

    return (
        <div className="flex items-center justify-between gap-10 w-full">
            {/* Start Time */}
            <div className="flex items-center gap-3">
                {/* Clock Icon */}
                <div className="flex-shrink-0">
                    <div className="flex items-center justify-center">
                        <img src="/images/app/clock.svg" alt="" />
                    </div>
                </div>
                <div>
                    <span className="text-sm text-text-foreground">Start time & Date:</span>
                    <p className="text-[16px] text-text font-semibold">
                        {formatTime(startTime)}
                    </p>
                </div>
            </div>


            {/* End Time */}
            <div>
                <span className="text-sm text-text-foreground">End time & Date:</span>
                <p className="text-[16px] text-text font-semibold">
                    {formatTime(endTime)}
                </p>
            </div>

            {/* Total Time */}
            <div className="bg-[#FF8D28] px-10 py-2 rounded-[6px] text-white text-[12px]">
                <span className="text-sm font-medium text-[#EEEEEE]">
                    Total hour spent
                </span>
                <p className="text-base font-semibold">
                    {formatDuration(totalTime)}
                </p>
            </div>
        </div>
    )
}
