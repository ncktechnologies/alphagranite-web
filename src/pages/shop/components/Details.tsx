// components/RoleDetailsView.tsx

import { Station } from "@/config/types";
import { StationHeader } from "./StationHeader";

interface RoleDetailsViewProps {
  role: Station;
  onEdit: (role: Station) => void;
  onDelete: (role: Station) => void;
  onStatusChange?: () => void;

}

export const StationDetailsView = ({ role, onEdit, onDelete, onStatusChange }: RoleDetailsViewProps) => {
  // Get planning section name from the role data
  const rawRole = role as any;
  const planningSectionName = rawRole.planning_section_name || 'Not assigned';
  const operatorNames = rawRole.operators || [];
  
  return (
    <div className="space-y-2">
      <StationHeader role={role} onEdit={onEdit} OnDelete={onDelete} onStatusChange={onStatusChange} />      
      {/* <UsersSection /> */}
      <div className="grid grid-cols-2 gap-[14px] rounded-[8px] bg-[#FAFAFA] p-8 space-y-10">
        <div>
            <h4 className="text-secondary font-semibold text-sm pb-2.5">Workstation Name</h4>
            <h2 className="text-black leading-6 font-semibold ">{role.workstationName}</h2>
        </div>
       
        <div>
            <h4 className="text-secondary font-semibold text-sm pb-2.5">Shop Activity</h4>
            <h2 className="text-black leading-6 font-semibold ">{planningSectionName}</h2>
        </div>
        <div>
            <h4 className="text-secondary font-semibold text-sm pb-2.5">Assigned Operators</h4>
            <h2 className="text-black leading-6 font-semibold ">{Array.isArray(operatorNames) ? operatorNames.join(', ') : operatorNames || '-'}</h2>
        </div>
        <div>
            <h4 className="text-secondary font-semibold text-sm pb-2.5">Other</h4>
            <h2 className="text-black leading-6 font-semibold ">{role.other || '-'}</h2>
        </div>
      </div>
    </div>
  );
};
