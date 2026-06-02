/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

export interface ShopRevision {
  id: number;
  fab_id: number;
  revision_note: string;
  requested_by: number;
  assigned_to: number;
  revision_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShopRevisionFabSummary {
  fab_id: number;
  job_id?: number;
  fab_type?: string;
  current_stage?: string;
  status_id?: number;
  account_name?: string;
  job_name?: string;
  job_number?: string;
  revision_count?: number;
  pending_revision_count?: number;
  has_pending_shop_revision?: boolean;
  latest_revision_note?: string;
  latest_revision_created_at?: string;
  latest_pending_revision?: ShopRevision | null;
}

export interface CreateShopRevisionPayload {
  fab_id: number;
  revision_note: string;
  requested_by: number;
  assigned_to: number;
  revision_completed?: boolean;
}

export interface ShopRevisionSuccessResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export const shopRevisionApi = createApi({
  reducerPath: "shopRevisionApi",
  baseQuery: axiosBaseQuery({ baseUrl }),
  tagTypes: ["ShopRevision"],
  endpoints: (builder) => ({
    createShopRevision: builder.mutation<ShopRevisionSuccessResponse<ShopRevision>, CreateShopRevisionPayload>({
      query: (data) => ({
        url: "/api/v1/shop-revisions",
        method: "POST",
        data,
      }),
      invalidatesTags: ["ShopRevision"],
    }),

    getShopRevisionFabs: builder.query<ShopRevisionFabSummary[], void>({
      query: () => ({
        url: "/api/v1/shop-revisions/fabs",
        method: "GET",
      }),
      transformResponse: (response: any) => response?.data ?? response ?? [],
      providesTags: ["ShopRevision"],
    }),

    getShopRevisionsByFabId: builder.query<ShopRevision[], number>({
      query: (fab_id) => ({
        url: `/api/v1/shop-revisions/fab/${fab_id}`,
        method: "GET",
      }),
      transformResponse: (response: any) => response?.data ?? response ?? [],
      providesTags: (_result, _error, fab_id) => [{ type: "ShopRevision", id: fab_id }],
    }),

    completeShopRevision: builder.mutation<ShopRevisionSuccessResponse<ShopRevision>, number>({
      query: (revision_id) => ({
        url: `/api/v1/shop-revisions/${revision_id}/complete`,
        method: "PATCH",
      }),
      invalidatesTags: ["ShopRevision"],
    }),
  }),
});

export const {
  useCreateShopRevisionMutation,
  useGetShopRevisionFabsQuery,
  useGetShopRevisionsByFabIdQuery,
  useCompleteShopRevisionMutation,
} = shopRevisionApi;
