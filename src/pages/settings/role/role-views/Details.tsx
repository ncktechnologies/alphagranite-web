// components/RoleDetailsView.tsx

import { Role } from "@/store/api/role";
import { RoleHeader } from "../component/RoleHeader";
import { RoleStats } from "../component/RoleStats";
import { UsersSection } from "../component/users-section";

interface RoleDetailsViewProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: () => void;
  onActivate: (roleId: number, currentStatus: number) => void;
}

export const RoleDetailsView = ({ role, onEdit, onDelete, onActivate }: RoleDetailsViewProps) => {
  return (
    <div className="space-y-2">
      <RoleHeader role={role} onEdit={onEdit} onDelete={onDelete} onActivate={onActivate} />
      <RoleStats role={role} />
      <h2 className="py-2 text-text text-base">Users</h2>
      <UsersSection role={role} />
    </div>
  );
};