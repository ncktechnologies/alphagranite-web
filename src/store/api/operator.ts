import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import { ShopCutPlanSuccessResponse } from "./shopCutPlanning";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

// Operator Types
export interface OperatorWorkstation {
    id: number;
    workstation_id: number;
    workstation_name: string;
    operator_id: number;
    status_id?: number;
    created_at?: string;
}

export interface OperatorTask {
    id: number;
    job_id: number;
    fab_id: number;
    workstation_id: number;
    workstation_name: string;
    account_name: string;
    job_name: string;
    fab_number: string;
    estimated_hours?: number;
    scheduled_date: string;
    scheduled_start_time?: string;
    scheduled_end_time?: string;
    status?: string;
    is_active?: boolean;
    scheduled_start_date: string;
    actual_end_date: string;
}

export interface TimerState {
    id?: number;
    fab_id: number;           // ← corrected: API uses fab_id
    operator_id: number;
    workstation_id?: number | null;
    session?: {
        id: number;
        fab_id: number;
        operator_id: number;
        workstation_id?: number | null;
        status: 'idle' | 'running' | 'paused' | 'stopped';
        session_start_at: string;
        current_run_start_at: string | null;
        current_pause_start_at: string | null;
        stopped_at: string | null;
        total_work_seconds: number;
        total_pause_seconds: number;
    };
    total_actual_seconds: number;
    total_actual_hours?: number;
    // Legacy fields for backwards compatibility
    status?: 'idle' | 'running' | 'paused' | 'stopped';
    total_time_spent?: number;
}

export interface TimerHistory {
    id: number;
    fab_id: number;           // ← corrected
    operator_id: number;
    action: 'start' | 'pause' | 'resume' | 'stop';
    timestamp: string;
    duration?: number;
    note?: string;
}

export interface OperatorJobTimerActionRequest {
    action: 'start' | 'pause' | 'resume' | 'stop' | 'onHold';
    timestamp?: string;
    note?: string;
}

// Create API
export const operatorApi = createApi({
    reducerPath: 'operatorApi',
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ['Operator', 'Workstation', 'Task', 'Timer'],
    endpoints: (builder) => ({
        // Get workstations assigned to an operator
        getOperatorWorkstations: builder.query<OperatorWorkstation[], { operator_id: number; status_id?: number }>({
            query: ({ operator_id, status_id }) => ({
                url: `/api/v1/operators/${operator_id}/workstations`,
                method: 'GET',
                params: { status_id }
            }),
            providesTags: (_result, _error, { operator_id }) => [{ type: 'Workstation', id: operator_id }],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get tasks for operator at a workstation
        getOperatorTasks: builder.query<OperatorTask[], { operator_id: number; workstation_id: number; view?: string; date?: string; active_only?: boolean }>({
            query: ({ operator_id, workstation_id, view = 'week', date, active_only = false }) => ({
                url: `/api/v1/operators/${operator_id}/workstations/${workstation_id}/tasks`,
                method: 'GET',
                params: { view, date, active_only }
            }),
            providesTags: (_result, _error, { operator_id, workstation_id }) => [
                { type: 'Task', id: `${operator_id}-${workstation_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get active task for operator at workstation
        getActiveTask: builder.query<OperatorTask | null, { operator_id: number; workstation_id: number }>({
            query: ({ operator_id, workstation_id }) => ({
                url: `/api/v1/operators/${operator_id}/workstations/${workstation_id}/tasks/active`,
                method: 'GET'
            }),
            providesTags: (_result, _error, { operator_id, workstation_id }) => [
                { type: 'Task', id: `${operator_id}-${workstation_id}-active` }
            ],
            transformResponse: (response: any) => response.data || null,
        }),

        // Get current logged-in operator's tasks
        getCurrentOperatorTasks: builder.query<OperatorTask[], { view?: string; reference_date?: string; active_only?: boolean }>({
            query: ({ view = 'week', reference_date, active_only = true }) => ({
                url: '/api/v1/operators/me/tasks',
                method: 'GET',
                params: { view, reference_date, active_only }
            }),
            providesTags: ['Task'],
            transformResponse: (response: any) => response.data || response,
        }),

        getCurrentOperatorTasksById: builder.query<OperatorTask[], { id?: number; operator_id: number; workstation_id: number }>({
            query: ({ id, operator_id, workstation_id }) => ({
                url: `/api/v1/operators/${operator_id}/workstations/${workstation_id}/tasks/${id}`,
                method: 'GET',
                params: { id }
            }),
            providesTags: ['Task'],
            transformResponse: (response: any) => response.data || response,
        }),

        // ─────────────────────────────────────────────────────────────────────
        // TIMER — all use fab_id: POST/GET /api/v1/operators/me/jobs/{fab_id}/...
        // ─────────────────────────────────────────────────────────────────────

        // Manage timer (start, pause, resume, stop)
        // POST /api/v1/operators/me/jobs/{fab_id}/timer/action
        manageTimer: builder.mutation<TimerState, { fab_id: number; data: OperatorJobTimerActionRequest }>({
            query: ({ fab_id, data }) => ({
                url: `/api/v1/operators/me/jobs/${fab_id}/timer/action`,
                method: 'POST',
                data
            }),
            invalidatesTags: (_result, _error, { fab_id }) => [
                { type: 'Timer', id: fab_id },
                'Task'
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer state
        // GET /api/v1/operators/me/jobs/{fab_id}/timer
        getTimerState: builder.query<TimerState, { fab_id: number; scheduled_start_date?: string }>({
            query: ({ fab_id, scheduled_start_date }) => ({
                url: `/api/v1/operators/me/jobs/${fab_id}/timer`,
                method: 'GET',
                params: scheduled_start_date ? { scheduled_start_date } : undefined,
            }),
            providesTags: (_result, _error, { fab_id }) => [{ type: 'Timer', id: fab_id }],
            transformResponse: (response: any) => response.data || null,
        }),

        // Get timer history
        // GET /api/v1/operators/me/jobs/{fab_id}/timer/history
        getTimerHistory: builder.query<TimerHistory[], { fab_id: number }>({
            query: ({ fab_id }) => ({
                url: `/api/v1/operators/me/jobs/${fab_id}/timer/history`,
                method: 'GET'
            }),
            providesTags: (_result, _error, { fab_id }) => [{ type: 'Timer', id: fab_id }],
            transformResponse: (response: any) => response.data || response,
        }),

        updateOperatorTask: builder.mutation<ShopCutPlanSuccessResponse<OperatorTask>, { operator_id: number; workstation_id: number; task_id: number; data: OperatorTask }>({
            query: ({ operator_id, workstation_id, task_id, data }) => ({
                url: `/api/v1/operators/${operator_id}/workstations/${workstation_id}/tasks/${task_id}`,
                method: "patch",
                data,
            }),
            invalidatesTags: (_result, _error, { task_id }) => [
                { type: "Task", id: task_id },
                "Task",
            ],
        }),

        // Upload QA files for operator task
        // POST /api/v1/operators/{operator_id}/jobs/{fab_id}/upload
        uploadOperatorQa: builder.mutation<any, {
            operator_id: number;
            job_id: number;       // kept as job_id in the component interface for compatibility
            files: File[];
            stage_name: string;
            file_design: string;
        }>({
            query: ({ operator_id, job_id, files, stage_name, file_design }) => {
                const formData = new FormData();
                files.forEach(file => formData.append('file', file));
                formData.append('stage_name', stage_name);
                formData.append('file_design', file_design);

                return {
                    // job_id here is fab_id — the URL uses fab_id per API spec
                    url: `/api/v1/operators/${operator_id}/jobs/${job_id}/upload`,
                    method: 'POST',
                    data: formData,
                    headers: { 'Content-Type': 'multipart/form-data' }
                };
            },
            invalidatesTags: ['Task'],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get QA files for operator
        getOperatorQaFiles: builder.query<any[], {
            operator_id: number;
            job_id: number;
        }>({
            query: ({ operator_id }) => ({
                url: `/api/v1/operators/${operator_id}/files`,
                method: 'GET'
            }),
            providesTags: (_result, _error, { job_id }) => [{ type: 'Task', id: job_id }],
            transformResponse: (response: any) => response.data || response,
        }),
    }),
});

export const {
    useGetOperatorWorkstationsQuery,
    useGetOperatorTasksQuery,
    useGetActiveTaskQuery,
    useGetCurrentOperatorTasksQuery,
    useGetCurrentOperatorTasksByIdQuery,
    useManageTimerMutation,
    useGetTimerStateQuery,
    useGetTimerHistoryQuery,
    useUploadOperatorQaMutation,
    useGetOperatorQaFilesQuery,
    useUpdateOperatorTaskMutation,
} = operatorApi;