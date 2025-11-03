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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const instance = axios.create({
  headers: {
    'Content-Type': 'application/json',
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
    const originalRequest = err.config;
    const error = err.response;
    
    // Handle 401 errors (token expired)
    if (error?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return instance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        // No refresh token available, logout user
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.replace('/');
        return Promise.reject(err);
      }

      try {
        // Call refresh token endpoint
        const response = await axios.post(
          'https://alpha-granite.xyz-ntrinsic.com/auth/refresh',
          { refresh_token: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { access_token, refresh_token: newRefreshToken } = response.data.data;
        
        // Update tokens in localStorage
        localStorage.setItem('token', access_token);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Update authorization header
        instance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

        // Process queued requests
        processQueue(null, access_token);
        isRefreshing = false;

        // Retry original request
        return instance(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, logout user
        processQueue(refreshError, null);
        isRefreshing = false;
        
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        toast.error('Your session has expired. Please login again.');
        window.location.replace('/');
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error?.status === 401) {
      const errorData = error?.data;
      const errorMessage =
        errorData?.detail ||
        errorData?.msg ||
        errorData?.message ||
        'Your session has expired. Please login again.';
      toast.error(errorMessage);
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

      toast.error(errorMessage);

      return {
        error: {
          status: err?.response?.status || 500,
          data: errorData,
        },
      };
    }
  };