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
} from "@/interfaces/pages/auth";

const baseUrl = `${import.meta.env.VITE_COAHLITE_API_BASE_URL}`
// const baseUrl = "/api"

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: axiosBaseQuery({baseUrl}),
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            register: build.mutation<SignupResponse, SignupRequest>({
                query: (data) => ({ url: "/auth/register", method: "post", data })
            }),
            login: build.mutation<LoginResponse, LoginRequest>({
                query: (data) => ({ url: "/auth/login", method: "post", data })
            }),
            getProfile: build.query<any, void>({
                query: () => ({ 
                    url: "/auth/me", 
                    method: "get",
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            }),
            getDashboardWidgets: build.query<any, void>({
                query: () => ({ 
                    url: "/admin/platform/dashboard/stats", 
                    method: "get",
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
            }),
            forgotPassword: build.mutation<any, ForgotPasswordRequest>({
                query: (data) => ({ url: "/users/forgot_password", method: "post", data })
            }),
            resetPassword: build.mutation<any, ResetPasswordRequest>({
                query: (data) => ({ url: "/users/reset_password", method: "post", data })
            }),
            
           
            updateProfile: build.mutation<any, UpdateProfileRequest>({
                query: (data) => ({ url: "/profile", method: "put", data })
            }),
            
        }
    }
})

export const {
    useLoginMutation,
    useRegisterMutation,
    useLazyGetProfileQuery,
    useGetDashboardWidgetsQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useUpdateProfileMutation,
} = authApi;