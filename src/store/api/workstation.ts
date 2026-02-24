/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

// const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";
const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

// Workstation Types based on API documentation
export interface Workstation {
  id: number;
  name: string;
  status_id: number;
  created_by: number;
  created_at: string;
  curremt_stage: string; // equivalent to the table name of the process e.g templatings
  planning_section_id?: number;
  workstation_name?: string;
  status?: string;
  assigned_operatives?: string;
  machines?: string;
  machine_statuses?: string;
}

export interface WorkstationCreatePayload {
  planning_section_id: number;
  workstation_name: string;
  status: string;
  assigned_operatives: string;
  machines: string;
  machine_statuses: string;
}

export interface WorkstationUpdatePayload {
  planning_section_id: number;
  workstation_name: string;
  status: string;
  assigned_operatives: string;
  machines: string;
  machine_statuses: string;
}

export interface WorkstationListParams {
  skip?: number;
  limit?: number;
  search?: string;
  planning_section_id?: number;
  workstation_id?: number;
  operator_id?: number;
}

export interface WorkstationListResponse {
  data: Workstation[];
  total: number;
  skip: number;
  limit: number;
}

export interface PlanningSection {
  id: number;
  name: string;
  description?: string;
}

export interface SuccessResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export const workstationApi = createApi({
  reducerPath: "workstationApi",
  baseQuery: axiosBaseQuery({ baseUrl }),
  tagTypes: ["Workstation"],
  keepUnusedDataFor: 0,
  endpoints(build) {
    return {
      // Get all workstations
      getWorkstations: build.query<WorkstationListResponse, WorkstationListParams | void>({
        query: (params) => {
          const queryParams = params || {};
          return {
            url: "/api/v1/workstation",
            method: "get",
            params: {
              skip: queryParams.skip || 0,
              limit: queryParams.limit || 100,
              ...(queryParams.search && { search: queryParams.search }),
              ...(queryParams.planning_section_id !== undefined && { planning_section_id: queryParams.planning_section_id }),
              ...(queryParams.workstation_id !== undefined && { workstation_id: queryParams.workstation_id }),
              ...(queryParams.operator_id !== undefined && { operator_id: queryParams.operator_id }),
            }
          };
        },
        transformResponse: (response: any) => response.data || response,
        providesTags: ["Workstation"],
      }),

      // Get active workstations
      getActiveWorkstations: build.query<Workstation[], WorkstationListParams | void>({
        query: (params) => {
          const queryParams = params || {};
          return {
            url: "/api/v1/workstation/active",
            method: "get",
            params: {
              ...(queryParams.planning_section_id !== undefined && { planning_section_id: queryParams.planning_section_id }),
              ...(queryParams.workstation_id !== undefined && { workstation_id: queryParams.workstation_id }),
              ...(queryParams.operator_id !== undefined && { operator_id: queryParams.operator_id }),
            }
          };
        },
        transformResponse: (response: any) => response.data || response,
        providesTags: ["Workstation"],
      }),

      // Get single workstation by ID
      getWorkstationById: build.query<Workstation, number>({
        query: (id) => ({
          url: `/api/v1/workstation/${id}`,
          method: "get"
        }),
        transformResponse: (response: any) => response.data || response,
        providesTags: (_result, _error, id) => [{ type: "Workstation", id }],
      }),

      // Create new workstation
      createWorkstation: build.mutation<SuccessResponse<Workstation>, WorkstationCreatePayload>({
        query: (data) => ({
          url: "/api/v1/workstation",
          method: "post",
          data: data,
        }),
        invalidatesTags: ["Workstation"],
      }),

      // Update workstation
      updateWorkstation: build.mutation<SuccessResponse<Workstation>, { id: number; data: WorkstationUpdatePayload }>({
        query: ({ id, data }) => ({
          url: `/api/v1/workstation/${id}`,
          method: "put",
          data,
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "Workstation", id },
          "Workstation",
        ],
      }),

      // Delete workstation
      deleteWorkstation: build.mutation<SuccessResponse<void>, number>({
        query: (id) => ({
          url: `/api/v1/workstation/${id}`,
          method: "delete"
        }),
        invalidatesTags: ["Workstation"],
      }),

      // Get planning sections (for workstation assignment)
      getPlanningSections: build.query<PlanningSection[], void>({
        query: () => ({
          url: "/api/v1/planning-section/active",
          method: "get",
        }),
        transformResponse: (response: any) => response.data || response,
        providesTags: ["Workstation"],
      }),
    };
  },
});

export const {
  useGetWorkstationsQuery,
  useLazyGetWorkstationsQuery,
  useGetActiveWorkstationsQuery,
  useLazyGetActiveWorkstationsQuery,
  useGetWorkstationByIdQuery,
  useLazyGetWorkstationByIdQuery,
  useCreateWorkstationMutation,
  useUpdateWorkstationMutation,
  useDeleteWorkstationMutation,
  useGetPlanningSectionsQuery,
} = workstationApi;