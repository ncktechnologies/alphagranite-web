// components/RoleHeader.tsx
import { Button } from '@/components/ui/button';
import { Role } from '@/store/api/role';
import { PenLine, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Can } from '@/components/permission';

interface RoleHeaderProps {
    role: Role;
    onEdit: (role: Role) => void;
    onDelete: () => void;
    onActivate: (roleId: number, currentStatus: number) => void;
}

export const RoleHeader = ({ role, onEdit, onDelete, onActivate }: RoleHeaderProps) => {
    const isActive = role.status === 1;

    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-foreground">{role.name}</h2>
                {role.description && <p className="mt-0.5 text-sm text-muted-foreground">{role.description}</p>}
            </div>
            <div className="flex items-center gap-3">
                <Can action="create" on="Settings">
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <Switch
                            checked={isActive}
                            onCheckedChange={() => onActivate(role.id, role.status || 1)}
                            aria-label="Toggle role active"
                        />
                        <span className={isActive ? 'text-green-700' : 'text-muted-foreground'}>{isActive ? 'Active' : 'Inactive'}</span>
                    </label>
                </Can>
                <Can action="create" on="Settings">
                    <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
                        <PenLine className="size-4" />
                        Edit
                    </Button>
                </Can>
                <Can action="delete" on="Settings">
                    <Button variant="outline" size="sm" mode="icon" onClick={onDelete} aria-label="Delete role">
                        <Trash2 className="size-4" />
                    </Button>
                </Can>
            </div>
        </div>
    );
};
