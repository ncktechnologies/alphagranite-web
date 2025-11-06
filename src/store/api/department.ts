/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";

// Department Types
export interface Department {
    id: number;
    name: string;
    description?: string;
    status?: number;
    total_members?: number;
    sample_members?: UserSample[];
    created_at?: string;
    updated_at?: string;
}

export interface UserSample {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_id?: string;
}

export interface DepartmentUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    gender?: string;
    profile_image_id?: string;
    created_at?: string;
    home_address?: string;
    role?: string;
    status?: number;
}

export interface DepartmentCreate {
    name: string;
    description?: string;
}

export interface DepartmentUpdate {
    name?: string;
    description?: string;
}

export interface DepartmentStatusChange {
    status: number;
}

export interface DepartmentListParams {
    page?: number;
    size?: number;
    status?: number;
}

export interface DepartmentUsersParams {
    page?: number;
    size?: number;
    search?: string;
    gender?: string;
    sort_by?: string;
    sort_order?: string;
}

export interface DepartmentListResponse {
    items: Department[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface DepartmentDetailsResponse {
    id: number;
    name: string;
    description?: string;
    status?: number;
    users: DepartmentUser[];
}

export interface DepartmentUsersResponse {
    department: {
        id: number;
        name: string;
        description?: string;
    };
    users: DepartmentUser[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export const departmentApi = createApi({
    reducerPath: "departmentApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Department", "DepartmentUsers"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            // Get all departments with pagination
            getDepartments: build.query<DepartmentListResponse, DepartmentListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/departments", 
                        method: "get",
                        params: {
                            page: queryParams.page || 1,
                            size: queryParams.size || 10,
                            ...(queryParams.status !== undefined && { status: queryParams.status })
                        }
                    };
                },
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Department"],
            }),

            // Get single department by ID with all users
            getDepartmentById: build.query<DepartmentDetailsResponse, number>({
                query: (id) => ({ 
                    url: `/departments/${id}`, 
                    method: "get" 
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, id) => [
                    { type: "Department", id },
                    { type: "DepartmentUsers", id }
                ],
            }),

            // Create new department
            createDepartment: build.mutation<Department, DepartmentCreate>({
                query: (data) => ({ 
                    url: "/departments", 
                    method: "post", 
                    data 
                }),
                invalidatesTags: ["Department"],
            }),

            // Update department
            updateDepartment: build.mutation<Department, { id: number; data: DepartmentUpdate }>({
                query: ({ id, data }) => ({ 
                    url: `/departments/${id}`, 
                    method: "put", 
                    data 
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Department", id },
                    "Department",
                ],
            }),

            // Delete department (soft delete)
            deleteDepartment: build.mutation<void, number>({
                query: (id) => ({ 
                    url: `/departments/${id}`, 
                    method: "delete" 
                }),
                invalidatesTags: ["Department"],
            }),

            // Change department status
            changeDepartmentStatus: build.mutation<Department, { id: number; status: number }>({
                query: ({ id, status }) => ({ 
                    url: `/departments/${id}/status`, 
                    method: "patch", 
                    data: { status } 
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Department", id },
                    "Department",
                ],
            }),

            // Get department users with pagination and filters
            getDepartmentUsers: build.query<DepartmentUsersResponse, { id: number; params?: DepartmentUsersParams }>({
                query: ({ id, params = {} }) => ({ 
                    url: `/departments/${id}/users`, 
                    method: "get",
                    params: {
                        page: params.page || 1,
                        size: params.size || 10,
                        ...(params.search && { search: params.search }),
                        ...(params.gender && { gender: params.gender }),
                        ...(params.sort_by && { sort_by: params.sort_by }),
                        ...(params.sort_order && { sort_order: params.sort_order })
                    }
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, { id }) => [{ type: "DepartmentUsers", id }],
            }),
        };
    },
});

export const {
    useGetDepartmentsQuery,
    useLazyGetDepartmentsQuery,
    useGetDepartmentByIdQuery,
    useLazyGetDepartmentByIdQuery,
    useCreateDepartmentMutation,
    useUpdateDepartmentMutation,
    useDeleteDepartmentMutation,
    useChangeDepartmentStatusMutation,
    useGetDepartmentUsersQuery,
    useLazyGetDepartmentUsersQuery,
} = departmentApi;
