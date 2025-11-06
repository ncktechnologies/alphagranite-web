
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axios from 'axios';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import { toast } from 'sonner';

interface ErrorResponse {
  message?: string;
  msg?: string;
  error?: string;
  detail?: string | any[] | object;
}

interface P {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: AxiosRequestConfig['data'];
  params?: AxiosRequestConfig['params'];
  headers?: AxiosRequestConfig['headers'];
}

const instance = axios.create({
  headers: {
    // 'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') ?? '';
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (err) => {
    const error = err.response;
    if (error?.status === 401) {
      console.log("eeror from axioxbase", error?.data.detail.message)
      const errorData = error?.data;
      const errorMessage =
        errorData?.detail?.message ||
        'Your session has expired. Please login again.';
      toast.error(errorMessage);
      // if (
      //   (errorMessage) ===
      //   'Incorrect credentials'
      // ) {
      //   localStorage.removeItem('user');
      //   localStorage.removeItem('token');
      //   window.location.replace('/');
      // }
    }

    return Promise.reject(err);
  }
);

export const axiosBaseQuery =
  ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }): BaseQueryFn<P, unknown, unknown> =>
  async ({ url, method, data, params }) => {
    if (!window.navigator.onLine) {
      toast.error('No internet connection');
      return { data: null };
    }

    try {
      const result = await instance({
        url: `${baseUrl}${url}`,
        method,
        data,
        params,
      });

      if (![200, 201].includes(result?.status)) {
        const errorData = result?.data as ErrorResponse;
        let errorMessage =
          errorData?.detail ||
          errorData?.error ||
          errorData?.msg ||
          errorData?.message ||
          'Oops!!! Something went wrong on our end. Please be patient while we check it out.';
        if (typeof errorMessage !== 'string') {
          errorMessage = JSON.stringify(errorMessage);
        }
        toast.error(errorMessage);
        throw Error(errorMessage);
      }

      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError as AxiosError<ErrorResponse>;

      // ✅ Handle undefined `response` (Edge, CORS, Network failure)
      if (!err?.response) {
        toast.error('A network error occurred. Please check your internet ');
        return {
          error: {
            status: 500,
            data: { message: 'No response received from server.' },
          },
        };
      }

      const errorData = err.response.data;

      if (errorData && errorData.detail && !Array.isArray(errorData.detail)) {
        errorData.detail = [errorData.detail];
      }

      let errorMessage: string;
      if (Array.isArray(errorData?.detail)) {
        errorMessage = errorData.detail
          .map((d: any) => d.msg || d.message || JSON.stringify(d))
          .join(', ');
      } else {
        errorMessage =
          typeof errorData?.detail === 'string'
            ? errorData.detail
            : errorData?.msg || errorData?.message || 'An unexpected error occurred.';
      }

      // toast.error(errorMessage);

      return {
        error: {
          status: err?.response?.status || 500,
          data: errorData,
        },
      };
    }
  };
