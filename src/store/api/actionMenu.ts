/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";

// Action Menu Types
export interface ActionMenu {
    id: number;
    name: string;
    code: string;
    created_at?: string;
    updated_at?: string;
}

export interface ActionMenuCreate {
    name: string;
    code: string;
}

export interface ActionMenuUpdate {
    name?: string;
    code?: string;
}

export interface Permission {
    id: number;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PermissionCreate {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
}

export interface PermissionUpdate {
    can_create?: boolean;
    can_read?: boolean;
    can_update?: boolean;
    can_delete?: boolean;
}

export const actionMenuApi = createApi({
    reducerPath: "actionMenuApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["ActionMenu", "Permission"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            // Get all action menus
            getAllActionMenus: build.query<ActionMenu[], void>({
                query: () => ({
                    url: "/action-menus",
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: ["ActionMenu"],
            }),

            // Get single action menu by ID
            getActionMenuById: build.query<ActionMenu, number>({
                query: (id) => ({
                    url: `/action-menus/${id}`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, id) => [{ type: "ActionMenu", id }],
            }),

            // Create new action menu
            createActionMenu: build.mutation<ActionMenu, ActionMenuCreate>({
                query: (data) => ({
                    url: "/action-menus",
                    method: "post",
                    data
                }),
                invalidatesTags: ["ActionMenu"],
            }),

            // Update action menu
            updateActionMenu: build.mutation<ActionMenu, { id: number; data: ActionMenuUpdate }>({
                query: ({ id, data }) => ({
                    url: `/action-menus/${id}`,
                    method: "put",
                    data
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "ActionMenu", id },
                    "ActionMenu",
                ],
            }),

            // Delete action menu
            deleteActionMenu: build.mutation<void, number>({
                query: (id) => ({
                    url: `/action-menus/${id}`,
                    method: "delete"
                }),
                invalidatesTags: ["ActionMenu"],
            }),

            // Get all permissions
            getAllPermissions: build.query<Permission[], void>({
                query: () => ({
                    url: "/permissions",
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Permission"],
            }),

            // Create permission
            createPermission: build.mutation<Permission, PermissionCreate>({
                query: (data) => ({
                    url: "/permissions",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Permission"],
            }),
        };
    },
});

export const {
    useGetAllActionMenusQuery,
    useLazyGetAllActionMenusQuery,
    useGetActionMenuByIdQuery,
    useLazyGetActionMenuByIdQuery,
    useCreateActionMenuMutation,
    useUpdateActionMenuMutation,
    useDeleteActionMenuMutation,
    useGetAllPermissionsQuery,
    useLazyGetAllPermissionsQuery,
    useCreatePermissionMutation,
} = actionMenuApi;
