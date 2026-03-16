import { SHOP_NAV } from '@/config/menu.config';
import { Station, ViewMode } from '@/config/types';
import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { WorkStationForm } from '../components/Form';
import { StationDetailsView } from '../components/Details';
import { PageMenu } from '@/pages/settings/page-menu';
import { Container } from '@/components/common/container';
import { StationList } from '../components/StationList';
import { Toolbar, ToolbarActions, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetWorkstationsQuery } from '@/store/api';
import { useGetEmployeesQuery } from '@/store/api/employee';

function SettingsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [selectedRole, setSelectedRole] = useState<Station | null>(null);
    
    // Fetch workstations from API
    const { data: workstationsData, isLoading, isError, refetch } = useGetWorkstationsQuery();
    
    // Fetch employees to map operator IDs to names
    const { data: employeesData } = useGetEmployeesQuery();
    const employees: any[] = employeesData?.data || (Array.isArray(employeesData) ? employeesData : []);
    
    console.log(workstationsData?.data, 'KSKSKKS')
    
    // Convert API data to Station format
    const workstations: Station[] = useMemo(() => {
        if (!workstationsData) return [];
        
        return workstationsData.data.map((ws: any) => {
            // Handle operator_ids safely - could be string, array, or number
            let operatorArray: string[] = [];
            if (ws.operator_ids && Array.isArray(ws.operator_ids)) {
                // Map employee IDs to names
                operatorArray = ws.operator_ids.map((empId: number) => {
                    const emp = employees.find(e => e.id === empId);
                    if (emp) {
                        return `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || `ID: ${empId}`;
                    }
                    return `ID: ${empId}`;
                });
            } else if (ws.operator_ids && typeof ws.operator_ids === 'string') {
                operatorArray = ws.operator_ids.split(',');
            } else if (ws.operator_ids && typeof ws.operator_ids === 'number') {
                const emp = employees.find(e => e.id === ws.operator_ids);
                operatorArray = [emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : `ID: ${ws.operator_ids}`];
            }
            
            return {
                id: ws.id.toString(),
                workstationName: ws.name,
                description: ws.curremt_stage,
                status: (ws.status_id === 1) ? 'Active' : 'Inactive',
                members: operatorArray.length,
                avatars: [],
                machine: ws.machines || '',
                operators: operatorArray,
                other: ws.machine_statuses || ''
            } as Station;
        });
    }, [workstationsData, employees]);
    
    useEffect(() => {
        if (workstations.length > 0 && !selectedRole && viewMode !== 'new' && viewMode !== 'edit') {
            setSelectedRole(workstations[0]);
            setViewMode('details');
        }
    }, [workstations, selectedRole, viewMode]);
    
    const handleRoleSelect = (role: Station) => {
        setSelectedRole(role);
        setViewMode('details');
    };

    const handleNewRole = () => {
        setViewMode('new');
        setSelectedRole(null);
    };

    const handleEditRole = (role: Station) => {
        setSelectedRole(role);
        setViewMode('edit');
    };
    
    const handleCloseForm = () => {
        if (viewMode === 'new') {
            // When closing new mode, go to details of first role
            if (workstations.length > 0) {
                setSelectedRole(workstations[0]);
                setViewMode('details');
            } else {
                setViewMode('list');
            }
        } else if (viewMode === 'edit') {
            // When closing edit mode, go to details of the role being edited
            setViewMode('details');
        }
    };

    const renderRightContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64 text-gray-500">
                    Loading workstations...
                </div>
            );
        }
        
        if (isError) {
            return (
                <div className="flex items-center justify-center h-64 text-red-500">
                    Error loading workstations. <button onClick={() => refetch()} className="ml-2 text-blue-500 underline">Retry</button>
                </div>
            );
        }

        if (viewMode === 'details' && selectedRole) {
            return <StationDetailsView role={selectedRole} onEdit={handleEditRole} onDelete={() => {}} />;
        }

        if (viewMode === 'new' || viewMode === 'edit') {
            return (
                <WorkStationForm
                    mode={viewMode}
                    role={selectedRole}
                    onCancel={handleCloseForm}
                //   onSave={handleSaveRole}
                />
            );
        }

        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                No workstations available. Create a new workstation to get started.
            </div>
        );
    };
    
    return (
        <Fragment>
            {/* <PageMenu /> */}

            <Container>
                <Toolbar className=' lex flex-col items-start'>
                    <ToolbarBreadcrumbs
                        menu={SHOP_NAV}
                        rootTitle="Shop"
                        rootPath="/"
                    />

                    <ToolbarHeading title="Shop settings" description="" />


                </Toolbar>
                <div className="flex h-full gap-6 mt-4">
                    <StationList
                        roles={workstations}
                        selectedRole={selectedRole}
                        onRoleSelect={handleRoleSelect}
                        onNewRole={handleNewRole}
                    />

                    {/* Right Content Area */}
                    <div className="flex-1 pl-6">
                        {renderRightContent()}
                    </div>
                </div>
            </Container>
        </Fragment>
    )
}

export default SettingsPage
