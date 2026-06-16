// components/common/FabInfoCell.tsx
import React from 'react';

export interface FabInfoData {
    acct_name?: string;
    account_name?: string;
    job_name?: string;
    input_area?: string;
    stone_type_name?: string;
    stone_color_name?: string;
    stone_thickness_value?: string;
    edge_name?: string;
}

export const generateFabInfo = (data: FabInfoData) => {
    const jobInfo: string[] = [];
    const materialInfo: string[] = [];
    const stoneInfo: string[] = [];

    const accountName = data.acct_name || data.account_name;
    if (accountName) jobInfo.push(accountName);
    if (data.job_name) jobInfo.push(data.job_name);
    if (data.input_area) materialInfo.push(`${data.input_area}`);
    if (data.stone_type_name) stoneInfo.push(data.stone_type_name);
    if (data.stone_color_name) stoneInfo.push(data.stone_color_name);
    if (data.stone_thickness_value) stoneInfo.push(data.stone_thickness_value);
    if (data.edge_name) materialInfo.push(data.edge_name);

    return { jobInfo, materialInfo, stoneInfo };
};

interface FabInfoCellProps {
    data: FabInfoData;
    className?: string;
}

export const FabInfoCell: React.FC<FabInfoCellProps> = ({ data, className = "" }) => {
    const { jobInfo, materialInfo, stoneInfo } = generateFabInfo(data);

    if (jobInfo.length === 0 && stoneInfo.length === 0 && materialInfo.length === 0) {
        return <span className="text-xs text-gray-400 italic">No details</span>;
    }

    return (
        <div className={`flex gap-4 text-xs max-w-[400px] ${className}`}>
            {(jobInfo.length > 0 || stoneInfo.length > 0) && (
                <div className="flex-1 min-w-0">
                    {jobInfo.length > 0 && (
                        <div className="truncate text-gray-600" title={jobInfo.join(' - ')}>
                            {jobInfo.join(' - ')}
                        </div>
                    )}
                    {stoneInfo.length > 0 && (
                        <div className="truncate text-gray-600" title={stoneInfo.join(' - ')}>
                            {stoneInfo.join(' - ')}
                        </div>
                    )}
                </div>
            )}
            {materialInfo.length > 0 && (
                <div className="flex-1 min-w-0">
                    {materialInfo.map((info, idx) => (
                        <div key={idx} className="truncate text-gray-600" title={info}>
                            {info}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};