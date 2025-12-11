// components/RoleHeader.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Role } from '@/store/api/role';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { DeleteIcon, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
        <Toolbar className=' '>
            <ToolbarHeading title={role.name} description={role.description || ''} />
            <ToolbarActions>
                <Can action="delete" on="Settings">
                    <Button variant="outline" size="sm" onClick={onDelete} className='text-secondary'>
                        <Trash2 />
                    </Button>
                </Can>
                <Can action="update" on="Settings">
                    <Button variant="outline" size="sm" onClick={() => onEdit(role)} className='text-secondary'>
                        <PenLine />
                        Edit
                    </Button>
                </Can>
                <Can action="update" on="Settings">
                    <Button variant="outline" size="sm" className='text-secondary'>
                        {isActive ? 'Deactivate role' : 'Activate role'}
                        <Switch
                            id="simple-switch"
                            size="sm"
                            className="ms-2"
                            checked={isActive}
                            onCheckedChange={() => onActivate(role.id, role.status || 1)}
                        />
                    </Button>
                </Can>
            </ToolbarActions>
        </Toolbar>
    );
};
