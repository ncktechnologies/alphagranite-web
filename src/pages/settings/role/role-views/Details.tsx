// components/RoleDetailsView.tsx

import { Role } from "@/config/types";
import { RoleHeader } from "../component/RoleHeader";
import { RoleStats } from "../component/RoleStats";
import { UsersSection } from "../component/users-section";

interface RoleDetailsViewProps {
  role: Role;
  onEdit: (role: Role) => void;
}

export const RoleDetailsView = ({ role, onEdit }: RoleDetailsViewProps) => {
  return (
    <div className="space-y-2">
      <RoleHeader role={role} onEdit={onEdit} />
      <RoleStats />
      <h2 className="py-2 text-text text-base">Users</h2>
      <UsersSection />
    </div>
  );
};