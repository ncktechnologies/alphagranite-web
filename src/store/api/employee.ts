/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

// const baseUrl = "https://alpha-granite.xyz-ntrinsic.com";
const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`

// Employee Types
export interface Employee {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
    username?: string;
    phone?: string;
    gender?: string;
    profile_image_id?: number;
    department_id?: number;
    role_id?: number;
    status_id?: number;
    home_address?: string;
    created_at?: string;
    updated_at?: string;
    name?: string;
    department?: number;
    role?: {
        id: number;
        name: string;
    };
    status?: {
        id: number;
        name: string;
    };
    department_name?: string;
    status_name?: string;
    role_name?: string;
    profile_image_url?: string;
}

export interface EmployeeCreatePayload {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    gender?: string;
    department: number;
    role_id?: number;
    home_address?: string;
    profile_image?: File;
}

export interface EmployeeStatusUpdate {
    status: number;
}

export interface EmployeeActivateToggle {
    active: boolean;
}

export interface BulkEmployeeActivateRequest {
    employee_ids: number[];
    active: boolean;
}

export interface EmployeeListParams {
    skip?: number;
    limit?: number;
    search?: string;
    department_id?: number;
    status_id?: number;
    role_id?: number;
    email?: string;
    phone?: string;
    sort_by?: string;
    sort_order?: string;
}

export interface EmployeeListResponse {
    data: Employee[];
    total: number;
    skip: number;
    limit: number;
}

export const employeeApi = createApi({
    reducerPath: "employeeApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Employee"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            // Get all employees with pagination and filters
            getEmployees: build.query<EmployeeListResponse, EmployeeListParams | void>({
                query: (params) => {
                    const queryParams = params || {};
                    return {
                        url: "/employees",
                        method: "get",
                        params: {
                            skip: queryParams.skip || 0,
                            limit: queryParams.limit || 100,
                            ...(queryParams.search && { search: queryParams.search }),
                            ...(queryParams.department_id !== undefined && { department_id: queryParams.department_id }),
                            ...(queryParams.status_id !== undefined && { status_id: queryParams.status_id }),
                            ...(queryParams.role_id !== undefined && { role_id: queryParams.role_id }),
                            ...(queryParams.email && { email: queryParams.email }),
                            ...(queryParams.phone && { phone: queryParams.phone }),
                            ...(queryParams.sort_by && { sort_by: queryParams.sort_by }),
                            ...(queryParams.sort_order && { sort_order: queryParams.sort_order }),
                        }
                    };
                },
                transformResponse: (response: any) => response.data || response,
                providesTags: ["Employee"],
            }),

            // Get single employee by ID
            getEmployeeById: build.query<Employee, number>({
                query: (id) => ({
                    url: `/employees/${id}`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
                providesTags: (_result, _error, id) => [{ type: "Employee", id }],
            }),

            // Create new employee - backend expects multipart/form-data
            createEmployee: build.mutation<Employee, FormData>({
                query: (formData) => ({
                    url: "/employees",
                    method: "post",
                    data: formData,
                    // Don't set Content-Type header - let axios handle it for FormData
                }),
                invalidatesTags: ["Employee"],
            }),

            // Update employee - backend expects multipart/form-data
            updateEmployee: build.mutation<Employee, { id: number; data: FormData }>({
                query: ({ id, data }) => ({
                    url: `/employees/${id}`,
                    method: "put",
                    data,
                    // Don't set Content-Type header - let axios handle it for FormData
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Employee", id },
                    "Employee",
                ],
            }),

            // Delete employee
            deleteEmployee: build.mutation<void, number>({
                query: (id) => ({
                    url: `/employees/${id}`,
                    method: "delete"
                }),
                invalidatesTags: ["Employee"],
            }),

            // Update employee status
            updateEmployeeStatus: build.mutation<Employee, { id: number; status: number }>({
                query: ({ id, status }) => ({
                    url: `/employees/${id}/status`,
                    method: "patch",
                    data: { status }
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Employee", id },
                    "Employee",
                ],
            }),

            // Toggle employee activation
            toggleEmployeeActivation: build.mutation<Employee, { id: number; active: boolean }>({
                query: ({ id, active }) => ({
                    url: `/employees/${id}/activate`,
                    method: "patch",
                    data: { active }
                }),
                invalidatesTags: (_result, _error, { id }) => [
                    { type: "Employee", id },
                    "Employee",
                ],
            }),

            // Bulk toggle employee activation
            bulkToggleEmployeeActivation: build.mutation<any, BulkEmployeeActivateRequest>({
                query: (data) => ({
                    url: "/employees/bulk-activate",
                    method: "post",
                    data
                }),
                invalidatesTags: ["Employee"],
            }),

            // Check email uniqueness
            checkEmailUnique: build.query<{ unique: boolean }, string>({
                query: (email) => ({
                    url: `/employees/check-email/${email}`,
                    method: "get"
                }),
                transformResponse: (response: any) => response.data || response,
            }),
            
            // Get sales persons
            getSalesPersons: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/users/sales-persons",
                    method: "get"
                }),
                transformResponse: (response: any) => {
                    // Handle the response format with success, message, and data properties
                    if (response && response.data) {
                        return response.data;
                    }
                    return response;
                },
                providesTags: ["Employee"],
            }),
        };
    },
});

export const {
    useGetEmployeesQuery,
    useLazyGetEmployeesQuery,
    useGetEmployeeByIdQuery,
    useLazyGetEmployeeByIdQuery,
    useCreateEmployeeMutation,
    useUpdateEmployeeMutation,
    useDeleteEmployeeMutation,
    useUpdateEmployeeStatusMutation,
    useToggleEmployeeActivationMutation,
    useBulkToggleEmployeeActivationMutation,
    useCheckEmailUniqueQuery,
    useLazyCheckEmailUniqueQuery,
    useGetSalesPersonsQuery,
} = employeeApi;
