import { SHOP_NAV } from '@/config/menu.config';
import { Station, ViewMode } from '@/config/types';
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { WorkStationForm } from '../components/Form';
import { StationDetailsView } from '../components/Details';
import { Container } from '@/components/common/container';
import { StationList } from '../components/StationList';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetWorkstationsQuery } from '@/store/api';
import { useGetAllPlanningSectionsQuery, useToggleWorkstationStatusMutation, useDeletePlanningSectionMutation, useTogglePlanningSectionStatusMutation, useUpdatePlanningSectionMutation } from '@/store/api/workstation';
import { PlanningSectionManager } from './components/PlanningSectionManager';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityDetailsView } from './components/ActivityDetailsView';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function SettingsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [selectedRole, setSelectedRole] = useState<Station | null>(null);
    const [activeTab, setActiveTab] = useState<'workstations' | 'activities'>('workstations');
    const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [editingStatusId, setEditingStatusId] = useState<number>(1);

    // Fetch workstations from API
    const { data: workstationsData, isLoading, isError, refetch } = useGetWorkstationsQuery();

    // Fetch all planning sections (including inactive)
    const { data: planningSectionsData, refetch: refetchPlanningSections } = useGetAllPlanningSectionsQuery();
    const planningSections: any[] = (planningSectionsData && Array.isArray(planningSectionsData) ? planningSectionsData : []) || [];

    // Toggle workstation status mutation
    const [toggleWorkstationStatus] = useToggleWorkstationStatusMutation();
    const [deletePlanningSection] = useDeletePlanningSectionMutation();
    const [togglePlanningSectionStatus] = useTogglePlanningSectionStatusMutation();
    const [updatePlanningSection] = useUpdatePlanningSectionMutation();

    // Convert API data to Station format (now using enriched API response)
    const workstations: Station[] = useMemo(() => {
        if (!workstationsData) return [];

        return workstationsData.data.map((ws: any) => {
            // Extract operator names directly from the operators array
            const operatorNames: string[] = ws.operators?.map((op: any) => op.name) || [];

            return {
                id: ws.id.toString(),
                workstationName: ws.name,
                description: ws.planning_section_name || 'Not assigned',
                status: (ws.status_id === 1 || ws.is_active) ? 'Active' : 'Inactive',
                members: operatorNames.length,
                avatars: [],
                machine: ws.machines || '',
                operators: operatorNames,
                other: ws.machine_statuses || '',
                planning_section_id: ws.planning_section_id,
                planning_section_name: ws.planning_section_name,
                operator_ids: ws.operators?.map((op: any) => op.id) || [],
            } as Station;
        });
    }, [workstationsData]);

    // Auto-select first workstation when in workstations tab
    useEffect(() => {
        if (activeTab === 'workstations' && workstations.length > 0 && !selectedRole && viewMode !== 'new' && viewMode !== 'edit') {
            setSelectedRole(workstations[0]);
            setViewMode('details');
        }
    }, [activeTab, workstations, selectedRole, viewMode]);

    // Auto-select first activity when in activities tab
    useEffect(() => {
        if (activeTab === 'activities' && planningSections.length > 0 && selectedActivityId === null) {
            setSelectedActivityId(planningSections[0].id);
        }
    }, [activeTab, planningSections, selectedActivityId]);

  



    const handleNewRole = () => {
        setViewMode('new');
        setSelectedRole(null);
    };

    const handleRoleSelect = (role: Station) => {
        setSelectedRole(role);
        setViewMode('details');
    };

    const handleEditRole = (role: Station) => {
        setSelectedRole(role);
        setViewMode('edit');
    };

    const handleToggleWorkstationStatus = async (role: Station) => {
        const newStatusId = role.status === 'Active' ? 0 : 1;
        const action = newStatusId === 1 ? 'activate' : 'deactivate';

        try {
            await toggleWorkstationStatus({
                id: parseInt(role.id),
                status_id: newStatusId
            }).unwrap();

            toast.success(`Workstation ${action}d successfully`);
            refetch();
        } catch (error) {
            console.error('Failed to toggle workstation status:', error);
            toast.error(`Failed to ${action} workstation`);
        }
    };

    const handleCloseForm = () => {
        if (viewMode === 'new') {
            setViewMode('list');
            setSelectedRole(null);
        } else if (viewMode === 'edit') {
            setViewMode('list');
            setSelectedRole(null);
        }
    };

    const handleToggleActivityStatus = async (id: number) => {
        const section = planningSections.find(s => s.id === id);
        if (!section) return;
        
        const newStatusId = section.status_id === 1 ? 0 : 1;
        const action = newStatusId === 1 ? 'activate' : 'deactivate';
        
        try {
            await togglePlanningSectionStatus({ id, status_id: newStatusId }).unwrap();
            toast.success(`Shop activity ${action}d successfully`);
            refetchPlanningSections();
        } catch (error) {
            console.error('Failed to toggle activity status:', error);
            toast.error(`Failed to ${action} shop activity`);
        }
    };

    const handleEditActivity = (section: any) => {
        setEditingSectionId(section.id);
        setEditingName(section.plan_name);
        setEditingDescription(section.plan_description || '');
        setEditingStatusId(section.status_id || 1);
    };

    const handleSaveEdit = async () => {
        if (!editingSectionId || !editingName.trim()) return;
        
        try {
            await updatePlanningSection({
                id: editingSectionId,
                data: {
                    plan_name: editingName.trim(),
                    plan_description: editingDescription.trim() || undefined,
                    status_id: editingStatusId,
                },
            }).unwrap();
            
            toast.success('Shop activity updated successfully');
            setEditingSectionId(null);
            setEditingName('');
            setEditingDescription('');
            refetchPlanningSections();
        } catch (error) {
            console.error('Failed to update:', error);
            toast.error('Failed to update shop activity');
        }
    };

    const handleCancelEdit = () => {
        setEditingSectionId(null);
        setEditingName('');
        setEditingDescription('');
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
            return <StationDetailsView role={selectedRole} onEdit={handleEditRole} onDelete={() => {}} onStatusChange={refetch} />;
        }

        if (viewMode === 'new' || viewMode === 'edit') {
            return (
                <WorkStationForm
                    mode={viewMode}
                    role={selectedRole}
                    onCancel={handleCloseForm}
                />
            );
        }

        // List view - no selection
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                Select a workstation from the list to view details
            </div>
        );
    };

    return (
        <Fragment>
            <Container>
                <Toolbar className='flex flex-col items-start'>
                    <ToolbarBreadcrumbs
                        menu={SHOP_NAV}
                        rootTitle="Shop"
                        rootPath="/shop"
                    />

                    <ToolbarHeading title="Shop Settings" description="Manage workstations and shop activities" />
                </Toolbar>

                {/* Tab Navigation */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
                    <TabsList className="mb-4">
                        <TabsTrigger value="workstations">Workstations</TabsTrigger>
                        <TabsTrigger value="activities">Shop Activities</TabsTrigger>
                    </TabsList>

                    <TabsContent value="workstations" className="mt-0">
                        <div className="flex h-full gap-6">
                            <div className="w-80 pr-6 border-r overflow-y-auto">
                                <StationList
                                    roles={workstations}
                                    selectedRole={selectedRole}
                                    onRoleSelect={handleRoleSelect}
                                    onNewRole={handleNewRole}
                                    onToggleStatus={handleToggleWorkstationStatus}
                                />
                            </div>

                            {/* Right Content Area */}
                            <div className="flex-1 pl-6 overflow-y-auto">
                                {renderRightContent()}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="activities" className="mt-0">
                        <div className="flex h-full gap-6">
                            <div className="w-80 pr-6 border-r overflow-y-auto">
                                {/* Activity cards list */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-800">Shop Activities</h3>
                                    </div>
                                    <PlanningSectionManager
                                        planningSections={planningSections}
                                        onRefresh={refetchPlanningSections}
                                        selectedActivityId={selectedActivityId}
                                        onSelectActivity={setSelectedActivityId}
                                    />
                                </div>
                            </div>

                            {/* Right Content Area for Details */}
                            <div className="flex-1 pl-6 overflow-y-auto">
                                {selectedActivityId ? (
                                    editingSectionId === selectedActivityId ? (
                                        // Edit Mode
                                        <Card>
                                            <CardContent className="p-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-lg font-semibold">Edit Activity</h3>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="sm" onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
                                                                <Check className="w-4 h-4" /> Save
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Activity Name</Label>
                                                        <Input
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                        />
                                                        <Label>Description</Label>
                                                        <Textarea
                                                            value={editingDescription}
                                                            onChange={(e) => setEditingDescription(e.target.value)}
                                                            rows={3}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        // View Mode
                                        <ActivityDetailsView
                                            activity={planningSections.find(s => s.id === selectedActivityId)!}
                                            onEdit={() => {
                                                const section = planningSections.find(s => s.id === selectedActivityId);
                                                if (section) handleEditActivity(section);
                                            }}
                                            onDelete={async () => {
                                                const section = planningSections.find(s => s.id === selectedActivityId);
                                                if (!section) return;
                                                
                                                if (!confirm(`Are you sure you want to delete "${section.plan_name}"?`)) {
                                                    return;
                                                }
                                                
                                                try {
                                                    await deletePlanningSection(section.id).unwrap();
                                                    toast.success('Shop activity deleted successfully');
                                                    setSelectedActivityId(null);
                                                    refetchPlanningSections();
                                                } catch (error) {
                                                    console.error('Failed to delete:', error);
                                                    toast.error('Failed to delete shop activity');
                                                }
                                            }}
                                            onToggleStatus={() => handleToggleActivityStatus(selectedActivityId!)}
                                        />
                                    )
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-500">
                                        Select an activity from the list to view details
                                    </div>
                                )}
                            </div>

                        </div>
                    </TabsContent>

                </Tabs>
            </Container>
        </Fragment>
    )
}

export default SettingsPage
