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
  skipToast?: boolean;
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
    // 'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') ?? '';
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  // Only set Content-Type to application/json if not already set and data is not FormData
  if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  // Remove Content-Type for FormData to let axios set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
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
    if (error?.status === 401 && !originalRequest._retry && error?.data?.detail?.message !== "Incorrect credentials") {
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
        // Clear user data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        
        // Clear all table state entries from localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('table-state-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // window.location.replace('/');
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

        // Clear user data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        
        // Clear all table state entries from localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('table-state-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        toast.error('Your session has expired. Please login again.');
        window.location.replace('/');

        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error?.status === 401) {
      const errorData = error?.data;
      const errorMessage =
        errorData?.detail?.message ||
        'Your session has expired. Please login again.';
      // toast.error(errorMessage);
    }

    return Promise.reject(err);
  }
);

export const axiosBaseQuery =
  ({ baseUrl }: { baseUrl: string } = { baseUrl: "" }): BaseQueryFn<P, unknown, unknown> =>
    async ({ url, method, data, params, skipToast }) => {
      // Offline handling
      if (!navigator.onLine) {
        if (!skipToast) toast.error("No internet connection");
        return {
          error: { status: 0, data: { message: "Offline" } }
        };
      }

      try {
        const response = await instance({
          url: `${baseUrl}${url}`,
          method,
          data,
          params,
        });

        // Handle non-success HTTP codes
        if (![200, 201].includes(response.status)) {
          let errorMessage =
            response.data?.detail ||
            response.data?.message ||
            response.data?.msg ||
            "Something went wrong.";

          if (typeof errorMessage !== "string") {
            errorMessage = JSON.stringify(errorMessage);
          }

          if (!skipToast) toast.error(errorMessage);

          return {
            error: {
              status: response.status,
              data: response.data
            }
          };
        }

        return { data: response.data };
      } catch (axiosError) {
        const err = axiosError as AxiosError<ErrorResponse>;

        // No server response (timeout, CORS, network dropped)
        if (!err.response) {
          if (!skipToast) toast.error("A network error occurred.");
          return {
            error: {
              status: 500,
              data: { message: "No response received from server." }
            }
          };
        }

        const { status, data } = err.response;

        // 🔥 **SUPPRESS TOAST for 404 globally (common, non-critical)**
        if (status === 404) {
          return {
            error: {
              status: 404,
              data
            }
          };
        }

        // Normalize backend errors
        const detailArray = Array.isArray(data?.detail)
          ? data.detail
          : data?.detail
            ? [data.detail]
            : [];

        let errorMessage =
          detailArray
            .map((d: any) => d.msg || d.message || JSON.stringify(d))
            .join(", ") ||
          data?.msg ||
          data?.message ||
          "An unexpected error occurred.";

        if (!skipToast) toast.error(errorMessage);

        return {
          error: {
            status,
            data
          }
        };
      }
    };
