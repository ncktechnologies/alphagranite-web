// pages/reports/WeeklyFabCost.tsx
import { useGetWeeklyFabricationLaborCostQuery } from '@/store/api/report';
import { WeeklyLaborCostReport } from './WeeklyLaborCostReport';

/** Shop Labor Costs - Weekly (fabrication). */
export function WeeklyFabricationCostReport() {
    return (
        <WeeklyLaborCostReport
            title="Shop Labor Costs - Weekly"
            apiPath="/api/v1/reports/owner/weekly-fabrication-labor-cost"
            useReportQuery={useGetWeeklyFabricationLaborCostQuery}
            filePrefix="shop-labor-cost"
        />
    );
}
