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
    start_date?: string;
    end_date?: string;
}
/** GET/PUT /api/v1/performance/static-data (derived values are calculated by the backend). */
export interface PerformanceStaticData {
    year: number;
    total_expenses: number | null;
    total_wages: number | null;
    difference_overhead: number | null;
    overhead_monthly: number | null;
    overhead_weekly: number | null;
    breakeven_gross_revenue: number | null;
    breakeven_gross_profit: number | null;
    /** Mon-Fri days in the year less New Year's Day, Good Friday, Christmas Eve and Christmas Day. */
    working_days_per_year: number;
    breakeven_avg_revenue_per_day: number | null;
    updated_at: string | null;
    updated_by: number | null;
}

export interface PerformanceStaticDataInput {
    year: number;
    total_expenses: number | null;
    total_wages: number | null;
    breakeven_gross_revenue: number | null;
}

/** One report week; week_ending is the key the labor cost reports use. */
export interface SubcontractorLaborWeek {
    week_ending: string;
    week_start: string;
    month_number: number;
    number_of_days: number;
    total_labor_cost: number | null;
    head_count: number | null;
}

export interface SubcontractorLaborYear {
    year: number;
    weeks: SubcontractorLaborWeek[];
}

export interface SubcontractorLaborInput {
    year: number;
    weeks: { week_ending: string; total_labor_cost: number | null; head_count: number | null }[];
}

export interface SlaRule {
    id: number;
    fab_type: string;
    stage_name: string;
    target_days: number;
    at_risk_days: number;
    is_applicable: boolean;
}

export interface UpdateSlaRuleDto {
    target_days?: number;
    at_risk_days?: number;
    is_applicable?: boolean;
}


export const reportApi = createApi({
    reducerPath: "reportApi",
    baseQuery: axiosBaseQuery({ baseUrl }),
    tagTypes: ["Report", "SlaSettings", "PerformanceData"],
    keepUnusedDataFor: 0,
    endpoints(build) {
        return {
            getReportRedos: build.query<any, { from_date?: string; to_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.from_date) searchParams.append('from_date', params.from_date);
                    if (params?.to_date) searchParams.append('to_date', params.to_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/redos?${queryString}`,
                        method: "get",
                    };
                },
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
            getWeeklyInstallerSubsLaborCost: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/weekly-installer-labor-cost-subs",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getWeeklyInstallerCombinedLaborCost: build.query<any, { year?: number, month?: number } | void>({
                query: (params) => ({
                    url: "/api/v1/reports/owner/weekly-installer-labor-cost-combined",
                    method: "get",
                    params: params || getCurrentDateParams()
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),

            // ─── Performance inputs (static data + weekly subcontractor labor) ──────
            getPerformanceStaticData: build.query<{ data: PerformanceStaticData }, { year: number }>({
                query: (params) => ({ url: "/api/v1/performance/static-data", method: "get", params }),
                providesTags: ["PerformanceData"],
            }),
            updatePerformanceStaticData: build.mutation<{ data: PerformanceStaticData }, PerformanceStaticDataInput>({
                query: (body) => ({ url: "/api/v1/performance/static-data", method: "put", data: body }),
                // Reports take their overhead per week from this.
                invalidatesTags: ["PerformanceData", "Report"],
            }),
            getSubcontractorLabor: build.query<{ data: SubcontractorLaborYear }, { year: number }>({
                query: (params) => ({ url: "/api/v1/performance/subcontractor-labor", method: "get", params }),
                providesTags: ["PerformanceData"],
            }),
            updateSubcontractorLabor: build.mutation<{ data: SubcontractorLaborYear }, SubcontractorLaborInput>({
                query: (body) => ({ url: "/api/v1/performance/subcontractor-labor", method: "put", data: body }),
                invalidatesTags: ["PerformanceData", "Report"],
            }),

            getOwnerOverview: build.query<any, { start_date?: string; end_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/overview${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getRedoAnalysis: build.query<any, { start_date?: string; end_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/redo-analysis${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getShopStatusReport: build.query<any, { start_date?: string; end_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/shop-status${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getInstallPerformance: build.query<any, { start_date?: string; end_date?: string; installer_id?: number } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    if (params?.installer_id) searchParams.append('installer_id', String(params.installer_id));
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/install-performance${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getWeeklyTrends: build.query<any, { from_date?: string; to_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.from_date) searchParams.append('from_date', params.from_date);
                    if (params?.to_date) searchParams.append('to_date', params.to_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/weekly-trends${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
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
            // Inside endpoints builder
            getInstallationTemplateReportPdf: build.mutation<Blob, { from_date?: string; to_date?: string; search?: string; fab_type?: string; sales_person_id?: number } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.from_date) searchParams.append('from_date', params.from_date);
                    if (params?.to_date) searchParams.append('to_date', params.to_date);
                    if (params?.search) searchParams.append('search', params.search);
                    if (params?.fab_type && params.fab_type !== 'all') searchParams.append('fab_type', params.fab_type);
                    if (params?.sales_person_id) searchParams.append('sales_person_id', String(params.sales_person_id));
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/installation-template-dashboard/pdf${queryString ? `?${queryString}` : ''}`,
                        method: 'get',
                        responseHandler: 'blob' as const,
                    };
                },
            }),
            // Inside endpoints builder
            updateInstallationTemplateReport: build.mutation<any, any>({
                query: (body) => ({
                    url: `/api/v1/reports/owner/installation-template-dashboard`,
                    method: 'PATCH',
                    data: body, // send the entire body as-is
                }),
                invalidatesTags: ['Report'],
            }),

            // ─── Daily Install Completion ───────────────────────────────────────────
            getDailyInstallCompletion: build.query<any, { start_date?: string; end_date?: string; fab_type?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    if (params?.fab_type && params.fab_type !== 'all') searchParams.append('fab_type', params.fab_type);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/daily-install-completion${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),

            // ─── Monthly Install Completion ─────────────────────────────────────────
            getMonthlyInstallCompletion: build.query<any, { year?: number; month?: number; fab_type?: string; start_date?: string; end_date?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.year) searchParams.append('year', String(params.year));
                    if (params?.month) searchParams.append('month', String(params.month));
                    if (params?.fab_type && params.fab_type !== 'all') searchParams.append('fab_type', params.fab_type);
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/monthly-install-completion${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
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
            // UPDATE a single rule
            updateSlaRule: build.mutation<SlaRule, { id: number; data: UpdateSlaRuleDto }>({
                query: ({ id, data }) => ({
                    url: `/api/v1/reports/owner/service-level-settings/${id}`,
                    method: 'PATCH',
                    data,
                }),
                invalidatesTags: ['SlaSettings'],
            }),
            getSlaSettings: build.query<SlaRule[], void>({
                query: () => ({
                    url: '/api/v1/reports/owner/service-level-settings',
                }),
                providesTags: ['SlaSettings'],
                transformResponse: (response: any) => response.data || [],
            }),
            getInstallerRates: build.query<any, void>({
                query: () => ({
                    url: "/api/v1/reports/owner/installer-rates",
                    method: "get"
                }),
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            getShopProductionSummary: build.query<any, { start_date?: string; end_date?: string; status_id?: number; include_non_shop_stages?: boolean; include_fab_details?: boolean } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    if (params?.status_id !== undefined && params?.status_id !== null) searchParams.append('status_id', String(params.status_id));
                    if (params?.include_non_shop_stages !== undefined) searchParams.append('include_non_shop_stages', String(params.include_non_shop_stages));
                    if (params?.include_fab_details !== undefined) searchParams.append('include_fab_details', String(params.include_fab_details));
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/shop-production-summary${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
            // In reportApi.ts
            getDailyCompletion: build.query<any, { from_date?: string; to_date?: string; weekdays?: number } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.from_date) searchParams.append('from_date', params.from_date);
                    if (params?.to_date) searchParams.append('to_date', params.to_date);
                    if (params?.weekdays !== undefined && params?.weekdays !== null) {
                        searchParams.append('weekdays', String(params.weekdays));
                    }
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/daily-completion${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
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
            getRevisionReport: build.query<any, { year?: number; month?: number; start_date?: string; end_date?: string; fab_type?: string } | void>({
                query: (params) => {
                    const searchParams = new URLSearchParams();
                    if (params?.year) searchParams.append('year', String(params.year));
                    if (params?.month) searchParams.append('month', String(params.month));
                    if (params?.start_date) searchParams.append('start_date', params.start_date);
                    if (params?.end_date) searchParams.append('end_date', params.end_date);
                    if (params?.fab_type && params.fab_type !== 'all') searchParams.append('fab_type', params.fab_type);
                    const queryString = searchParams.toString();
                    return {
                        url: `/api/v1/reports/owner/revision-report${queryString ? `?${queryString}` : ''}`,
                        method: "get",
                    };
                },
                transformResponse: (response: any) => response,
                providesTags: ["Report"],
            }),
        };
    },
});

export const {
    useGetReportRedosQuery,
    useGetWeeklyFabricationLaborCostQuery,
    useGetWeeklyInstallerLaborCostQuery,
    useGetWeeklyInstallerSubsLaborCostQuery,
    useGetWeeklyInstallerCombinedLaborCostQuery,
    useGetPerformanceStaticDataQuery,
    useUpdatePerformanceStaticDataMutation,
    useGetSubcontractorLaborQuery,
    useUpdateSubcontractorLaborMutation,
    useGetOwnerOverviewQuery,
    useGetRedoAnalysisQuery,
    useGetShopStatusReportQuery,
    useGetInstallPerformanceQuery,
    useGetWeeklyTrendsQuery,
    useGetInstallationTemplateReportQuery,
    useGetInstallationTemplaterReportQuery,
    useGetInstallationTemplateReportPdfMutation,
    useUpdateInstallationTemplateReportMutation,
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
    useGetShopProductionSummaryQuery,
    useGetDailyCompletionQuery,
    useGetRevisionReportQuery,
    useUpdateSlaRuleMutation,
    useGetSlaSettingsQuery

} = reportApi;
