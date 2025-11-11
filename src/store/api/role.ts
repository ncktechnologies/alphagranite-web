/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";

// Role Types
export interface Role {
    id: number;
    name: string;
    description?: string;
    status?: number;
    created_at?: string;
    updated_at?: string;
    total_members?: number;
    active_members?: number;
    inactive_members?: number;
    pending_members?: number;
    permissions?: RolePermission[];
    members?: RoleMember[];
}

export interface RolePermission {
    action_menu_id: number;
    action_menu_name?: string;
    action_menu_code?: string;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
}

export interface RoleMember {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    status?: number;
    status_name?: string;
    profile_image_id?: number;
    invited_at?: string;
    last_login?: string;
}

export interface ActionMenuPermission {
    action_menu_id: number;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
}

export interface RoleCreate {
    name: string;
    description?: string;
    action_menu_permissions: ActionMenuPermission[];
    user_ids?: number[];
    status?: number;
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    action_menu_permissions?: ActionMenuPermission[];
    user_ids?: number[];
    status?: number;
}

export interface RoleListParams {
    skip?: number;
    limit?: number;
    search?: string;
    status_id?: number;
    sort_by?: string;
    sort_order?: string;
    with_stats?: boolean;
}

export interface RoleDetailsParams {
    with_permissions?: boolean;
    with_members?: boolean;
    skip?: number;
    limit?: number;
    search?: string;
    status_id?: number;
    sort_by?: string;
    sort_order?: string;
}

export interface RoleListResponse {
    items: Role[];
    total: number;
    skip: number;
    limit: number;
}

export const roleApi = createApi({
    reducerPath: "roleApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Role", "RoleMembers"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            // Get all roles with pagination and filters
            getRoles: build.query<RoleListResponse, RoleListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/roles",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.search && { search: queryParams.search }),
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.sort_by && { sort_by: queryParams.sort_by }),
                            ...(queryParams.sort_order && { sort_order: queryParams.sort_order }),
                            ...(queryParams.with_stats !== undefined && { with_stats: queryParams.with_stats }),
                        }
                    };
                },
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Role"],
            }),

            // Get single role by ID with permissions and members
            getRoleById: build.query<Role, { id: number; params?: RoleDetailsParams }>({
                query: ({ id, params = {} }) => ({
                    url: `/roles/${id}`,
                    method: "get",
                    params: {
                        with_permissions: params.with_permissions !== undefined ? params.with_permissions : true,
                        with_members: params.with_members !== undefined ? params.with_members : true,
                        ...(params.skip !== undefined && { skip: params.skip }),
                        ...(params.limit !== undefined && { limit: params.limit }),
                        ...(params.search && { search: params.search }),
                        ...(params.status_id !== undefined && { status_id: params.status_id }),
                        ...(params.sort_by && { sort_by: params.sort_by }),
                        ...(params.sort_order && { sort_order: params.sort_order }),
                    }
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, { id }) => [
                    { type: "Role", id },
                    { type: "RoleMembers", id }
                ],
            }),

            // Create new role
            createRole: build.mutation<Role, RoleCreate>({
                query: (data) => ({
                    url: "/roles",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Role"],
            }),

            // Update role
            updateRole: build.mutation<Role, { id: number; data: RoleUpdate }>({
                query: ({ id, data }) => ({
                    url: `/roles/${id}`,
                    method: "put",
                    data
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Role", id },
                    "Role",
                ],
            }),

            // Delete role
            deleteRole: build.mutation<void, number>({
                query: (id) => ({
                    url: `/roles/${id}`,
                    method: "delete"
                }),
                invalidatesTags: ["Role"],
            }),

            // Debug role members (for debugging purposes)
            debugRoleMembers: build.query<any, number>({
                query: (roleId) => ({
                    url: `/roles/${roleId}/debug-members`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
            }),
        };
    },
});

export const {
    useGetRolesQuery,
    useLazyGetRolesQuery,
    useGetRoleByIdQuery,
    useLazyGetRoleByIdQuery,
    useCreateRoleMutation,
    useUpdateRoleMutation,
    useDeleteRoleMutation,
    useDebugRoleMembersQuery,
    useLazyDebugRoleMembersQuery,
} = roleApi;
