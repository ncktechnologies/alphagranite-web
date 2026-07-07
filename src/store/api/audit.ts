import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/services/axiosBaseQuery';

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

export interface AuditTrail {
  audit_id: number;
  timestamp: string;
  operation: string | null;
  resource_type: string | null;
  table: string | null;
  message: string | null;
  request: {
    method: string | null;
    path: string | null;
    status_code: number | null;
    device_id: string | null;
    ip_address: string | null;
    browser: string | null;
  };
  actor: {
    id: number;
    username: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    department: number;
  };
  linked_employee: any | null;
  linked_fab: any | null;
  linked_job: {
    id: number;
    name: string;
    job_number: string;
    status_id: number;
    account_id: number;
  } | null;
  manipulated_data: {
    record_id: number | null;
    changed_fields: any;
    old_values: any;
    new_values: any;
  };
  summary: {
    performed_by: string;
    did_what: string;
    where: string | null;
  };
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: axiosBaseQuery({ baseUrl }),
  tagTypes: ['Audit'],
  endpoints: (builder) => ({
    getAuditTrails: builder.query<{
      records: AuditTrail[];
      pagination: { page: number; page_size: number; total: number; total_pages: number };
      filters_applied: any;
    }, {
      page?: number;
      page_size?: number;
      user_id?: number;
      operation?: string;
      resource_type?: string;
      job_id?: number;
      fab_id?: number;
      start_date?: string;
      end_date?: string;
      search?: string;
    }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', String(params.page));
        if (params.page_size) searchParams.append('page_size', String(params.page_size));
        if (params.user_id) searchParams.append('user_id', String(params.user_id));
        if (params.operation) searchParams.append('operation', params.operation);
        if (params.resource_type) searchParams.append('resource_type', params.resource_type);
        if (params.job_id) searchParams.append('job_id', String(params.job_id));
        if (params.fab_id) searchParams.append('fab_id', String(params.fab_id));
        if (params.start_date) searchParams.append('start_date', params.start_date);
        if (params.end_date) searchParams.append('end_date', params.end_date);
        if (params.search) searchParams.append('search', params.search);
        const queryString = searchParams.toString();
        return {
          url: `/api/v1/audit-trails${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
        };
      },
      transformResponse: (response: any) => {
        return response.data || { records: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 } };
      },
      providesTags: ['Audit'],
    }),
    getAuditSummary: builder.query<{
      window: { last_hours: number; since: string; until: string };
      total_events: number;
      top_operations: { operation: string | null; count: number }[];
      top_resources: { resource_type: string | null; count: number }[];
      top_users: { user_id: number; count: number; username: string; full_name: string; employee_id: string }[];
    }, { last_hours?: number }>({
      query: (params) => ({
        url: `/api/v1/audit-trails/summary${params?.last_hours ? `?last_hours=${params.last_hours}` : ''}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || {},
      providesTags: ['Audit'],
    }),
    getAuditById: builder.query<AuditTrail, { audit_id: number }>({
      query: ({ audit_id }) => ({
        url: `/api/v1/audit-trails/${audit_id}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data || null,
      providesTags: ['Audit'],
    }),
  }),
});

export const {
  useGetAuditTrailsQuery,
  useGetAuditSummaryQuery,
  useGetAuditByIdQuery,
} = auditApi;