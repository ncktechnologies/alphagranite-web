// components/RoleHeader.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Role } from '@/config/types';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { DeleteIcon, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';

interface RoleHeaderProps {
    role: Role;
    onEdit: (role: Role) => void;
    OnDelete: (role: Role) => void;
}

export const RoleHeader = ({ role, onEdit, OnDelete }: RoleHeaderProps) => {
    const [isSwitchOn, setIsSwitchOn] = useState(false);
    const handleSwitchToggle = () => {
        setIsSwitchOn(!isSwitchOn);
    };
    return (


        // {/* <div className="flex items-center justify-between">
        //   <div>
        //     <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
        //     <p className="text-xs text-gray-600">{role.description}</p>
        //   </div>
        //   <div className="flex items-center gap-2">
        //     <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
        //       Edit
        //     </Button>
        //     <Button variant="outline" size="sm">
        //       Deactivate role
        //     </Button>
        //   </div>
        // </div> */}
        // <Toolbar>
        //     {/* <ToolbarHeading title="" description="/> */}
        // </Toolbar>
        <Toolbar className=' '>

            <ToolbarHeading title={role.name} description={role.description} />
            <ToolbarActions>
                <Button variant="outline" size="sm" onClick={() => OnDelete(role)} className='text-secondary'>
                    <Trash2 />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(role)} className='text-secondary'>
                    <PenLine />
                    Edit
                </Button>
                <Button variant="outline" size="sm" className='text-secondary'>
                    <PenLine />
                    Deactivate role
                    {/* {isSwitchOn ? 'On' : 'Off'} */}
                    <Switch
                        id="simple-switch"
                        size="sm"
                        className="ms-2"
                        checked={isSwitchOn}
                        onCheckedChange={handleSwitchToggle}
                    />
                </Button>
            </ToolbarActions>

        </Toolbar>

    );
};