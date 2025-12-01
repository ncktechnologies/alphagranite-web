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

    // Extract data from response
    const fabs = useMemo(() => {
        if (!fabsData) {
            return [];
        }

        // Handle both possible response formats
        if (Array.isArray(fabsData)) {
            return fabsData;
        }

        // If response has data property
        if (typeof fabsData === 'object' && 'data' in fabsData) {
            return (fabsData as any).data || [];
        }

        return [];
    }, [fabsData]);

    return (
        <>
            <Container className="lg:mx-0">
                <Toolbar className=" ">
                    <ToolbarHeading title="Cut List" description="Jobs scheduled for shop cut date" />
                </Toolbar>
            </Container>

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