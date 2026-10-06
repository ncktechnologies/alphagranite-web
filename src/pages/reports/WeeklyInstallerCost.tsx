// pages/reports/WeeklyInstallerCost.tsx
import {
    useGetWeeklyInstallerCombinedLaborCostQuery,
    useGetWeeklyInstallerLaborCostQuery,
    useGetWeeklyInstallerSubsLaborCostQuery,
} from '@/store/api/report';
import { WeeklyLaborCostReport } from './WeeklyLaborCostReport';

const INSTALLER_GP_LESS_COST_KEY = 'gross_profit_less_installer_total_cost_psf';

/** Installer Labor Costs - Weekly - Alpha Granite (HCP payroll installers). */
export function WeeklyInstallerCostReport() {
    return (
        <WeeklyLaborCostReport
            title="Installer Labor Costs - Weekly - Alpha Granite"
            apiPath="/api/v1/reports/owner/weekly-installer-labor-cost"
            useReportQuery={useGetWeeklyInstallerLaborCostQuery}
            filePrefix="installer-labor-cost-alpha-granite"
            gpLessCostKey={INSTALLER_GP_LESS_COST_KEY}
        />
    );
}

/** Installer Labor Costs - Weekly - Subs (subcontractor labor entered on the Performance page). */
export function WeeklyInstallerSubsCostReport() {
    return (
        <WeeklyLaborCostReport
            title="Installer Labor Costs - Weekly - Subs"
            apiPath="/api/v1/reports/owner/weekly-installer-labor-cost-subs"
            useReportQuery={useGetWeeklyInstallerSubsLaborCostQuery}
            filePrefix="installer-labor-cost-subs"
            gpLessCostKey={INSTALLER_GP_LESS_COST_KEY}
        />
    );
}

/** Installer Labor Costs - Weekly - Combined (Alpha Granite + Subs). */
export function WeeklyInstallerCombinedCostReport() {
    return (
        <WeeklyLaborCostReport
            title="Installer Labor Costs - Weekly - Combined"
            apiPath="/api/v1/reports/owner/weekly-installer-labor-cost-combined"
            useReportQuery={useGetWeeklyInstallerCombinedLaborCostQuery}
            filePrefix="installer-labor-cost-combined"
            gpLessCostKey={INSTALLER_GP_LESS_COST_KEY}
        />
    );
}
