import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Play, Pause, Square, CheckCircle, Clock } from 'lucide-react';
import { useGetInstallerTimerHistoryQuery } from '@/store/api/jobTimers';
import { useTranslation } from '@/hooks/useTranslation';

interface InstallerTimerHistoryProps {
    jobId: number;
    installerId: number;
}

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const getActionIcon = (action: string) => {
    switch (action) {
        case 'start':
            return <Play className="w-4 h-4 text-green-600" />;
        case 'pause':
            return <Pause className="w-4 h-4 text-yellow-600" />;
        case 'resume':
            return <Play className="w-4 h-4 text-blue-600" />;
        case 'stop':
            return <CheckCircle className="w-4 h-4 text-purple-600" />;
        default:
            return <Clock className="w-4 h-4 text-gray-600" />;
    }
};

const getActionBadge = (action: string, t: (key: string) => string) => {
    const badges: Record<string, { className: string; labelKey: string }> = {
        start: { className: 'bg-green-100 text-green-800', labelKey: 'INSTALLER.TIMER_HISTORY.STARTED' },
        pause: { className: 'bg-yellow-100 text-yellow-800', labelKey: 'INSTALLER.TIMER_HISTORY.PAUSED' },
        resume: { className: 'bg-blue-100 text-blue-800', labelKey: 'INSTALLER.TIMER_HISTORY.RESUMED' },
        stop: { className: 'bg-purple-100 text-purple-800', labelKey: 'INSTALLER.TIMER_HISTORY.STOPPED' },
    };
    const badge = badges[action] || { className: 'bg-gray-100 text-gray-800', labelKey: action };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
            {t(badge.labelKey)}
        </span>
    );
};

export const InstallerTimerHistory = ({ jobId, installerId }: InstallerTimerHistoryProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const { data: history, isLoading, error } = useGetInstallerTimerHistoryQuery(
        { job_id: jobId, installer_id: installerId },
        { skip: !jobId || !installerId }
    );

    if (isLoading) {
        return (
            <Card className="mt-4">
                <CardContent className="p-4 text-center text-gray-500">
                    {t('INSTALLER.TIMER_HISTORY.LOADING')}
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="mt-4 border-red-200">
                <CardContent className="p-4 text-center text-red-500">
                    {t('INSTALLER.TIMER_HISTORY.FAILED_LOAD')}
                </CardContent>
            </Card>
        );
    }

    const events = history?.events || [];
    if (!events.length) {
        return null;
    }

    const sortedEvents = [...events].sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime());

    return (
        <Card className="mt-4">
            <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('INSTALLER.TIMER_HISTORY.TITLE')}</CardTitle>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">{t('INSTALLER.TIMER_HISTORY.TIMELINE')}</p>
            </CardHeader>
            {isOpen && (
                <CardContent>
                    <div className="space-y-4">
                        {sortedEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {getActionIcon(event.action)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getActionBadge(event.action, t)}
                                        <span className="text-sm text-gray-500">
                                            {formatTimestamp(event.event_at)}
                                        </span>
                                    </div>
                                    {event.note && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 italic">
                                            "{event.note}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
};