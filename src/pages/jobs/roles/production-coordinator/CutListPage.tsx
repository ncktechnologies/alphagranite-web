import React, { useState, useEffect, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { CutListTableWithCalculations } from './CutListTableWithCalculations';
import { useGetFabsQuery, useGetFabTypesQuery } from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { Fab } from '@/store/api/job';
import { DateRange } from 'react-day-picker';

const CutListPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [fabTypeFilter, setFabTypeFilter] = useState('all');
    const [salesPersonFilter, setSalesPersonFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

    // Fetch all fab types and sales persons for filter dropdowns
    const { data: fabTypesData } = useGetFabTypesQuery();
    const { data: salesPersonsData } = useGetSalesPersonsQuery();

    // Extract fab types and sales persons
    const fabTypes = useMemo(() => {
        if (!fabTypesData) {
            return [];
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(fabTypesData)) {
            rawData = fabTypesData;
        } else if (typeof fabTypesData === 'object' && 'data' in fabTypesData) {
            rawData = (fabTypesData as any).data || [];
        }

        // Extract names from FabType objects
        const extractName = (item: { name: string } | string) => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null) {
                return item.name || String(item);
            }
            return String(item);
        };

        return rawData.map(extractName);
    }, [fabTypesData]);

    // Store sales persons with both ID and name for filtering
    const salesPersonMap = useMemo(() => {
        if (!salesPersonsData) {
            return new Map<string, number>();
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) {
            rawData = salesPersonsData;
        } else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) {
            rawData = (salesPersonsData as any).data || [];
        }

        // Create a map of sales person names to IDs
        const map = new Map<string, number>();
        rawData.forEach((item: any) => {
            if (typeof item === 'object' && item !== null && item.id && item.name) {
                map.set(item.name, item.id);
            }
        });

        return map;
    }, [salesPersonsData]);

    const salesPersons = useMemo(() => {
        if (!salesPersonsData) {
            return [];
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        if (Array.isArray(salesPersonsData)) {
            rawData = salesPersonsData;
        } else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) {
            rawData = (salesPersonsData as any).data || [];
        }

        // Extract names from sales person objects
        const extractName = (item: { name: string } | string) => {
            if (typeof item === 'string') {
                return item;
            }
            if (typeof item === 'object' && item !== null) {
                return item.name || String(item);
            }
            return String(item);
        };

        return rawData.map(extractName);
    }, [salesPersonsData]);

    // Build query parameters for backend
    const buildQueryParams = useMemo(() => {
        const params: any = {
            current_stage: 'cut_list',
            skip: pagination.pageIndex * pagination.pageSize,
            limit: pagination.pageSize,
        };

        // Add search query
        if (searchQuery) {
            params.search = searchQuery;
        }

        // Add fab type filter
        if (fabTypeFilter !== 'all') {
            params.fab_type = fabTypeFilter;
        }

        // Add sales person filter using ID instead of name
        if (salesPersonFilter !== 'all' && salesPersonFilter !== 'no_sales_person') {
            const salesPersonId = salesPersonMap.get(salesPersonFilter);
            if (salesPersonId) {
                params.sales_person_id = salesPersonId;
            }
        }

        // Add date filter parameter for backend to handle
        if (dateFilter !== 'all') {
            params.date_filter = dateFilter;
        }

        // Add custom date range
        if (dateFilter === 'custom' && dateRange?.from && dateRange?.to) {
            params.schedule_start_date = dateRange.from.toISOString();
            params.schedule_due_date = dateRange.to.toISOString();
        }

        return params;
    }, [searchQuery, dateFilter, fabTypeFilter, salesPersonFilter, salesPersonMap, dateRange, pagination]);

    // Fetch FABs with backend filtering
    const { data: fabsData, isLoading: isFabsLoading, refetch, isFetching } = useGetFabsQuery(buildQueryParams);

    // Extract data and totals from response
    const { fabs, stageTotals, totalRevenue, totalCostOfStone } = useMemo(() => {
        if (!fabsData) {
            return { 
                fabs: [], 
                stageTotals: null, 
                totalRevenue: 0, 
                totalCostOfStone: 0 
            };
        }

        // Handle both possible response formats
        let rawData: any[] = [];
        let stageTotals: any = null;

        if (Array.isArray(fabsData)) {
            rawData = fabsData;
        } else if (typeof fabsData === 'object' && 'data' in fabsData) {
            const responseData = fabsData.data;
            
            if (Array.isArray(responseData)) {
                rawData = responseData;
            } else if (typeof responseData === 'object') {
                // Extract the array of FABs
                rawData = responseData.data || [];
                // Extract stage totals
                stageTotals = responseData.stage_totals || null;
            }
        }

        // Calculate totals from FABs data
        const revenueTotal = rawData.reduce((sum, fab) => {
            const revenue = fab.revenue || 0;
            return sum + Number(revenue);
        }, 0);

        // If we have stage_totals from API, use them, otherwise calculate from raw data
        if (!stageTotals) {
            stageTotals = {
                total_sqft: rawData.reduce((sum, fab) => sum + (fab.total_sqft || 0), 0),
                wj_linft: rawData.reduce((sum, fab) => sum + (fab.wj_linft || 0), 0),
                edging_linft: rawData.reduce((sum, fab) => sum + (fab.edging_linft || 0), 0),
                cnc_linft: rawData.reduce((sum, fab) => sum + (fab.cnc_linft || 0), 0),
                miter_linft: rawData.reduce((sum, fab) => sum + (fab.miter_linft || 0), 0),
                no_of_pieces: rawData.reduce((sum, fab) => sum + (fab.no_of_pieces || 0), 0)
            };
        }

        // Calculate cost of stone if available (you'll need to add this field to your API)
        // For now, we'll calculate it based on total sqft * average cost per sqft
        // You should update this based on your actual data structure
        const totalCostOfStone = 0; // Placeholder - update with actual calculation

        return {
            fabs: rawData,
            stageTotals,
            totalRevenue: revenueTotal,
            totalCostOfStone
        };
    }, [fabsData]);

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Cut List" description="Jobs scheduled for shop cut date" />
                </Toolbar>
            </Container>
            <div className='flex flex-wrap gap-x-3 items-center '>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                    Total SQ. FT: {stageTotals?.total_sqft || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                    WJ: LIN FT: {stageTotals?.wj_linft || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                    Edging: LIN FT: {stageTotals?.edging_linft || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                    TCNC: LIN FT: {stageTotals?.cnc_linft || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                   Milter: LIN FT: {stageTotals?.miter_linft || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                   No. of Pieces: {stageTotals?.no_of_pieces || 0}
                </div>
                <div className='pl-5 text-[#4B5675] text-[14px]'>
                    Revenue: ${totalRevenue.toLocaleString()}
                </div>
                {/* Uncomment if you have cost of stone data */}
                {/* <div className='pl-5 text-[#4B5675] text-[14px]'>
                   Cost of stone: ${totalCostOfStone.toLocaleString()}
                </div> */}
            </div>
            <Container className="mt-6">
                <CutListTableWithCalculations
                    fabs={fabs}
                    fabTypes={fabTypes}
                    salesPersons={salesPersons}
                    path="/job/cut-list"
                    isLoading={isFabsLoading || isFetching}
                    pagination={pagination}
                    setPagination={setPagination}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    fabTypeFilter={fabTypeFilter}
                    setFabTypeFilter={setFabTypeFilter}
                    salesPersonFilter={salesPersonFilter}
                    setSalesPersonFilter={setSalesPersonFilter}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                />
            </Container>
        </>
    );
};

export default CutListPage;