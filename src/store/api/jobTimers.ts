import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

// Timer State Types (same as operator)
export interface JobTimerState {
    id?: number;
    job_id: number;
    user_id?: number;
    workstation_id?: number | null;
    session?: {
        id: number;
        job_id: number;
        user_id?: number;
        workstation_id?: number | null;
        status: 'idle' | 'running' | 'paused' | 'stopped';
        session_start_at: string;
        current_run_start_at: string | null;
        current_pause_start_at: string | null;
        stopped_at: string | null;
        total_elapsed_seconds: number;
    };
    total_time_seconds?: number;
    elapsed_time?: number;
}

export interface JobTimerHistory {
    id: number;
    job_id: number;
    user_id?: number;
    workstation_id?: number | null;
    started_at: string;
    paused_at?: string;
    resumed_at?: string;
    stopped_at?: string;
    elapsed_seconds: number;
    created_at?: string;
}

export interface SuccessResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

// Installer Timer API
export const installerTimerApi = createApi({
    reducerPath: 'installerTimerApi',
    baseQuery: axiosBaseQuery({
        baseUrl: baseUrl
    }),
    tagTypes: ['InstallerTimer'],
    endpoints: (builder) => ({
        // Start timer
        startInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/start`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Pause timer
        pauseInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/pause`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Resume timer
        resumeInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/resume`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Stop timer
        stopInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/stop`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer state
        getInstallerTimerState: builder.query<JobTimerState, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer`,
                method: 'GET',
            }),
            providesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer history
        getInstallerTimerHistory: builder.query<JobTimerHistory[], { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/history`,
                method: 'GET',
            }),
            providesTags: (_result, _error, { job_id }) => [
                { type: 'InstallerTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),
    }),
});

// Templater Timer API
export const templaterTimerApi = createApi({
    reducerPath: 'templaterTimerApi',
    baseQuery: axiosBaseQuery({
        baseUrl: baseUrl
    }),
    tagTypes: ['TemplaterTimer'],
    endpoints: (builder) => ({
        // Start timer
        startTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/start`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Pause timer
        pauseTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/pause`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Resume timer
        resumeTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/resume`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Stop timer
        stopTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/stop`,
                method: 'POST',
            }),
            invalidatesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer state
        getTemplaterTimerState: builder.query<JobTimerState, { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer`,
                method: 'GET',
            }),
            providesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer history
        getTemplaterTimerHistory: builder.query<JobTimerHistory[], { job_id: number }>({
            query: ({ job_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/history`,
                method: 'GET',
            }),
            providesTags: (_result, _error, { job_id }) => [
                { type: 'TemplaterTimer', id: job_id }
            ],
            transformResponse: (response: any) => response.data || response,
        }),
    }),
});

// Export hooks for Installer
export const {
    useStartInstallerTimerMutation,
    usePauseInstallerTimerMutation,
    useResumeInstallerTimerMutation,
    useStopInstallerTimerMutation,
    useGetInstallerTimerStateQuery,
    useGetInstallerTimerHistoryQuery,
} = installerTimerApi;

// Export hooks for Templater
export const {
    useStartTemplaterTimerMutation,
    usePauseTemplaterTimerMutation,
    useResumeTemplaterTimerMutation,
    useStopTemplaterTimerMutation,
    useGetTemplaterTimerStateQuery,
    useGetTemplaterTimerHistoryQuery,
} = templaterTimerApi;
