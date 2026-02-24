/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

// const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";
const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

// Shop Cut Planning Types based on API documentation
export interface ShopCutPlan {
  id: number;
  fab_id: number;
  total_estimated_hours: number;
  color_theme?: string;
  status_id: number;
  created_at: string;
  updated_at?: string;
  stages: ShopCutPlanStage[];
}

export interface ShopCutPlanStage {
  id: number;
  shop_cut_plan_id: number;
  workstation_id: number;
  planning_section_id: number;
  operator_ids: number[];
  estimated_hours: number;
  notes?: string[];
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  status_id: number;
  created_at: string;
  updated_at?: string;
}

export interface ShopCutPlanCreate {
  fab_id: number;
  total_estimated_hours: number;
  color_theme?: string;
  status_id?: number;
  stages: ShopCutPlanStageCreate[];
}

export interface ShopCutPlanStageCreate {
  workstation_id: number;
  planning_section_id: number;
  operator_ids: number[];
  estimated_hours: number;
  notes?: string[];
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface ShopCutPlanUpdate {
  color_theme?: string;
  status_id?: number;
  stage: ShopCutPlanStageCreate;
}

export interface ShopCutPlanListParams {
  fab_id?: number;
  month?: number;
  year?: number;
  skip?: number;
  limit?: number;
  search?: string;
}

export interface ShopCutPlanListResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    page: number;
    per_page: number;
    month: number;
    year: number;
    plans: ShopCutPlanListItem[];
    grouped_plans: GroupedShopPlan[];
  };
}

export interface ShopCutPlanListItem {
  id: number;
  fab_id: number;
  workstation_id: number;
  planning_section_id: number;
  operator_id: number;
  estimated_hours: number;
  scheduled_start_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  work_percentage: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface GroupedShopPlan {
  date: string;
  label: string;
  plans: ShopCutPlanListItem[];
}

export interface ShopCutPlanSuccessResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export const shopCutPlanningApi = createApi({
  reducerPath: "shopCutPlanningApi",
  baseQuery: axiosBaseQuery({ baseUrl }),
  tagTypes: ["ShopCutPlan"],
  keepUnusedDataFor: 0,
  endpoints(build) {
    return {
      // Create shop cut plans
      createShopPlans: build.mutation<ShopCutPlanSuccessResponse<ShopCutPlan[]>, ShopCutPlanCreate>({
        query: (data) => ({
          url: "/api/v1/shop/plans",
          method: "post",
          data: data,
        }),
        invalidatesTags: ["ShopCutPlan"],
      }),

      // Get all shop plans
      getAllShopPlans: build.query<ShopCutPlanListResponse, ShopCutPlanListParams | void>({
        query: (params) => {
          const queryParams = params || {};
          return {
            url: "/api/v1/shop/plans",
            method: "get",
            params: {
              ...(queryParams.fab_id !== undefined && { fab_id: queryParams.fab_id }),
              ...(queryParams.month !== undefined && { month: queryParams.month }),
              ...(queryParams.year !== undefined && { year: queryParams.year }),
              ...(queryParams.skip !== undefined && { skip: queryParams.skip }),
              ...(queryParams.limit !== undefined && { limit: queryParams.limit }),
              ...(queryParams.search && { search: queryParams.search }),
            }
          };
        },
        transformResponse: (response: any) => response.data || response,
        providesTags: ["ShopCutPlan"],
      }),

      // Get shop plans by FAB ID
      getShopPlansByFabId: build.query<ShopCutPlan[], number>({
        query: (fab_id) => ({
          url: `/api/v1/shop/plans/fab/${fab_id}`,
          method: "get"
        }),
        transformResponse: (response: any) => response.data || response,
        providesTags: (_result, _error, fab_id) => [{ type: "ShopCutPlan", id: fab_id }],
      }),

      // Get single shop plan by ID
      getShopPlan: build.query<ShopCutPlan, number>({
        query: (plan_id) => ({
          url: `/api/v1/shop/plans/${plan_id}`,
          method: "get"
        }),
        transformResponse: (response: any) => response.data || response,
        providesTags: (_result, _error, plan_id) => [{ type: "ShopCutPlan", id: plan_id }],
      }),

      // Update shop plan
      updateShopPlan: build.mutation<ShopCutPlanSuccessResponse<ShopCutPlan>, { plan_id: number; data: ShopCutPlanUpdate }>({
        query: ({ plan_id, data }) => ({
          url: `/api/v1/shop/plans/${plan_id}`,
          method: "put",
          data,
        }),
        invalidatesTags: (_result, _error, { plan_id }) => [
          { type: "ShopCutPlan", id: plan_id },
          "ShopCutPlan",
        ],
      }),

      // Delete shop plan
      deleteShopPlan: build.mutation<ShopCutPlanSuccessResponse<void>, number>({
        query: (plan_id) => ({
          url: `/api/v1/shop/plans/${plan_id}`,
          method: "delete"
        }),
        invalidatesTags: ["ShopCutPlan"],
      }),

      // Unschedule shop plan
      unscheduleShopPlan: build.mutation<ShopCutPlanSuccessResponse<void>, number>({
        query: (plan_id) => ({
          url: `/api/v1/shop/plans/${plan_id}/unschedule`,
          method: "put"
        }),
        invalidatesTags: (_result, _error, plan_id) => [
          { type: "ShopCutPlan", id: plan_id },
          "ShopCutPlan",
        ],
      }),

      // Reschedule shop plan
      rescheduleShopPlan: build.mutation<ShopCutPlanSuccessResponse<void>, { plan_id: number; data: any }>({
        query: ({ plan_id, data }) => ({
          url: `/api/v1/shop/plans/${plan_id}/reschedule`,
          method: "put",
          data
        }),
        invalidatesTags: (_result, _error, { plan_id }) => [
          { type: "ShopCutPlan", id: plan_id },
          "ShopCutPlan",
        ],
      }),
    };
  },
});

export const {
  useCreateShopPlansMutation,
  useGetAllShopPlansQuery,
  useLazyGetAllShopPlansQuery,
  useGetShopPlansByFabIdQuery,
  useLazyGetShopPlansByFabIdQuery,
  useGetShopPlanQuery,
  useLazyGetShopPlanQuery,
  useUpdateShopPlanMutation,
  useDeleteShopPlanMutation,
  useUnscheduleShopPlanMutation,
  useRescheduleShopPlanMutation,
} = shopCutPlanningApi;