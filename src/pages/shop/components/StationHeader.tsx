// components/RoleHeader.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Station } from '@/config/types';
import { Toolbar, ToolbarActions, ToolbarHeading } from './toolbar';
import { DeleteIcon, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useToggleWorkstationStatusMutation } from '@/store/api/workstation';

interface StationHeaderProps {
    role: Station;
    onEdit: (role: Station) => void;
    OnDelete: (role: Station) => void;
    onStatusChange?: () => void; // Callback to refresh data after toggle
}

export const StationHeader = ({ role, onEdit, OnDelete, onStatusChange }: StationHeaderProps) => {
    const [toggleWorkstationStatus] = useToggleWorkstationStatusMutation();
    
    const handleSwitchToggle = async () => {
        const newStatusId = role.status === 'Active' ? 0 : 1;
        const action = newStatusId === 1 ? 'activate' : 'deactivate';
        
        try {
            await toggleWorkstationStatus({ 
                id: parseInt(role.id), 
                status_id: newStatusId 
            }).unwrap();
            
            toast.success(`Workstation ${action}d successfully`);
            if (onStatusChange) {
                onStatusChange(); // Refresh the workstation list
            }
        } catch (error) {
            console.error('Failed to toggle workstation status:', error);
            toast.error(`Failed to ${action} workstation`);
        }
    };
    
    return (
        <Toolbar className=' '>
            <div className="flex items-center justify-between w-full">
                <ToolbarHeading title={role.workstationName} description={role.description} />
              
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <Badge 
                            className={`${role.status === 'Active' ? 'bg-[#0BC33F33] text-[#0BC33F]' : 'bg-[#ED143B33] text-[#ED143B]'} px-3 py-1 rounded-[50px]`}
                        >
                            {role.status}
                        </Badge>
                        
                    </div>
                    <div className="flex gap-2">
                        <Switch
                            id="workstation-status-toggle"
                            size="sm"
                            checked={role.status === 'Active'}
                            onCheckedChange={handleSwitchToggle}
                            aria-label="Toggle status"
                        />
                        <Button variant="outline" size="sm" onClick={() => onEdit(role)} className='text-secondary'>
                            <PenLine className="w-4 h-4 mr-1" />
                            Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => OnDelete(role)} className='text-red-600 hover:text-red-700 hover:bg-red-50'>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </Toolbar>
    );
};
