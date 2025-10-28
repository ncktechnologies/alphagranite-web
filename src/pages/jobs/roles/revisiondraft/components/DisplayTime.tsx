import { format } from 'date-fns'

interface TimeDisplayProps {
    startTime?: Date | null
    endTime?: Date | null
    totalTime?: number // in seconds
}

export const TimeDisplay = ({ startTime, endTime, totalTime }: TimeDisplayProps) => {
    const formatTime = (date?: Date | null) => {
        if (!date) return '--'
        return (
            format(date, 'dd MMM yyyy | hh:mm a')
        )
    }

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '00:00:00'
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

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
