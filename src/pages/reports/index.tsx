// src/pages/reports/ReportsPage.tsx

import { useNavigate } from "react-router";
import { useAllPermissions, useIsSuperAdmin } from "@/hooks/use-permission";
import { hasReadPermissionForKey } from "@/lib/permission";

const REPORTS = [
    { title: 'AG Completion Report', path: '/report/daily-completion', permissionKey: 'report_shop_status' },
    { title: 'Daily Install Completion', path: '/report/daily-install-completion', permissionKey: 'daily_install_completion' },
    { title: 'Employee Productivity Report', path: '/report/template-card', permissionKey: 'installation_template' },
    { title: 'Install Performance', path: '/report/install-performance', permissionKey: 'install_performance' },
    { title: 'Installation & Template Report', path: '/report/installation-template', permissionKey: 'installation_template' },
    { title: 'Monthly Cut Completion', path: '/report/monthly-cut-completion', permissionKey: 'monthly_cut_completion' },
    { title: 'Monthly Install Completion', path: '/report/monthly-install-completion', permissionKey: 'monthly_install_completion' },
    { title: 'Redo Analysis', path: '/report/redo-analysis', permissionKey: 'redo_analysis' },
    { title: 'Redos', path: '/report/redos', permissionKey: 'redos' },
    { title: 'Revision', path: '/report/report-revision', permissionKey: 'revision' },
    { title: 'Service Level', path: '/report/service-level', permissionKey: 'service_level' },
    { title: 'Shop Production Summary', path: '/report/shop-production-summary', permissionKey: 'shop_production_summary' },
    { title: 'Stage Status', path: '/report/owner-overview', permissionKey: 'owner_overview' },
    { title: 'Template & Install Trends', path: '/report/weekly-trends', permissionKey: 'weekly_trends' },
    { title: 'Turnaround Times', path: '/report/turnaround-times', permissionKey: 'turnaround_times' },
    { title: 'Weekly Fabrication Cost', path: '/report/weekly-fabrication-cost', permissionKey: 'weekly_fabrication_cost' },
    { title: 'Weekly Installer Cost', path: '/report/weekly-installer-cost', permissionKey: 'weekly_installer_cost' },
];

function ChevronRight() {
    return (
        <div className="opacity-70 relative shrink-0 size-[20px]">
            <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4">
                <div className="absolute inset-[-10%_-20%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 12">
                        <path d="M1 1L6 6L1 11" stroke="#444444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

export function ReportsPage() {
    const navigate = useNavigate();
    const permissions = useAllPermissions();
    const isSuperAdmin = useIsSuperAdmin();

    // Filter reports by permission and sort alphabetically by title
    const visibleReports = REPORTS
        .filter(report => hasReadPermissionForKey(report.permissionKey, permissions, isSuperAdmin))
        .sort((a, b) => a.title.localeCompare(b.title));

    if (visibleReports.length === 0) {
        return (
            <div className="">
                <div className="border-b border-[#e5e7eb] pb-[32px]">
                    <h1 className="font-proxima font-semibold text-[28px] leading-[32px] text-black px-[32px]">
                        Reports
                    </h1>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500 text-lg">You do not have access to any reports.</p>
                </div>
            </div>
        );
    }

    // Split into 3 columns (alphabetical order is preserved left-to-right)
    const numColumns = 3;
    const columns: typeof visibleReports[] = Array.from({ length: numColumns }, () => []);
    visibleReports.forEach((report, index) => {
        columns[index % numColumns].push(report);
    });

    return (
        <div className="">
            <div className="border-b border-[#e5e7eb] pb-[32px]">
                <h1 className="font-proxima font-semibold text-[28px] leading-[32px] text-black px-[32px]">
                    Reports
                </h1>
            </div>
            <div className="flex gap-[24px] items-start px-[32px] py-[32px]">
                {columns.map((col, ci) => (
                    <div key={ci} className="flex flex-1 flex-col gap-[24px]">
                        {col.map((report) => (
                            <button
                                key={report.title}
                                onClick={() => report.path && navigate(report.path)}
                                className="bg-white w-full rounded-[8px] border border-[#e5e7eb] flex items-center px-[25px] py-[17px] text-left hover:bg-[#f9fafb] transition-colors cursor-pointer disabled:cursor-default"
                                disabled={!report.path}
                            >
                                <span className="flex-1 font-['Proxima_Nova',sans-serif] font-semibold text-[16px] text-black leading-[24px]">
                                    {report.title}
                                </span>
                                <ChevronRight />
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}