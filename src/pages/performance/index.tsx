// src/pages/reports/ReportsPage.tsx

import { useNavigate } from "react-router";
import { useAllPermissions, useIsSuperAdmin } from "@/hooks/use-permission";
import { hasReadPermissionForKey } from "@/lib/permission";

const REPORTS = [
    { title: 'Installation & Template ', path: '/report/installation-template', permissionKey: 'installation_template' },
   
    { title: 'Redos', path: '/report/redos', permissionKey: 'redos' },
  
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

export function PerformancePage() {
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
                        Performance
                    </h1>
                </div>
                <div className="flex items-center justify-center h-64">
                    <p className="text-gray-500 text-lg">You do not have access to any performance.</p>
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
                    Performance
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