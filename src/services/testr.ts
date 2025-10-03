import {
    getCookie,
    // handleLogout,
    // refreshToken
} from '@/utils';
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import axios from 'axios'
import type { AxiosRequestConfig, AxiosError } from 'axios'
import { toast } from 'sonner';

interface ErrorResponse {
    message?: string;
    msg?: string;
    error?: string;
    detail?: string;
}

interface P {
    url: string
    method?: AxiosRequestConfig['method']
    data?: AxiosRequestConfig['data']
    params?: AxiosRequestConfig['params']
    headers?: AxiosRequestConfig['headers']
}

const instance = axios.create({
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

instance.interceptors.request.use((config) => {
    const token = getCookie("token") ?? ""
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
});

instance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (err) => {
        const error = err.response
        if (error?.status === 401) {
            const errorData = error?.data
            const errorMessage = errorData?.detail || errorData?.msg || errorData?.message || "Your session has expired. Please login again."
            toast.error(errorMessage)
            if ((errorData?.msg || errorData?.message) === "Token has expired") {
                // refreshToken()
            }
        }

        return Promise.reject(error);
    }
);

export const axiosBaseQuery = ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<P, unknown, unknown> =>
    async ({ url, method, data, params }) => {
        if (!window.navigator.onLine) {
            toast.error("No internet connection")
            return { data: null }
        }

        try {
            const result = await instance({
                url: baseUrl + url,
                method,
                data,
                params,
            })
console.log("Requesting:", `${baseUrl}${url}`)
            if (![200, 201].includes(result?.status)) {
                const errorData = result?.data as ErrorResponse
                const errorMessage = errorData?.detail || errorData?.error || errorData?.msg || errorData?.message || "Oops!!! Something went wrong on our end. Please be patient while we check it out."
                toast.error(errorMessage)
                throw Error(errorMessage)
            }

            return { data: result.data }
        } catch (axiosError) {
            const err = axiosError as AxiosError<ErrorResponse>
            // Get error message from response data
            const errorData = err?.data
            console.log(errorData)
            const errorMessage = errorData?.detail || 
                               errorData?.msg || 
                               errorData?.message || 
                               "An unexpected error occurred."

            // Show toast for all errors
            toast.error(errorMessage)

            return {
                error: {
                    status: err?.response?.status,
                    data: errorData,
                },
            }
        }
    }