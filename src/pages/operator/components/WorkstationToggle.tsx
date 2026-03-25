'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OperatorWorkstation } from '@/store/api/operator';

interface WorkstationToggleProps {
    workstations: OperatorWorkstation[];
    selectedWorkstation?: number | null;
    onSelect: (wsId: number | null) => void;
    isLoading?: boolean;
}

export function WorkstationToggle({
    workstations = [],
    selectedWorkstation = null,
    onSelect,
    isLoading = false,
}: WorkstationToggleProps) {
    if (isLoading || workstations.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-3">
            <label className="text-[14px] font-semibold text-[#4b545d]">
                Filter by Workstation:
            </label>
            <Select
                value={selectedWorkstation?.toString() || 'all'}
                onValueChange={(value) => onSelect(value === 'all' ? null : Number(value))}
            >
                <SelectTrigger className="w-[200px] h-[40px] border border-[#e2e4ed] rounded-[8px] text-[14px] font-medium focus:border-[#9cc15e] focus:ring-1 focus:ring-[#9cc15e]">
                    <SelectValue placeholder="Select workstation" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Workstations</SelectItem>
                    {workstations.map((ws: any) => (
                        <SelectItem key={ws.id} value={ws.id.toString()}>
                            {ws.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
