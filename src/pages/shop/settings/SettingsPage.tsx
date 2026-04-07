import { SHOP_NAV } from '@/config/menu.config';
import { Station, ViewMode } from '@/config/types';
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { WorkStationForm } from '../components/Form';
import { StationDetailsView } from '../components/Details';
import { Container } from '@/components/common/container';
import { StationList } from '../components/StationList';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetWorkstationsQuery } from '@/store/api';
import {
    useGetAllPlanningSectionsQuery,
    useDeletePlanningSectionMutation,
    useUpdatePlanningSectionMutation,
    useUpdateWorkstationMutation
} from '@/store/api/workstation';
import { PlanningSectionManager } from './components/PlanningSectionManager';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityDetailsView } from './components/ActivityDetailsView';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Check, Plus, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    useGetStoneTypesQuery,
    useGetStoneColorsByStoneTypeQuery,
    useCreateStoneTypeMutation,
    useUpdateStoneTypeMutation,
    useDeleteStoneTypeMutation,
    useCreateStoneColorMutation,
    useUpdateStoneColorMutation,
    useDeleteStoneColorMutation
} from '@/store/api/job';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function SettingsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('details');
    const [selectedRole, setSelectedRole] = useState<Station | null>(null);
    const [activeTab, setActiveTab] = useState<'workstations' | 'activities' | 'stone-types'>('workstations');
    const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [editingIsActive, setEditingIsActive] = useState<boolean>(true);

    // Stone types state
    const [selectedStoneTypeId, setSelectedStoneTypeId] = useState<number | null>(null);
    const [showAddStoneTypeDialog, setShowAddStoneTypeDialog] = useState(false);
    const [showAddStoneColorDialog, setShowAddStoneColorDialog] = useState(false);
    const [newStoneTypeName, setNewStoneTypeName] = useState('');
    const [newStoneTypeDesc, setNewStoneTypeDesc] = useState('');
    const [newStoneColorName, setNewStoneColorName] = useState('');
    const [newStoneColorCode, setNewStoneColorCode] = useState('');
    const [editingStoneTypeId, setEditingStoneTypeId] = useState<number | null>(null);
    const [editingStoneColorId, setEditingStoneColorId] = useState<number | null>(null);

    // Fetch workstations from API
    const { data: workstationsData, isLoading, isError, refetch } = useGetWorkstationsQuery();

    // Fetch all planning sections (including inactive)
    const { data: planningSectionsData, refetch: refetchPlanningSections } = useGetAllPlanningSectionsQuery();
    const planningSections: any[] = (planningSectionsData && Array.isArray(planningSectionsData) ? planningSectionsData : []) || [];

    // Fetch stone types
    const { data: stoneTypesData, refetch: refetchStoneTypes } = useGetStoneTypesQuery({ limit: 1000 });
    const stoneTypes: any[] = (stoneTypesData && Array.isArray(stoneTypesData) ? stoneTypesData : []) || [];

    // Fetch stone colors for selected stone type
    const { data: stoneColorsData, refetch: refetchStoneColors } = useGetStoneColorsByStoneTypeQuery(
        { stone_type_id: selectedStoneTypeId!, limit: 1000 },
        { skip: !selectedStoneTypeId }
    );
    const stoneColors: any[] = (stoneColorsData && Array.isArray(stoneColorsData) ? stoneColorsData : []) || [];

    // Stone type mutations
    const [createStoneType] = useCreateStoneTypeMutation();
    const [updateStoneType] = useUpdateStoneTypeMutation();
    const [deleteStoneType] = useDeleteStoneTypeMutation();

    // Stone color mutations
    const [createStoneColor] = useCreateStoneColorMutation();
    const [updateStoneColor] = useUpdateStoneColorMutation();
    const [deleteStoneColor] = useDeleteStoneColorMutation();

    // Update mutations
    const [updateWorkstation] = useUpdateWorkstationMutation();
    const [deletePlanningSection] = useDeletePlanningSectionMutation();
    const [updatePlanningSection] = useUpdatePlanningSectionMutation();

    // Convert API data to Station format – use is_active for status
    const workstations: Station[] = useMemo(() => {
        if (!workstationsData) return [];
        return workstationsData.data.map((ws: any) => {
            const operatorNames: string[] = ws.operators?.map((op: any) => op.name) || [];
            return {
                id: ws.id.toString(),
                workstationName: ws.name,
                description: ws.planning_section_name || 'Not assigned',
                status: ws.is_active === true || ws.is_active === 1 ? 'Active' : 'Inactive',
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

    // Toggle workstation status using update mutation with is_active
    const handleToggleWorkstationStatus = async (role: Station) => {
        const newIsActive = role.status !== 'Active'; // true = activate, false = deactivate
        const action = newIsActive ? 'activate' : 'deactivate';

        try {
            await updateWorkstation({
                id: parseInt(role.id),
                data: {
                    is_active: newIsActive   // ✅ directly set the boolean (or 1/0 based on API)
                }
            }).unwrap();

            toast.success(`Workstation ${action}d successfully`);
            refetch(); // refresh the list to reflect new status
        } catch (error) {
            console.error('Failed to update workstation status:', error);
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

    // Toggle activity status using update mutation with is_active
    const handleToggleActivityStatus = async (id: number) => {
        const section = planningSections.find(s => s.id === id);
        if (!section) return;

        const currentActive = section.is_active === true || section.is_active === 1;
        const newIsActive = !currentActive;
        const action = newIsActive ? 'activate' : 'deactivate';

        try {
            await updatePlanningSection({
                id,
                data: {
                    is_active: newIsActive,
                    // keep other fields unchanged (optional but safe)
                    plan_name: section.plan_name,
                    plan_description: section.plan_description,
                    status_id: section.status_id || 1,
                },
            }).unwrap();
            toast.success(`Shop activity ${action}d successfully`);
            refetchPlanningSections();
        } catch (error) {
            console.error('Failed to update activity status:', error);
            toast.error(`Failed to ${action} shop activity`);
        }
    };

    const handleEditActivity = (section: any) => {
        setEditingSectionId(section.id);
        setEditingName(section.plan_name);
        setEditingDescription(section.plan_description || '');
        setEditingIsActive(section.is_active === true || section.is_active === 1);
    };

    const handleSaveEdit = async () => {
        if (!editingSectionId || !editingName.trim()) return;

        try {
            await updatePlanningSection({
                id: editingSectionId,
                data: {
                    plan_name: editingName.trim(),
                    plan_description: editingDescription.trim() || undefined,
                    is_active: editingIsActive,
                    status_id: 1, // assuming 1=active, 2=inactive; adjust if different
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

    // Stone Type handlers
    const handleAddStoneType = async () => {
        if (!newStoneTypeName.trim()) {
            toast.error('Stone type name is required');
            return;
        }
        try {
            await createStoneType({
                name: newStoneTypeName.trim(),
                description: newStoneTypeDesc.trim() || undefined
            }).unwrap();
            toast.success('Stone type added successfully');
            setNewStoneTypeName('');
            setNewStoneTypeDesc('');
            setShowAddStoneTypeDialog(false);
            refetchStoneTypes();
        } catch (error) {
            console.error('Failed to add stone type:', error);
            toast.error('Failed to add stone type');
        }
    };

    const handleEditStoneType = (stoneType: any) => {
        setEditingStoneTypeId(stoneType.id);
        setNewStoneTypeName(stoneType.name);
        setNewStoneTypeDesc(stoneType.description || '');
        setShowAddStoneTypeDialog(true);
    };

    const handleUpdateStoneType = async () => {
        if (!editingStoneTypeId || !newStoneTypeName.trim()) return;
        try {
            await updateStoneType({
                id: editingStoneTypeId,
                data: {
                    name: newStoneTypeName.trim(),
                    description: newStoneTypeDesc.trim() || undefined
                }
            }).unwrap();
            toast.success('Stone type updated successfully');
            setNewStoneTypeName('');
            setNewStoneTypeDesc('');
            setEditingStoneTypeId(null);
            setShowAddStoneTypeDialog(false);
            refetchStoneTypes();
        } catch (error) {
            console.error('Failed to update stone type:', error);
            toast.error('Failed to update stone type');
        }
    };

    const handleDeleteStoneType = async (id: number) => {
        if (!confirm('Are you sure you want to delete this stone type?')) return;
        try {
            await deleteStoneType(id).unwrap();
            toast.success('Stone type deleted successfully');
            if (selectedStoneTypeId === id) setSelectedStoneTypeId(null);
            refetchStoneTypes();
        } catch (error) {
            console.error('Failed to delete stone type:', error);
            toast.error('Failed to delete stone type');
        }
    };

    // Stone Color handlers
    const handleAddStoneColor = async () => {
        if (!newStoneColorName.trim() || !selectedStoneTypeId) {
            toast.error('Stone color name is required');
            return;
        }
        try {
            await createStoneColor({
                name: newStoneColorName.trim(),
                color_code: newStoneColorCode.trim() || undefined,
                description: `Color for stone type ${selectedStoneTypeId}`
            }).unwrap();
            toast.success('Stone color added successfully');
            setNewStoneColorName('');
            setNewStoneColorCode('');
            setShowAddStoneColorDialog(false);
            refetchStoneColors();
        } catch (error) {
            console.error('Failed to add stone color:', error);
            toast.error('Failed to add stone color');
        }
    };

    const handleEditStoneColor = (color: any) => {
        setEditingStoneColorId(color.id);
        setNewStoneColorName(color.name);
        setNewStoneColorCode(color.color_code || '');
        setShowAddStoneColorDialog(true);
    };

    const handleUpdateStoneColor = async () => {
        if (!editingStoneColorId || !newStoneColorName.trim()) return;
        try {
            await updateStoneColor({
                id: editingStoneColorId,
                data: {
                    name: newStoneColorName.trim(),
                    color_code: newStoneColorCode.trim() || undefined
                }
            }).unwrap();
            toast.success('Stone color updated successfully');
            setNewStoneColorName('');
            setNewStoneColorCode('');
            setEditingStoneColorId(null);
            setShowAddStoneColorDialog(false);
            refetchStoneColors();
        } catch (error) {
            console.error('Failed to update stone color:', error);
            toast.error('Failed to update stone color');
        }
    };

    const handleDeleteStoneColor = async (id: number) => {
        if (!confirm('Are you sure you want to delete this stone color?')) return;
        try {
            await deleteStoneColor(id).unwrap();
            toast.success('Stone color deleted successfully');
            refetchStoneColors();
        } catch (error) {
            console.error('Failed to delete stone color:', error);
            toast.error('Failed to delete stone color');
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
            return <StationDetailsView role={selectedRole} onEdit={handleEditRole} onDelete={() => { }} onStatusChange={refetch} />;
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
                        <TabsTrigger value="stone-types">Stone Types & Colors</TabsTrigger>
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
                                <div className="space-y-4">
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
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={editingIsActive}
                                                                onChange={(e) => setEditingIsActive(e.target.checked)}
                                                                className="h-4 w-4"
                                                            />
                                                            <Label>Active</Label>
                                                        </div>
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

                    <TabsContent value="stone-types" className="mt-0">
                        <div className="flex h-full gap-6">
                            {/* Left Panel - Stone Types List */}
                            <div className="w-80 pr-6 border-r overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Stone Types</h3>
                                        <Dialog open={showAddStoneTypeDialog} onOpenChange={(open) => {
                                            setShowAddStoneTypeDialog(open);
                                            if (!open) {
                                                setEditingStoneTypeId(null);
                                                setNewStoneTypeName('');
                                                setNewStoneTypeDesc('');
                                            }
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline">
                                                    <Plus className="w-4 h-4 mr-1" /> Add
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        {editingStoneTypeId ? 'Edit Stone Type' : 'Add Stone Type'}
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Name *</Label>
                                                        <Input
                                                            value={newStoneTypeName}
                                                            onChange={(e) => setNewStoneTypeName(e.target.value)}
                                                            placeholder="e.g., Granite, Marble"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Description</Label>
                                                        <Textarea
                                                            value={newStoneTypeDesc}
                                                            onChange={(e) => setNewStoneTypeDesc(e.target.value)}
                                                            placeholder="Optional description"
                                                            rows={3}
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setShowAddStoneTypeDialog(false);
                                                                setEditingStoneTypeId(null);
                                                                setNewStoneTypeName('');
                                                                setNewStoneTypeDesc('');
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={editingStoneTypeId ? handleUpdateStoneType : handleAddStoneType}
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            {editingStoneTypeId ? 'Update' : 'Add'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div className="space-y-2">
                                        {stoneTypes.map((stoneType: any) => (
                                            <Card
                                                key={stoneType.id}
                                                className={`cursor-pointer hover:bg-gray-50 ${selectedStoneTypeId === stoneType.id ? 'border-blue-500 bg-blue-50' : ''}`}
                                                onClick={() => setSelectedStoneTypeId(stoneType.id)}
                                            >
                                                <CardContent className="p-3 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{stoneType.name}</p>
                                                        {stoneType.description && (
                                                            <p className="text-xs text-gray-500 truncate">{stoneType.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => handleEditStoneType(stoneType)}
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-red-600"
                                                            onClick={() => handleDeleteStoneType(stoneType.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel - Stone Colors */}
                            <div className="flex-1 pl-6 overflow-y-auto">
                                {selectedStoneTypeId ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold">
                                                    {stoneTypes.find((st: any) => st.id === selectedStoneTypeId)?.name} - Colors
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {stoneColors.length} color(s) available
                                                </p>
                                            </div>
                                            <Dialog open={showAddStoneColorDialog} onOpenChange={(open) => {
                                                setShowAddStoneColorDialog(open);
                                                if (!open) {
                                                    setEditingStoneColorId(null);
                                                    setNewStoneColorName('');
                                                    setNewStoneColorCode('');
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline">
                                                        <Plus className="w-4 h-4 mr-1" /> Add Color
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            {editingStoneColorId ? 'Edit Stone Color' : 'Add Stone Color'}
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <Label>Color Name *</Label>
                                                            <Input
                                                                value={newStoneColorName}
                                                                onChange={(e) => setNewStoneColorName(e.target.value)}
                                                                placeholder="e.g., Absolute Black, Bianco Romano"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Color Code (Hex)</Label>
                                                            <Input
                                                                value={newStoneColorCode}
                                                                onChange={(e) => setNewStoneColorCode(e.target.value)}
                                                                placeholder="#000000"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setShowAddStoneColorDialog(false);
                                                                    setEditingStoneColorId(null);
                                                                    setNewStoneColorName('');
                                                                    setNewStoneColorCode('');
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                onClick={editingStoneColorId ? handleUpdateStoneColor : handleAddStoneColor}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                {editingStoneColorId ? 'Update' : 'Add'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {stoneColors.map((color: any) => (
                                                <Card key={color.id} className="relative">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    {color.color_code && (
                                                                        <div
                                                                            className="w-6 h-6 rounded border"
                                                                            style={{ backgroundColor: color.color_code }}
                                                                        />
                                                                    )}
                                                                    <p className="font-medium">{color.name}</p>
                                                                </div>
                                                                {color.color_code && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        {color.color_code}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0"
                                                                    onClick={() => handleEditStoneColor(color)}
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 p-0 text-red-600"
                                                                    onClick={() => handleDeleteStoneColor(color.id)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {stoneColors.length === 0 && (
                                            <div className="flex items-center justify-center h-40 text-gray-500">
                                                No colors added yet. Click "Add Color" to get started.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-500">
                                        Select a stone type from the list to manage its colors
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

export default SettingsPage;