/* eslint-disable @typescript-eslint/no-explicit-any */
import { axiosBaseQuery } from "@/services/axiosBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";

const baseUrl = `${(import.meta as any).env?.VITE_ALPHA_GRANITE_BASE_URL || ''}`;

const getCurrentDateParams = () => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

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
            getInstallationTemplateReport: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/installation-template",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getMonthlyInstallCompletion: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/monthly-install-completion",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getDailyInstallCompletion: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/daily-install-completion",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getMonthlyCutCompletion: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/monthly-cut-completion",
                    method: "get",
                    params: params || getCurrentDateParams()
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
} = reportApi;
