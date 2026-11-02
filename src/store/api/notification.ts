import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

export interface AppNotification {
    id: number;
    event: string;
    title: string;
    message: string;
    fab_id: number | null;
    job_id: number | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string | null;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const notificationApi = createApi({
    reducerPath: "notificationApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Notification"],
    endpoints: (builder) => ({
        getNotifications: builder.query<ApiResponse<{ items: AppNotification[]; total: number }>, { status: 'unread' | 'all'; limit?: number }>({
            query: ({ status, limit = 50 }) => ({
                url: "/api/v1/notifications",
                method: "GET",
                params: { status, limit },
            }),
            providesTags: ["Notification"],
        }),
        getUnreadNotificationCount: builder.query<ApiResponse<{ count: number }>, void>({
            query: () => ({ url: "/api/v1/notifications/unread-count", method: "GET" }),
            providesTags: ["Notification"],
        }),
        markNotificationRead: builder.mutation<ApiResponse<AppNotification>, number>({
            query: (id) => ({ url: `/api/v1/notifications/${id}/read`, method: "PATCH" }),
            invalidatesTags: ["Notification"],
        }),
        markAllNotificationsRead: builder.mutation<ApiResponse<{ updated: number }>, void>({
            query: () => ({ url: "/api/v1/notifications/read-all", method: "POST" }),
            invalidatesTags: ["Notification"],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useGetUnreadNotificationCountQuery,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
} = notificationApi;
