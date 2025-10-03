import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/services/axiosBaseQuery';

interface FinancialReport {
  start_date: string;
  end_date: string;
  church_id: string;
  donations_total: number;
  tithes_total: number;
  offerings_total: number;
  payments_total: number;
  total_revenue: number;
}

interface FinancialReportParams {
  churchId: string;
  start_date: string;
  end_date: string;
}
const baseUrl = `${import.meta.env.VITE_COAHLITE_API_BASE_URL}`

// const baseUrl = "/api"

export const financeApi = createApi({
  reducerPath: 'financeApi',
  baseQuery: axiosBaseQuery({ baseUrl}),
  tagTypes: ['FinancialReport'],
  endpoints: (builder) => ({
    getFinancialReport: builder.query<FinancialReport, FinancialReportParams>({
      query: ({ churchId, start_date, end_date }) => {
        return {
          url: `/admin/platform/financial-report`,
          method: 'GET',
          params: { start_date, end_date }
        };
      },
      providesTags: ['FinancialReport'],
    }),
  }),
});

export const { useGetFinancialReportQuery } = financeApi;