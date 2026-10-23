// Compact role row for the Roles list.
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MasterListItem } from '@/components/common/master-detail';
import { Role } from '@/store/api';

interface RoleCardProps {
  role: Role;
  isSelected: boolean;
  onClick: (role: Role) => void;
}

const MAX_AVATARS = 3;

export const RoleCard = ({ role, isSelected, onClick }: RoleCardProps) => {
  const members = role.top_members ?? [];
  const memberCount = role.member_count ?? members.length;

  return (
    <MasterListItem
      title={role.name}
      active={role.status === 1}
      isSelected={isSelected}
      onClick={() => onClick(role)}
      subtitle={role.description || 'No description'}
      aside={memberCount > 0 ? (
        <div className="flex shrink-0 items-center -space-x-1.5" title={`${memberCount} member${memberCount === 1 ? '' : 's'}`}>
          {members.slice(0, MAX_AVATARS).map((user) => (
            <Avatar key={user.id} className="size-5 border border-background">
              <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                {(user.first_name?.charAt(0) ?? '') + (user.last_name?.charAt(0) ?? '')}
              </AvatarFallback>
            </Avatar>
          ))}
          {memberCount > Math.min(members.length, MAX_AVATARS) && (
            <span className="pl-2.5 text-[11px] text-muted-foreground">
              +{memberCount - Math.min(members.length, MAX_AVATARS)}
            </span>
          )}
        </div>
      ) : (
        <span className="shrink-0 text-[11px] text-muted-foreground">No members</span>
      )}
    />
  );
};
