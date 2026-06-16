/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

const getCurrentDateParams = () => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

interface ReportQueryParams {
    year?: number;
    month?: number;
    fab_type?: string;
}


export const reportApi = createApi({
    reducerPath: "reportApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Report"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            getReportRedos: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/redos",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getWeeklyFabricationLaborCost: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/weekly-fabrication-labor-cost",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getWeeklyInstallerLaborCost: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/weekly-installer-labor-cost",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getOwnerOverview: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/overview",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getRedoAnalysis: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/redo-analysis",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getShopStatusReport: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/shop-status",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getInstallPerformance: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/install-performance",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getWeeklyTrends: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/weekly-trends",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getInstallationTemplaterReport: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/installation-template",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getInstallationTemplateReport: build.query<any, { from_date?: string; to_date?: string; search?: string; fab_type?: string; sales_person_id?: number } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.from_date) searchParams.append('from_date', params.from_date);
                    if (params?.to_date) searchParams.append('to_date', params.to_date);
                    if (params?.search) searchParams.append('search', params.search);
                    if (params?.fab_type && params.fab_type !== 'all') searchParams.append('fab_type', params.fab_type);
                    if (params?.sales_person_id) searchParams.append('sales_person_id', String(params.sales_person_id));
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/installation-template-dashboard${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getMonthlyInstallCompletion: build.query<any, ReportQueryParams | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/monthly-install-completion",
                    method: "get",
                    params: {
                        ...(params?.year && { year: params.year }),
                        ...(params?.month && { month: params.month }),
                        ...(params?.fab_type && params.fab_type !== 'all' && { fab_type: params.fab_type }),
                    }
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),

            getDailyInstallCompletion: build.query<any, { fab_type?: string } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/daily-install-completion",
                    method: "get",
                    params: params?.fab_type && params.fab_type !== 'all' ? { fab_type: params.fab_type } : undefined,
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),

            getMonthlyCutCompletion: build.query<any, ReportQueryParams | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/monthly-cut-completion",
                    method: "get",
                    params: {
                        ...(params?.year && { year: params.year }),
                        ...(params?.month && { month: params.month }),
                        ...(params?.fab_type && params.fab_type !== 'all' && { fab_type: params.fab_type }),
                    }
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getDailyInstallCompletionBasic: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/daily-install-completion",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getMonthlyCutCompletionBasic: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/monthly-cut-completion",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getTurnaroundTimes: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/turnaround-times",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getServiceLevel: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/service-level",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getInstallerRates: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/installer-rates",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            // Add inside endpoints builder
            updateRedo: build.mutation<any, { fab_id: number; data: any }>({
                query: ({ fab_id, data }) => ({
                    url: `/api/v1/reports/redos/${fab_id}`,
                    method: "patch",
                    data,
                }),
                invalidatesTags: ["Report"],
            }),
            updateMonthlyInstallCompletion: build.mutation<any, { fab_id: number; data: any }>({
                query: ({ fab_id, data }) => ({
                    url: `/api/v1/reports/owner/monthly-install-completion/${fab_id}`,
                    method: "patch",
                    data,
                }),
                invalidatesTags: ["Report"],
            }),
            updateDailyInstallCompletion: build.mutation<any, { fab_id: number; data: any }>({
                query: ({ fab_id, data }) => ({
                    url: `/api/v1/reports/owner/daily-install-completion/${fab_id}`,
                    method: "patch",
                    data,
                }),
                invalidatesTags: ["Report"],
            }),
            // in reportApi.ts (mutations section)
            updateMonthlyCutCompletion: build.mutation<any, { cut_id: number; data: any }>({
                query: ({ cut_id, data }) => ({
                    url: `/api/v1/reports/owner/monthly-cut-completion/${cut_id}`,
                    method: "patch",
                    data,
                }),
                invalidatesTags: ["Report"],
            }),
        };
    },
});

export const {
    useGetReportRedosQuery,
    useGetWeeklyFabricationLaborCostQuery,
    useGetWeeklyInstallerLaborCostQuery,
    useGetOwnerOverviewQuery,
    useGetRedoAnalysisQuery,
    useGetShopStatusReportQuery,
    useGetInstallPerformanceQuery,
    useGetWeeklyTrendsQuery,
    useGetInstallationTemplateReportQuery,
    useGetInstallationTemplaterReportQuery,
    useGetMonthlyInstallCompletionQuery,
    useGetDailyInstallCompletionQuery,
    useGetMonthlyCutCompletionQuery,
    useGetDailyInstallCompletionBasicQuery,
    useGetMonthlyCutCompletionBasicQuery,
    useGetTurnaroundTimesQuery,
    useGetServiceLevelQuery,
    useGetInstallerRatesQuery,
    useUpdateRedoMutation,
    useUpdateMonthlyInstallCompletionMutation,
    useUpdateDailyInstallCompletionMutation,
    useUpdateMonthlyCutCompletionMutation,
} = reportApi;
