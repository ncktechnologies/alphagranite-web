// Timer session status -> the Drafting-style status column used on the desk-stage pages.
export type StageTimerStatus = 'running' | 'paused' | 'not_started';

// Drafting/CNC sessions run as "drafting"; SlabSmith/Final Programming sessions run as "active".
const RUNNING = new Set(['drafting', 'active', 'running']);
const PAUSED = new Set(['paused', 'on_hold']);

export function stageTimerStatus(session?: { status?: string | null } | null): StageTimerStatus {
    const status = (session?.status ?? '').trim().toLowerCase();
    if (RUNNING.has(status)) return 'running';
    if (PAUSED.has(status)) return 'paused';
    return 'not_started';
}

export const STAGE_TIMER_STATUS_LABELS: Record<StageTimerStatus, string> = {
    running: 'Running',
    paused: 'Paused',
    not_started: 'Not Started',
};

/** Fields a stage page adds to its job rows for the timer status column. */
export function stageTimerFields(session?: { status?: string | null; user_name?: string | null } | null) {
    const status = stageTimerStatus(session);
    return { timer_status: status, timer_user: status === 'not_started' ? undefined : session?.user_name ?? undefined };
}
