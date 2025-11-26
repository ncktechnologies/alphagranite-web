/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

// const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";
const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`

// Job Types
export interface Job {
    id: number;
    name: string;
    job_number: string;
    project_value?: string;
    account_id?: number;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface JobCreate {
    name: string;
    job_number: string;
    project_value?: string;
    account_id?: number;
}

export interface JobUpdate {
    name?: string;
    job_number?: string;
    project_value?: string;
    account_id?: number;
}

// Fab Types
export interface Fab {
    id: number;
    job_id: number;
    fab_type: string;
    sales_person_id: number;
    stone_type_id: number;
    stone_type_name?: string;
    stone_color_id: number;
    stone_color_name?: string;
    stone_thickness_id: number;
    stone_thickness_value?: string;
    edge_id: number;
    edge_name?: string;
    input_area: string;
    total_sqft: number;
    notes?: string[];
    template_needed: boolean;
    drafting_needed: boolean;
    slab_smith_cust_needed: boolean;
    slab_smith_ag_needed: boolean;
    sct_needed: boolean;
    final_programming_needed: boolean;
    current_stage?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
    // Templating schedule fields
    templating_schedule_start_date?: string;
    templating_schedule_due_date?: string;
    technician_name?: string;
}

export interface FabCreate {
    job_id: number;
    fab_type: string;
    sales_person_id: number;
    stone_type_id: number;
    stone_color_id: number;
    stone_thickness_id: number;
    edge_id: number;
    input_area: string;
    total_sqft: number;
    notes?: string[];
    template_needed?: boolean;
    drafting_needed?: boolean;
    slab_smith_cust_needed?: boolean;
    slab_smith_ag_needed?: boolean;
    sct_needed?: boolean;
    final_programming_needed?: boolean;
}

export interface FabUpdate {
    fab_type?: string;
    sales_person_id?: number;
    stone_type_id?: number;
    stone_color_id?: number;
    stone_thickness_id?: number;
    edge_id?: number;
    input_area?: string;
    total_sqft?: number;
    notes?: string[];
    template_needed?: boolean;
    drafting_needed?: boolean;
    slab_smith_cust_needed?: boolean;
    slab_smith_ag_needed?: boolean;
    sct_needed?: boolean;
    final_programming_needed?: boolean;
}

export interface FabType {
    id: number;
    name: string;
    description?: string;
}

// Lookup Types
export interface Account {
    id: number;
    name: string;
    account_number?: string;
    description?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface AccountCreate {
    name: string;
    account_number?: string;
    description?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface StoneType {
    id: number;
    name: string;
    description?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface StoneTypeCreate {
    name: string;
    description?: string;
}

export interface StoneColor {
    id: number;
    name: string;
    color_code?: string;
    description?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface StoneColorCreate {
    name: string;
    color_code?: string;
    description?: string;
}

export interface StoneThickness {
    id: number;
    thickness: string;
    thickness_mm?: number;
    description?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface StoneThicknessCreate {
    thickness: string;
    thickness_mm?: number;
    description?: string;
}

export interface Edge {
    id: number;
    name: string;
    edge_type: string;
    description?: string;
    status_id: number;
    created_at: string;
    created_by: number;
    updated_at?: string;
    updated_by?: number;
}

export interface EdgeCreate {
    name: string;
    edge_type: string;
    description?: string;
}

export interface JobListParams {
    skip?: number;
    limit?: number;
    account_id?: number;
    status_id?: number;
    priority?: string;
    search?: string;
    schedule_start_date?: string;
    schedule_due_date?: string;
}

// Add this interface for jobs by account
export interface JobsByAccountParams {
    skip?: number;
    limit?: number;
    status_id?: number;
    priority?: string;
    search?: string;
    schedule_start_date?: string;
    schedule_due_date?: string;
}

export interface FabListParams {
    skip?: number;
    limit?: number;
    job_id?: number;
    fab_type?: string;
    sales_person_id?: number;
    status_id?: number;
    current_stage?: string;
    search?: string;
    schedule_start_date?: string;
    schedule_due_date?: string;
}

export interface TemplatingSchedule {
    fab_id: number;
    technician_id: number;
    schedule_start_date: string;
    schedule_due_date: string;
    total_sqft: string;
    notes?: string[];
    created_by?: number;
}

export interface AccountListParams {
    skip?: number;
    limit?: number;
    status_id?: number;
    search?: string;
}

export interface StoneTypeListParams {
    skip?: number;
    limit?: number;
    status_id?: number;
    search?: string;
}

export interface StoneColorListParams {
    skip?: number;
    limit?: number;
    status_id?: number;
    search?: string;
}

export interface StoneThicknessListParams {
    skip?: number;
    limit?: number;
    status_id?: number;
}

export interface EdgeListParams {
    skip?: number;
    limit?: number;
    status_id?: number;
    edge_type?: string;
    search?: string;
}

// Add Drafting Types
export interface Drafting {
    id: number;
    fab_id: number;
    drafter_id: number;
    drafter_name?: string;
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    status_id: number;
    status_name?: string;
    created_at: string;
    updated_at?: string;
    file_ids?: string | null;
}

export interface DraftingCreate {
    fab_id: number;
    drafter_id: number;
    scheduled_start_date: string;
    scheduled_end_date: string;
    total_sqft_required_to_draft: string;
}

export interface DraftingUpdate {
    scheduled_start_date?: string;
    scheduled_end_date?: string;
    status_id?: number;
}

export interface DraftingSubmitReview {
    file_ids: string;
    no_of_piece_drafted: number;
    total_sqft_drafted: string;
    draft_note: string;
    mentions: string;
    is_completed: boolean;
}

export interface Stage {
    id: number;
    name: string;
    description?: string;
    order_sequence: number;
    status_id: number;
    created_at: string;
    updated_at?: string;
}

// Add this interface for the stage statistics response
export interface StageStats {
    stage_name: string;
    stage_order: number | null;
    fab_count: number;
    last_10_fab_ids: number[];
    next_stage: string | null;
}

// Add this after other interfaces
export interface WorkflowStage {
    id: string;
    name: string;
    status: 'completed' | 'in-progress' | 'pending' | 'not-started';
    date?: string;
    assignedTo?: string;
    notes?: string;
    route?: string;
}

export const jobApi = createApi({
    reducerPath: "jobApi",
    baseQuery: axiosBaseQuery({ baseUrl: `${baseUrl}/api/v1` }),
    tagTypes: ["Job", "Fab", "FabType", "Account", "StoneType", "StoneColor", "StoneThickness", "Edge", "Drafting"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            // Jobs
            getJobs: build.query<Job[], JobListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/jobs",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.account_id !== undefined && { account_id: queryParams.account_id }),
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.priority && { priority: queryParams.priority }),
                            ...(queryParams.search && { search: queryParams.search }),
                            ...(queryParams.schedule_start_date && { schedule_start_date: queryParams.schedule_start_date }),
                            ...(queryParams.schedule_due_date && { schedule_due_date: queryParams.schedule_due_date }),
                        }
                    };
                },
                providesTags: ["Job"],
            }),

            // Add this new endpoint for getting jobs by account
            getJobsByAccount: build.query<Job[], { account_id: number; params?: JobsByAccountParams }>({
                query: ({ account_id, params }) => {
                    const queryParams = params || {};
                    return {
                        url: `/accounts/${account_id}/jobs`,
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.priority && { priority: queryParams.priority }),
                            ...(queryParams.search && { search: queryParams.search }),
                            ...(queryParams.schedule_start_date && { schedule_start_date: queryParams.schedule_start_date }),
                            ...(queryParams.schedule_due_date && { schedule_due_date: queryParams.schedule_due_date }),
                        }
                    };
                },
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Job"],
            }),
            
            getJobById: build.query<Job, number>({
                query: (id) => ({
                    url: `/jobs/${id}`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, id) => [{ type: "Job", id }],
            }),

            createJob: build.mutation<Job, JobCreate>({
                query: (data) => ({
                    url: "/jobs",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Job"],
            }),

            updateJob: build.mutation<Job, { id: number; data: JobUpdate }>({
                query: ({ id, data }) => ({
                    url: `/jobs/${id}`,
                    method: "put",
                    data
                }),
                invalidatesTags: (_result, _error, { id }) => [{ type: "Job", id }, "Job"],
            }),

            deleteJob: build.mutation<void, number>({
                query: (id) => ({
                    url: `/jobs/${id}`,
                    method: "delete"
                }),
                invalidatesTags: ["Job"],
            }),

            // Fabs
            getFabs: build.query<Fab[], FabListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/fabs",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.job_id !== undefined && { job_id: queryParams.job_id }),
                            ...(queryParams.fab_type && { fab_type: queryParams.fab_type }),
                            ...(queryParams.sales_person_id !== undefined && { sales_person_id: queryParams.sales_person_id }),
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.current_stage && { current_stage: queryParams.current_stage }),
                            ...(queryParams.search && { search: queryParams.search }),
                            ...(queryParams.schedule_start_date && { schedule_start_date: queryParams.schedule_start_date }),
                            ...(queryParams.schedule_due_date && { schedule_due_date: queryParams.schedule_due_date }),
                        }
                    };
                },
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Fab"],
            }),

            getFabById: build.query<Fab, number>({
                query: (id) => ({
                    url: `/fabs/${id}`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, id) => [{ type: "Fab", id }],
            }),

            getFabsByJob: build.query<Fab[], number>({
                query: (jobId) => ({
                    url: `/jobs/${jobId}/fabs`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Fab"],
            }),

            createFab: build.mutation<Fab, FabCreate>({
                query: (data) => ({
                    url: "/fabs",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Fab", "Job"],
            }),

            updateFab: build.mutation<Fab, { id: number; data: FabUpdate }>({
                query: ({ id, data }) => ({
                    url: `/fabs/${id}`,
                    method: "put",
                    data
                }),
                invalidatesTags: (_result, _error, { id }) => [{ type: "Fab", id }, "Fab"],
            }),

            deleteFab: build.mutation<void, number>({
                query: (id) => ({
                    url: `/fabs/${id}`,
                    method: "delete"
                }),
                invalidatesTags: ["Fab"],
            }),

            // Fab Types
            getFabTypes: build.query<FabType[], void>({
                query: () => ({
                    url: "/fab-types",
                    method: "get"
                }),
                providesTags: ["FabType"],
            }),

            // Accounts
            getAccounts: build.query<Account[], AccountListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/accounts",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.search && { search: queryParams.search }),
                        }
                    };
                },
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["Account"],
            }),

            getAccountById: build.query<Account, number>({
                query: (id) => ({
                    url: `/accounts/${id}`,
                    method: "get"
                }),
                providesTags: (_result, _error, id) => [{ type: "Account", id }],
            }),

            // Stone Types
            getStoneTypes: build.query<StoneType[], StoneTypeListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/stone-types",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.search && { search: queryParams.search }),
                        }
                    };
                },
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["StoneType"],
            }),

            // Stone Colors
            getStoneColors: build.query<StoneColor[], StoneColorListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/stone-colors",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.search && { search: queryParams.search }),
                        }
                    };
                    
                },
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["StoneColor"],
            }),

            // Stone Thickness
            getStoneThicknesses: build.query<StoneThickness[], StoneThicknessListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/stone-thickness",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                        }
                    };
                },
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["StoneThickness"],
            }),

            // Edges
            getEdges: build.query<Edge[], EdgeListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/edges",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.edge_type && { edge_type: queryParams.edge_type }),
                            ...(queryParams.search && { search: queryParams.search }),
                        }
                    };
                },
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["Edge"],
            }),

            // Templating
            getTemplatingByFabId: build.query<any, number>({
                query: (fab_id) => ({
                    url: `/templating/fab/${fab_id}`,
                    method: "get"
                }),
                providesTags: ["Fab"],
            }),

            scheduleTemplating: build.mutation<any, TemplatingSchedule>({
                query: (data) => ({
                    url: "/templating/schedule",
                    method: "post",
                    data // Send as request body instead of params
                }),
                invalidatesTags: ["Fab"],
            }),

            updateTemplating: build.mutation<any, { templating_id: number; notes?: string[] }>({
                query: ({ templating_id, ...data }) => ({
                    url: `/templating/${templating_id}`,
                    method: "put",
                    data // Send as request body
                }),
                invalidatesTags: ["Fab"],
            }),

            completeTemplating: build.mutation<any, { templating_id: number; actual_sqft?: string; notes?: string[] }>({
                query: ({ templating_id, actual_sqft, notes }) => ({
                    url: `/templating/${templating_id}/complete`,
                    method: "post",
                    data: {
                        actual_sqft: actual_sqft || "",
                        notes: notes || []
                    }
                }),
                invalidatesTags: ["Fab"],
            }),

            markTemplatingReceived: build.mutation<any, { templating_id: number }>({
                query: ({ templating_id }) => ({
                    url: `/templating/${templating_id}/mark-received`,
                    method: "post"
                }),
                invalidatesTags: ["Fab"],
            }),

            unscheduleTemplating: build.mutation<any, { templating_id: number }>({
                query: ({ templating_id }) => ({
                    url: `/templating/${templating_id}/unschedule`,
                    method: "put"
                }),
                invalidatesTags: ["Fab"],
            }),

            // Jobs with Fabs
            getJobsWithFabs: build.query<any, { search?: string; account_id?: number } | void>({
                query: (params) => ({
                    url: "/jobs-with-fabs",
                    method: "get",
                    params: params || {}
                }),
                providesTags: ["Job", "Fab"],
            }),

            // Create Account
            createAccount: build.mutation<Account, AccountCreate>({
                query: (data) => ({
                    url: "/accounts",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Account"],
            }),

            // Create Stone Type
            createStoneType: build.mutation<StoneType, StoneTypeCreate>({
                query: (data) => ({
                    url: "/stone-types",
                    method: "post",
                    data
                }),
                invalidatesTags: ["StoneType"],
            }),

            // Create Stone Color
            createStoneColor: build.mutation<StoneColor, StoneColorCreate>({
                query: (data) => ({
                    url: "/stone-colors",
                    method: "post",
                    data
                }),
                invalidatesTags: ["StoneColor"],
            }),

            // Create Stone Thickness
            createStoneThickness: build.mutation<StoneThickness, StoneThicknessCreate>({
                query: (data) => ({
                    url: "/stone-thickness",
                    method: "post",
                    data
                }),
                invalidatesTags: ["StoneThickness"],
            }),

            // Create Edge
            createEdge: build.mutation<Edge, EdgeCreate>({
                query: (data) => ({
                    url: "/edges",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Edge"],
            }),

            // Drafting endpoints
            // Create drafting assignment
            createDrafting: build.mutation<Drafting, DraftingCreate>({
                query: (data) => ({
                    url: "/drafting",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Fab"],
            }),

            // Get drafting by ID
            getDraftingById: build.query<Drafting, number>({
                query: (id) => ({
                    url: `/drafting/${id}`,
                    method: "get"
                }),
                providesTags: (_result, _error, id) => [{ type: "Drafting", id }],
            }),

            // Get drafting by FAB ID
            getDraftingByFabId: build.query<Drafting, number>({
                query: (fab_id) => ({
                    url: `/drafting/fab/${fab_id}`,
                    method: "get"
                }),
                providesTags: ["Drafting"],
            }),

            // Update drafting
            updateDrafting: build.mutation<Drafting, { id: number; data: DraftingUpdate }>({
                query: ({ id, data }) => ({
                    url: `/drafting/${id}`,
                    method: "put",
                    data
                }),
                invalidatesTags: (_result, _error, { id }) => [{ type: "Drafting", id }, "Drafting"],
            }),

            // Submit drafting for review
            submitDraftingForReview: build.mutation<any, { drafting_id: number; data: DraftingSubmitReview }>({
                query: ({ drafting_id, data }) => ({
                    url: `/drafting/${drafting_id}/submit-review`,
                    method: "post",
                    data
                }),
                invalidatesTags: ["Fab", "Drafting"],
            }),

            // Add files to drafting
            addFilesToDrafting: build.mutation<any, { drafting_id: number; files: File[] }>({
                query: ({ drafting_id, files }) => {
                    const formData = new FormData();
                    files.forEach((file) => {
                        formData.append('files', file); // Changed from 'file' to 'files'
                    });
                    return {
                        url: `/drafting/${drafting_id}/files`,
                        method: "post",
                        data: formData,
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    };
                },
                invalidatesTags: ["Drafting"],
            }),

            // Delete file from drafting
            deleteFileFromDrafting: build.mutation<any, { drafting_id: number; file_id: string }>({
                query: ({ drafting_id, file_id }) => ({
                    url: `/drafting/${drafting_id}/files/${file_id}`,
                    method: "delete"
                }),
                invalidatesTags: ["Drafting"],
            }),

            // Update the endpoint for getting stages with statistics
            getStages: build.query<StageStats[], void>({
                query: () => ({
                    url: "/stages",
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Job"],
            }),
            
        };
    },
});

export const {
    useGetJobsQuery,
    useGetJobsByAccountQuery, // Export the new hook
    useGetJobByIdQuery,
    useCreateJobMutation,
    useUpdateJobMutation,
    useDeleteJobMutation,
    useGetFabsQuery,
    useGetFabByIdQuery,
    useGetFabsByJobQuery,
    useCreateFabMutation,
    useUpdateFabMutation,
    useDeleteFabMutation,
    useGetFabTypesQuery,
    useGetAccountsQuery,
    useGetAccountByIdQuery,
    useGetStoneTypesQuery,
    useGetStoneColorsQuery,
    useGetStoneThicknessesQuery,
    useGetEdgesQuery,
    useScheduleTemplatingMutation,
    useCompleteTemplatingMutation,
    useMarkTemplatingReceivedMutation,
    useUnscheduleTemplatingMutation,
    useGetTemplatingByFabIdQuery,
    useGetJobsWithFabsQuery,
    useUpdateTemplatingMutation,
    // New mutation hooks
    useCreateAccountMutation,
    useCreateStoneTypeMutation,
    useCreateStoneColorMutation,
    useCreateStoneThicknessMutation,
    useCreateEdgeMutation,
    useCreateDraftingMutation,
    useGetDraftingByIdQuery,
    useGetDraftingByFabIdQuery,
    useUpdateDraftingMutation,
    useSubmitDraftingForReviewMutation,
    useAddFilesToDraftingMutation,
    useDeleteFileFromDraftingMutation,
    useGetStagesQuery,
} = jobApi;
