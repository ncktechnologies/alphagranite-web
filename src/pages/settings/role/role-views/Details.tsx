// components/RoleDetailsView.tsx

import { Role } from "@/store/api/role";
import { RoleHeader } from "../component/RoleHeader";
import { RoleStats } from "../component/RoleStats";
import { UsersSection } from "../component/users-section";
import { DetailStickyHeader } from "@/components/common/master-detail";

interface RoleDetailsViewProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: () => void;
  onActivate: (roleId: number, currentStatus: number) => void;
}

export const RoleDetailsView = ({ role, onEdit, onDelete, onActivate }: RoleDetailsViewProps) => {
  return (
    <div className="space-y-6">
      <DetailStickyHeader>
        <RoleHeader role={role} onEdit={onEdit} onDelete={onDelete} onActivate={onActivate} />
      </DetailStickyHeader>
      <RoleStats role={role} />
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Users</p>
        <UsersSection role={role} />
      </div>
    </div>
  );
};
