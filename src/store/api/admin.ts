import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import type { Admin, CreateAdminRequest, UpdateAdminRequest, AdminResponse } from "@/interfaces/pages/admin";

const baseUrl = `${import.meta.env.VITE_COAHLITE_API_BASE_URL}`
// const baseUrl = "/api"

export const adminApi = createApi({
    reducerPath: "adminApi",
    baseQuery: axiosBaseQuery({
        baseUrl 
    }),
    tagTypes: ["Admins"],
    endpoints: (builder) => ({
        getAdmins: builder.query<AdminResponse, { skip: number; limit: number; search?: string; role?: string }>({
            query: ({ skip, limit, search, role }) => {
                const params: any = { skip, limit };
                if (search) params.search = search;
                if (role && role !== 'all') params.role = role;
                return {
                    url: "/admins",
                    method: "GET",
                    params,
                };
            },
            providesTags: ["Admins"],
        }),
        getAdminById: builder.query<Admin, string>({
            query: (id) => ({
                url: `/admins/${id}`,
                method: "GET",
            }),
            providesTags: (result, error, id) => [{ type: "Admins", id }],
        }),
        createAdmin: builder.mutation<Admin, CreateAdminRequest>({
            query: (data) => ({
                url: "/create",
                method: "POST",
                data,
            }),
            invalidatesTags: ["Admins"],
        }),
        updateAdmin: builder.mutation<Admin, UpdateAdminRequest>({
            query: ({ id, body }) => ({
                url: `/admins/${id}`,
                method: "PUT",
                data: body,
            }),
            invalidatesTags: (result, error, { id }) => [{ type: "Admins", id }, "Admins"],
        }),
        deleteAdmin: builder.mutation<void, string>({
            query: (id) => ({
                url: `/admins/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Admins"],
        }),
    }),
});

export const {
    useGetAdminsQuery,
    useGetAdminByIdQuery,
    useCreateAdminMutation,
    useUpdateAdminMutation,
    useDeleteAdminMutation,
} = adminApi; 