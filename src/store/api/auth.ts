/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { 
  LoginRequest,
  LoginResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  SignupRequest,
  SignupResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  UserResponse,
  UserProfileUpdate
} from "@/interfaces/pages/auth";

// const baseUrl = `${import.meta.env.VITE_ALPHA_GRANITE_BASE_URL}`
const baseUrl = "https://alpha-granite.xyz-ntrinsic.com"
  const token = localStorage.getItem('token') ?? '';

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: axiosBaseQuery({baseUrl}),
    tagTypes: ["User"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            register: build.mutation<SignupResponse, SignupRequest>({
                query: (data) => ({ url: "/auth/register", method: "post", data })
            }),
            login: build.mutation<LoginResponse, LoginRequest>({
                query: (data) => ({ url: "/auth/login", method: "post", data })
            }),
            getProfile: build.query<UserResponse, void>({
                query: () => ({ 
                    url: "/auth/me", 
                    method: "get"
                }),
                providesTags:["User"]
            }),
            updateProfile: build.mutation<UserResponse, UserProfileUpdate>({
                query: (data) => ({ url: "/auth/me", method: "put", data }),
                invalidatesTags:["User"]
            }),
            changePassword: build.mutation<void, PasswordChangeRequest>({
                query: (data) => ({ url: "/auth/change-password", method: "post", data })
            }),
            requestPasswordReset: build.mutation<void, PasswordResetRequest>({
                query: (data) => ({ url: "/auth/request-password-reset", method: "post", data })
            }),
            resetPassword: build.mutation<void, PasswordResetConfirm>({
                query: (data) => ({ url: "/auth/reset-password", method: "post", data })
            }),
            unlockAccount: build.mutation<void, number>({
                query: (userId) => ({ url: `/auth/unlock-account/${userId}`, method: "post" })
            }),
            getDashboardWidgets: build.query<any, void>({
                query: () => ({ 
                    url: "/admin/platform/dashboard/stats", 
                    method: "get"
                })
            }),
            forgotPassword: build.mutation<any, ForgotPasswordRequest>({
                query: (data) => ({ url: "/users/forgot_password", method: "post", data })
            }),
            refreshToken: build.mutation<LoginResponse, { refresh_token: string }>({
                query: (data) => ({ url: "/auth/refresh", method: "post", data })
            }),
            uploadImage: build.mutation<{ id: number; url: string; filename: string }, FormData>({
                query: (formData) => ({
                    url: "/files/upload",
                    method: "post",
                    data: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: token ? `Bearer ${token}` : "",
        //   ...headers,
                    },
                })
            }),
           
        }
    }
})

export const {
    useLoginMutation,
    useRegisterMutation,
    useLazyGetProfileQuery,
    useGetProfileQuery,
    useUpdateProfileMutation,
    useChangePasswordMutation,
    useRequestPasswordResetMutation,
    useResetPasswordMutation,
    useUnlockAccountMutation,
    useGetDashboardWidgetsQuery,
    useForgotPasswordMutation,
    useRefreshTokenMutation,
    useUploadImageMutation,
} = authApi;