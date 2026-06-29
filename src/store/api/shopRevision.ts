/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

export interface ShopRevision {
  id: number;
  fab_id: number;
  revision_note: string;
  revision_feedback?: string;
  requested_by: number;
  requested_by_name?: string;
  assigned_to: number;
  assigned_to_name?: string;
  revision_completed: boolean;
  completed_at?: string;
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
  created_at?: string;
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
  tagTypes: ["ShopRevision", "Task", "Fab"],
  endpoints: (builder) => ({
    createShopRevision: builder.mutation<ShopRevisionSuccessResponse<ShopRevision>, CreateShopRevisionPayload>({
      query: (data) => ({
        url: "/api/v1/shop-revisions",
        method: "POST",
        data,
      }),
      invalidatesTags: (_result, _error, { fab_id }) => [
        "ShopRevision",
        "Fab",                       // invalidates getFabs (string tag)
        { type: "Fab", id: fab_id }, // invalidates getFabById (object tag)
        "Task",                      // invalidates operator tasks
      ],
    }),
    completeShopRevision: builder.mutation<ShopRevisionSuccessResponse<ShopRevision>, { revision_id: number; revision_feedback?: string }>({
      query: ({ revision_id, revision_feedback }) => ({
        url: `/api/v1/shop-revisions/${revision_id}/complete`,
        method: "PATCH",
        data: { revision_feedback },
      }),
      invalidatesTags: (_result, _error, { revision_id }) => [
        "ShopRevision",
        "Fab",
        "Task",
        // If we have fab_id in the payload or can fetch it, add { type: "Fab", id: fab_id } as well
      ],
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

    // In your shopRevision API slice (e.g., store/api/shopRevision.ts)
    addFilesToShopRevision: builder.mutation<any, {
      revision_id?: number;
      id?: number;
      entityId?: number;
      files: File[];
      stage_name?: string;
      file_design?: string;
    }>({
      query: ({ revision_id, id, entityId, files, stage_name, file_design }) => {
        // Use the ID from multiple possible keys
        const revisionId = revision_id ?? id ?? entityId;
        if (!revisionId) {
          throw new Error('No revision ID provided');
        }
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        if (stage_name) formData.append('stage_name', stage_name);
        if (file_design) formData.append('file_design', file_design);
        return {
          url: `/api/v1/shop-revisions/${revisionId}/files`, 
          method: 'POST',
          data: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        };
      },
      invalidatesTags: ['ShopRevision'],
    }),
    getShopRevisionCount: builder.query<number, void>({
      query: () => ({
        url: "/api/v1/shop-revisions/count",
        method: "GET",
      }),
      transformResponse: (response: any) => {
        if (typeof response === 'number') return response;
        if (typeof response?.data === 'number') return response.data;
        if (typeof response?.data?.count === 'number') return response.data.count;
        if (typeof response?.count === 'number') return response.count;
        return 0;
      },
      providesTags: ["ShopRevision"],
    }),


  }),
});

export const {
  useCreateShopRevisionMutation,
  useGetShopRevisionFabsQuery,
  useGetShopRevisionsByFabIdQuery,
  useGetShopRevisionCountQuery,
  useCompleteShopRevisionMutation,
  useAddFilesToShopRevisionMutation,
} = shopRevisionApi;
