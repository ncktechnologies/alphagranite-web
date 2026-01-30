import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetDraftingSessionHistoryQuery } from '@/store/api';
import { Clock, Play, Pause, Square, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

interface SessionHistoryProps {
    fabId: number;
}

interface SessionActionItem {
    timestamp: string;
    action: 'start' | 'pause' | 'resume' | 'end' | 'on_hold';
    note: string | null;
    sqft_drafted: string | null;
    work_percentage_done: number | null;
}

interface DraftingSession {
    session_id: number;
    fab_id: number;
    drafter_id: number;
    status: string;
    current_session_start_time: string;
    last_action_time: string;
    total_time_spent: number;
    notes: SessionActionItem[];
}

const getActionIcon = (action: string) => {
    switch (action) {
        case 'start':
            return <Play className="w-4 h-4 text-green-600" />;
        case 'pause':
            return <Pause className="w-4 h-4 text-yellow-600" />;
        case 'resume':
            return <Play className="w-4 h-4 text-blue-600" />;
        case 'end':
            return <CheckCircle className="w-4 h-4 text-purple-600" />;
        case 'on_hold':
            return <Square className="w-4 h-4 text-orange-600" />;
        default:
            return <Clock className="w-4 h-4 text-gray-600" />;
    }
};

const getActionBadge = (action: string) => {
    const badges: Record<string, { className: string; label: string }> = {
        start: { className: 'bg-green-100 text-green-800', label: 'Started' },
        pause: { className: 'bg-yellow-100 text-yellow-800', label: 'Paused' },
        resume: { className: 'bg-blue-100 text-blue-800', label: 'Resumed' },
        end: { className: 'bg-purple-100 text-purple-800', label: 'Ended' },
        on_hold: { className: 'bg-orange-100 text-orange-800', label: 'On Hold' },
    };

    const badge = badges[action] || { className: 'bg-gray-100 text-gray-800', label: action };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
            {badge.label}
        </span>
    );
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

export const SessionHistory = ({ fabId }: SessionHistoryProps) => {
    const { data: historyData, isLoading, error } = useGetDraftingSessionHistoryQuery(fabId, {
        skip: !fabId,
    });

    useEffect(() => {
        if (historyData) {
            console.log('SessionHistory Data Received:', historyData);
        }
        if (error) {
            console.error('SessionHistory API Error:', error);
        }
    }, [historyData, error]);

    // Don't show the card if there's no session history
    if (isLoading) {
        return (
            <Card className="mt-4">
                <CardContent className="p-8 text-center text-gray-500">
                    Loading session history...
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="mt-4 border-red-200">
                <CardContent className="p-8 text-center text-red-500">
                    Failed to load session history.
                </CardContent>
            </Card>
        );
    }

    // Access the sessions array from the data object
    const sessionsData: DraftingSession[] = historyData?.data?.sessions || [];

    if (sessionsData.length === 0) {
        return null;
    }

    // Combine all actions (notes) from all sessions and sort by timestamp descending
    const allHistory = sessionsData.flatMap(session =>
        (session.notes || []).map(note => ({
            ...note,
            drafter_id: session.drafter_id
        }))
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (allHistory.length === 0) {
        return null;
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-lg">Session History</CardTitle>
                <p className="text-sm text-muted-foreground">Track your drafting session activities</p>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {allHistory.map((item, index) => (
                        <div
                            key={`${item.timestamp}-${index}`}
                            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0 mt-1">{getActionIcon(item.action)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {getActionBadge(item.action)}
                                    <span className="text-sm text-gray-500">{formatTimestamp(item.timestamp)}</span>
                                </div>

                                {/* Session Details */}
                                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                    {item.sqft_drafted && (
                                        <div className="text-gray-600">
                                            <span className="font-medium">Sq Ft:</span> {item.sqft_drafted}
                                        </div>
                                    )}

                                    {item.work_percentage_done !== null && item.work_percentage_done !== undefined && (
                                        <div className="text-gray-600">
                                            <span className="font-medium">Progress:</span> {item.work_percentage_done}%
                                        </div>
                                    )}
                                </div>

                                {/* Note */}
                                {item.note && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 italic">
                                        "{item.note}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
