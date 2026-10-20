// Shop cut plan timer state as returned on each plan by GET /fabs (plans[].timer).
export type PlanTimerStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface PlanTimer {
    status: PlanTimerStatus;
    session_id: number | null;
    elapsed_seconds: number;
}

export type PlanTimerAction = 'start' | 'pause' | 'resume' | 'stop';

export const formatElapsed = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** The server's elapsed seconds plus, while running, the whole seconds since that value arrived. */
export const elapsedSecondsAt = (timer: PlanTimer | undefined, receivedAtMs: number, nowMs: number) => {
    const base = timer?.elapsed_seconds ?? 0;
    if (timer?.status !== 'running') return base;
    return base + Math.max(0, Math.floor((nowMs - receivedAtMs) / 1000));
};

/** Running beats paused when several plans share a stage. */
export function getStageTimerStatus(plans: { planning_section_id?: number; timer?: PlanTimer | null }[], sectionId: number) {
    const statuses = plans.filter((p) => p.planning_section_id === sectionId).map((p) => p.timer?.status);
    if (statuses.includes('running')) return 'running';
    if (statuses.includes('paused')) return 'paused';
    return null;
}

export const STAGE_TIMER_OUTLINE: Record<'running' | 'paused', string> = {
    running: 'inset 0 0 0 2px #22c55e',
    paused: 'inset 0 0 0 2px #f97316',
};
