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
        total_work_seconds: number;
        total_pause_seconds: number;
        sqft_templated?: number | null;
        sqft_not_templated?: number | null;
    };
    total_actual_seconds?: number;
    total_actual_hours?: number;
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

// ======================= INSTALLER TIMER API =======================
export const installerTimerApi = createApi({
    reducerPath: 'installerTimerApi',
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ['InstallerTimer'],
    endpoints: (builder) => ({
        // Start timer
        startInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number; installer_id: number }>({
            query: ({ job_id, installer_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/start`,
                method: 'POST',
                params: { installer_id },
            }),
            invalidatesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Pause timer (with optional sqft and note)
        pauseInstallerTimer: builder.mutation<
            SuccessResponse<JobTimerState>,
            { 
                job_id: number; 
                installer_id: number; 
                sqft_installed?: number; 
                sqft_not_installed?: number; 
                note?: string; 
            }
        >({
            query: ({ job_id, installer_id, sqft_installed, sqft_not_installed, note }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/pause`,
                method: 'POST',
                params: { installer_id },
                data: {
                    ...(sqft_installed !== undefined && { sqft_installed }),
                    ...(sqft_not_installed !== undefined && { sqft_not_installed }),
                    ...(note !== undefined && { note })
                },
            }),
            invalidatesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Resume timer
        resumeInstallerTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number; installer_id: number }>({
            query: ({ job_id, installer_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/resume`,
                method: 'POST',
                params: { installer_id },
            }),
            invalidatesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Stop timer (with optional sqft and note)
        stopInstallerTimer: builder.mutation<
            SuccessResponse<JobTimerState>,
            { 
                job_id: number; 
                installer_id: number; 
                sqft_installed?: number; 
                sqft_not_installed?: number; 
                note?: string; 
            }
        >({
            query: ({ job_id, installer_id, sqft_installed, sqft_not_installed, note }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/stop`,
                method: 'POST',
                params: { installer_id },
                data: {
                    ...(sqft_installed !== undefined && { sqft_installed }),
                    ...(sqft_not_installed !== undefined && { sqft_not_installed }),
                    ...(note !== undefined && { note })
                },
            }),
            invalidatesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer state
        getInstallerTimerState: builder.query<JobTimerState, { job_id: number; installer_id: number }>({
            query: ({ job_id, installer_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer`,
                method: 'GET',
                params: { installer_id },
            }),
            providesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer history
        getInstallerTimerHistory: builder.query<any, { job_id: number; installer_id: number }>({
            query: ({ job_id, installer_id }) => ({
                url: `/api/v1/job-timers/installer/jobs/${job_id}/timer/history`,
                method: 'GET',
                params: { installer_id },
            }),
            providesTags: (_result, _error, { job_id, installer_id }) => [
                { type: 'InstallerTimer', id: `${job_id}_${installer_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),
    }),
});

// ======================= TEMPLATER TIMER API =======================
export const templaterTimerApi = createApi({
    reducerPath: 'templaterTimerApi',
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ['TemplaterTimer'],
    endpoints: (builder) => ({
        // Start timer
        startTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number; templater_id: number }>({
            query: ({ job_id, templater_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/start`,
                method: 'POST',
                params: { templater_id },
            }),
            invalidatesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Pause timer
        pauseTemplaterTimer: builder.mutation<
            SuccessResponse<JobTimerState>,
            { 
                job_id: number; 
                templater_id: number; 
                sqft_templated?: number; 
                sqft_not_templated?: number; 
                note?: string; 
            }
        >({
            query: ({ job_id, templater_id, sqft_templated, sqft_not_templated, note }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/pause`,
                method: 'POST',
                params: { templater_id },
                data: {
                    ...(sqft_templated !== undefined && { sqft_templated }),
                    ...(sqft_not_templated !== undefined && { sqft_not_templated }),
                    ...(note !== undefined && { note })
                },
            }),
            invalidatesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Resume timer
        resumeTemplaterTimer: builder.mutation<SuccessResponse<JobTimerState>, { job_id: number; templater_id: number }>({
            query: ({ job_id, templater_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/resume`,
                method: 'POST',
                params: { templater_id },
            }),
            invalidatesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Stop timer
        stopTemplaterTimer: builder.mutation<
            SuccessResponse<JobTimerState>,
            { 
                job_id: number; 
                templater_id: number; 
                sqft_templated?: number; 
                sqft_not_templated?: number; 
                note?: string; 
            }
        >({
            query: ({ job_id, templater_id, sqft_templated, sqft_not_templated, note }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/stop`,
                method: 'POST',
                params: { templater_id },
                data: {
                    ...(sqft_templated !== undefined && { sqft_templated }),
                    ...(sqft_not_templated !== undefined && { sqft_not_templated }),
                    ...(note !== undefined && { note })
                },
            }),
            invalidatesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer state
        getTemplaterTimerState: builder.query<JobTimerState, { job_id: number; templater_id: number }>({
            query: ({ job_id, templater_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer`,
                method: 'GET',
                params: { templater_id },
            }),
            providesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
            ],
            transformResponse: (response: any) => response.data || response,
        }),

        // Get timer history
        getTemplaterTimerHistory: builder.query<any, { job_id: number; templater_id: number }>({
            query: ({ job_id, templater_id }) => ({
                url: `/api/v1/job-timers/templater/jobs/${job_id}/timer/history`,
                method: 'GET',
                params: { templater_id },
            }),
            providesTags: (_result, _error, { job_id, templater_id }) => [
                { type: 'TemplaterTimer', id: `${job_id}_${templater_id}` }
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