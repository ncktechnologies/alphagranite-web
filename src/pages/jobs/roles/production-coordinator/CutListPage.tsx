import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { CutListTableWithCalculations } from './CutListTableWithCalculations';
import { useGetFabsQuery, useGetFabTypesQuery, useCreateFabNoteMutation } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { DateRange } from 'react-day-picker';


const CutListPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    // ✅ 1. Declare searchType state here in the parent — this is what gets sent to the backend
    const [searchType, setSearchType] = useState<'fab_id' | 'job_number' | 'job_name'>('fab_id');

    const [dateFilter, setDateFilter] = useState('all');
    const [fabTypeFilter, setFabTypeFilter] = useState('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
    const [createFabNote] = useCreateFabNoteMutation();

    const { data: fabTypesData } = useGetFabTypesQuery();
    const { data: salesPersonsData } = useGetSalesPersonsQuery();

    const fabTypes = useMemo(() => {
        if (!fabTypesData) return [];
        let rawData: any[] = Array.isArray(fabTypesData)
            ? fabTypesData
            : (fabTypesData as any).data || [];
        return rawData.map((item: any) =>
            typeof item === 'string' ? item : item.name || String(item)
        );
    }, [fabTypesData]);

    const salesPersonMap = useMemo(() => {
        if (!salesPersonsData) return new Map<string, number>();
        let rawData: any[] = Array.isArray(salesPersonsData)
            ? salesPersonsData
            : (salesPersonsData as any).data || [];
        const map = new Map<string, number>();
        rawData.forEach((item: any) => {
            if (item?.id && item?.name) map.set(item.name, item.id);
        });
        return map;
    }, [salesPersonsData]);

    const salesPersons = useMemo(() => {
        if (!salesPersonsData) return [];
        let rawData: any[] = Array.isArray(salesPersonsData)
            ? salesPersonsData
            : (salesPersonsData as any).data || [];
        return rawData.map((item: any) =>
            typeof item === 'string' ? item : item.name || String(item)
        );
    }, [salesPersonsData]);

    // ✅ 2. Include searchType + searchQuery together in buildQueryParams
    //       When searchQuery is set, `params.type` = searchType is sent to backend
    const buildQueryParams = useMemo(() => {
        const params: any = {
            current_stage: 'cut_list',
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
        };

        if (searchQuery) {
            params.search = searchQuery;
            params.type = searchType; // ← backend receives this as the search type
        }

        if (fabTypeFilter !== 'all') params.fab_type = fabTypeFilter;

        if (salesPersonFilter !== 'all' && salesPersonFilter !== 'no_sales_person') {
            const salesPersonId = salesPersonMap.get(salesPersonFilter);
            if (salesPersonId) params.sales_person_id = salesPersonId;
        }

        if (dateFilter !== 'all') params.date_filter = dateFilter;

        if (dateFilter === 'custom' && dateRange?.from && dateRange?.to) {
            params.shop_date_start = format(dateRange.from, 'yyyy-MM-dd');
            params.shop_date_end = format(dateRange.to, 'yyyy-MM-dd');
        }

        return params;
    // ✅ 3. searchType is in the dependency array — query re-fires when type changes
    }, [searchQuery, searchType, dateFilter, fabTypeFilter, salesPersonFilter, salesPersonMap, dateRange, pagination]);

    const { data: fabsData, isLoading: isFabsLoading, refetch } = useGetFabsQuery(buildQueryParams);

    const { fabs, stageTotals, totalRevenue } = useMemo(() => {
        if (!fabsData) return { fabs: [], stageTotals: null, totalRevenue: 0 };

        let rawData: any[] = [];
        let stageTotals: any = null;

        if (Array.isArray(fabsData)) {
            rawData = fabsData;
        } else if (typeof fabsData === 'object' && 'data' in fabsData) {
            const responseData = (fabsData as any).data;
            if (Array.isArray(responseData)) {
                rawData = responseData;
            } else if (typeof responseData === 'object') {
                rawData = responseData.data || [];
                stageTotals = responseData.stage_totals || null;
            }
        }

        const revenueTotal = rawData.reduce((sum: number, fab: any) => sum + Number(fab.revenue || 0), 0);

        if (!stageTotals) {
            stageTotals = {
                total_sqft: rawData.reduce((sum: number, fab: any) => sum + (fab.total_sqft || 0), 0),
                wj_linft: rawData.reduce((sum: number, fab: any) => sum + (fab.wj_linft || 0), 0),
                edging_linft: rawData.reduce((sum: number, fab: any) => sum + (fab.edging_linft || 0), 0),
                cnc_linft: rawData.reduce((sum: number, fab: any) => sum + (fab.cnc_linft || 0), 0),
                miter_linft: rawData.reduce((sum: number, fab: any) => sum + (fab.miter_linft || 0), 0),
                no_of_pieces: rawData.reduce((sum: number, fab: any) => sum + (fab.no_of_pieces || 0), 0),
            };
        }

        return { fabs: rawData, stageTotals, totalRevenue: revenueTotal };
    }, [fabsData]);

    const handleNoteSubmit = async (fabId: number, note: string) => {
        try {
            await createFabNote({ fab_id: fabId, note, stage: 'cut_list' }).unwrap();
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    };

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar>
                    <ToolbarHeading title="Cut List" description="Jobs scheduled for shop cut date" />
                </Toolbar>
            </Container>

            <div className="flex flex-wrap gap-x-3 items-center">
                <div className="pl-5 text-[#4B5675] text-[14px]">Total SQ. FT: {stageTotals?.total_sqft || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">WJ: LIN FT: {stageTotals?.wj_linft || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">Edging: LIN FT: {stageTotals?.edging_linft || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">TCNC: LIN FT: {stageTotals?.cnc_linft || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">Miter: LIN FT: {stageTotals?.miter_linft || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">No. of Pieces: {stageTotals?.no_of_pieces || 0}</div>
                <div className="pl-5 text-[#4B5675] text-[14px]">Revenue: ${totalRevenue.toLocaleString()}</div>
            </div>

            <Container className="mt-6">
                <CutListTableWithCalculations
                    fabs={fabs}
                    fabTypes={fabTypes}
                    salesPersons={salesPersons}
                    path="/job/cut-list"
                    isLoading={isFabsLoading}
                    pagination={pagination}
                    setPagination={setPagination}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchType={searchType}
                    setSearchType={setSearchType}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    fabTypeFilter={fabTypeFilter}
                    setFabTypeFilter={setFabTypeFilter}
                    salesPersonFilter={salesPersonFilter}
                    setSalesPersonFilter={setSalesPersonFilter}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    onAddNote={handleNoteSubmit}
                    onToggleSuccess={refetch}
                    totalCount={fabsData?.total}
                />
            </Container>
        </>
    );
};

export default CutListPage;