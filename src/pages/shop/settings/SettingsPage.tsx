import { SHOP_NAV } from '@/config/menu.config';
import { Station, ViewMode } from '@/config/types';
import React, { Fragment, useMemo, useState, useEffect } from 'react'
import { WorkStationForm } from '../components/Form';
import { StationDetailsView } from '../components/Details';
import { Container } from '@/components/common/container';
import { StationList, type StationStatusFilter } from '../components/StationList';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { useGetWorkstationsQuery } from '@/store/api';
import {
    useGetAllPlanningSectionsQuery,
    useUpdatePlanningSectionMutation,
    useUpdateWorkstationMutation
} from '@/store/api/workstation';
import { PlanningSectionManager } from './components/PlanningSectionManager';
import { MasterDetailLayout } from '@/components/common/master-detail';
import { matchesStatusFilter, type StatusFilter } from '@/components/common/master-detail-utils';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityDetailsView } from './components/ActivityDetailsView';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Check, Plus, Trash2, Edit2, Cpu, ListChecks } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'workstations' | 'activities' | 'stone-types'>('workstations');
    const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
    const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingDescription, setEditingDescription] = useState('');
    const [editingIsActive, setEditingIsActive] = useState<boolean>(true);
    const [workstationStatusFilter, setWorkstationStatusFilter] = useState<StationStatusFilter>('all');
    const [workstationSearch, setWorkstationSearch] = useState('');
    const [activityStatusFilter, setActivityStatusFilter] = useState<StatusFilter>('all');
    const [activitySearch, setActivitySearch] = useState('');

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
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    // Fetch every workstation once; status and search filter on the client by is_active, the same flag
    // the Active/Inactive switch sets (status_id isn't updated by the switch, so filtering on it didn't work).
    const { data: workstationsData, isLoading, isError, refetch } = useGetWorkstationsQuery({
        status_id: null,
        limit: 1000,
    });

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
                attendance_required: ws.attendance_required === true
            } as Station;
        });
    }, [workstationsData]);

    const workstationCounts = useMemo(() => {
        const active = workstations.filter((ws) => ws.status === 'Active').length;
        return { all: workstations.length, active, inactive: workstations.length - active };
    }, [workstations]);

    const visibleWorkstations = useMemo(() => {
        const term = workstationSearch.trim().toLowerCase();
        return workstations.filter((ws) => {
            if (workstationStatusFilter === 'active' && ws.status !== 'Active') return false;
            if (workstationStatusFilter === 'inactive' && ws.status === 'Active') return false;
            if (!term) return true;
            return [ws.workstationName, ws.description, ...(ws.operators ?? [])]
                .some((value) => value?.toLowerCase().includes(term));
        });
    }, [workstations, workstationStatusFilter, workstationSearch]);

    const selectedRole = useMemo(() => {
        if (!selectedRoleId) return null;
        return workstations.find(ws => ws.id === selectedRoleId) || null;
    }, [workstations, selectedRoleId]);

    // Keep a visible workstation selected: pick the first match when nothing (or a filtered-out one) is selected.
    useEffect(() => {
        if (activeTab !== 'workstations' || viewMode === 'new' || viewMode === 'edit') return;
        const selectionVisible = !!selectedRole && visibleWorkstations.some((ws) => ws.id === selectedRole.id);
        if (!selectionVisible && visibleWorkstations.length > 0) {
            setSelectedRoleId(visibleWorkstations[0].id);
            setViewMode('details');
        }
    }, [activeTab, visibleWorkstations, selectedRole, viewMode]);

    const isSectionActive = (section: any) => section.is_active === true || section.is_active === 1;

    const activityCounts = useMemo(() => {
        const active = planningSections.filter(isSectionActive).length;
        return { all: planningSections.length, active, inactive: planningSections.length - active };
    }, [planningSections]);

    const visibleActivities = useMemo(() => {
        const term = activitySearch.trim().toLowerCase();
        return planningSections.filter((section) => {
            if (!matchesStatusFilter(isSectionActive(section), activityStatusFilter)) return false;
            if (!term) return true;
            return [section.plan_name, section.plan_description]
                .some((value) => value?.toLowerCase().includes(term));
        });
    }, [planningSections, activityStatusFilter, activitySearch]);

    // Workstations grouped by shop activity, for the activity list counts and details.
    const workstationsByActivity = useMemo(() => {
        const groups: Record<number, Station[]> = {};
        workstations.forEach((ws) => {
            const sectionId = (ws as any).planning_section_id;
            if (sectionId == null) return;
            (groups[sectionId] ??= []).push(ws);
        });
        return groups;
    }, [workstations]);

    const activityWorkstationCounts = useMemo(
        () => Object.fromEntries(Object.entries(workstationsByActivity).map(([id, list]) => [id, list.length])),
        [workstationsByActivity],
    );

    const selectedActivity = planningSections.find((s) => s.id === selectedActivityId);

    // Keep a visible activity selected, like the workstations tab (not while it is being edited).
    useEffect(() => {
        if (activeTab !== 'activities' || editingSectionId !== null) return;
        const selectionVisible = visibleActivities.some((s) => s.id === selectedActivityId);
        if (!selectionVisible && visibleActivities.length > 0) {
            setSelectedActivityId(visibleActivities[0].id);
        }
    }, [activeTab, visibleActivities, selectedActivityId, editingSectionId]);

    const handleNewRole = () => {
        setViewMode('new');
        setSelectedRoleId(null);
    };

    const handleRoleSelect = (role: Station) => {
        setSelectedRoleId(role.id);
        setViewMode('details');
    };

    const handleEditRole = (role: Station) => {
        setSelectedRoleId(role.id);
        setViewMode('edit');
    };

    const handleCloseForm = () => {
        if (viewMode === 'new') {
            setViewMode('list');
            setSelectedRoleId(null);
        } else if (viewMode === 'edit') {
            setViewMode('list');
            setSelectedRoleId(null);
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
                <div className="flex items-center justify-center h-64 text-muted-foreground">
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
            return <StationDetailsView role={selectedRole} onEdit={handleEditRole} onStatusChange={() => refetch()} />;
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
            <div className="flex items-center justify-center h-64 text-muted-foreground">
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
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4 w-full">
                    <TabsList variant="line" className="w-full gap-6">
                        <TabsTrigger value="workstations" className="px-1 font-semibold">
                            <Cpu /> Workstations
                        </TabsTrigger>
                        <TabsTrigger value="activities" className="px-1 font-semibold">
                            <ListChecks /> Shop Activities
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="workstations" className="mt-4">
                        <MasterDetailLayout
                            flushTop={viewMode === 'details' && !!selectedRole}
                            list={
                                <StationList
                                    roles={visibleWorkstations}
                                    selectedRole={selectedRole}
                                    onRoleSelect={handleRoleSelect}
                                    onNewRole={handleNewRole}
                                    search={workstationSearch}
                                    onSearchChange={setWorkstationSearch}
                                    statusFilter={workstationStatusFilter}
                                    onStatusFilterChange={setWorkstationStatusFilter}
                                    counts={workstationCounts}
                                    isLoading={isLoading}
                                />
                            }
                        >
                            {renderRightContent()}
                        </MasterDetailLayout>
                    </TabsContent>

                    <TabsContent value="activities" className="mt-4">
                        <MasterDetailLayout
                            flushTop={!!selectedActivity && editingSectionId !== selectedActivityId}
                            list={
                                <PlanningSectionManager
                                    planningSections={visibleActivities}
                                    onRefresh={refetchPlanningSections}
                                    selectedActivityId={selectedActivityId}
                                    onSelectActivity={(id) => {
                                        setSelectedActivityId(id);
                                        handleCancelEdit();
                                    }}
                                    search={activitySearch}
                                    onSearchChange={setActivitySearch}
                                    statusFilter={activityStatusFilter}
                                    onStatusFilterChange={setActivityStatusFilter}
                                    counts={activityCounts}
                                    workstationCounts={activityWorkstationCounts}
                                />
                            }
                        >
                            {selectedActivity ? (
                                editingSectionId === selectedActivity.id ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-semibold text-foreground">
                                                Edit Shop Activity: {selectedActivity.plan_name}
                                            </h2>
                                            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Activity Name</Label>
                                            <Input
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                disabled
                                                className="disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={editingDescription}
                                                onChange={(e) => setEditingDescription(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm font-medium">
                                            <Switch checked={editingIsActive} onCheckedChange={setEditingIsActive} />
                                            {editingIsActive ? 'Active' : 'Inactive'}
                                        </label>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                                            <Button variant="primary" onClick={handleSaveEdit}>
                                                <Check className="w-4 h-4" /> Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <ActivityDetailsView
                                        activity={selectedActivity}
                                        workstations={workstationsByActivity[selectedActivity.id] ?? []}
                                        onEdit={() => handleEditActivity(selectedActivity)}
                                        onToggleStatus={() => handleToggleActivityStatus(selectedActivity.id)}
                                    />
                                )
                            ) : (
                                <div className="flex items-center justify-center h-64 text-muted-foreground">
                                    Select an activity from the list to view details
                                </div>
                            )}
                        </MasterDetailLayout>
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
                                                className={`cursor-pointer hover:bg-muted ${selectedStoneTypeId === stoneType.id ? 'border-blue-500 bg-blue-50' : ''}`}
                                                onClick={() => setSelectedStoneTypeId(stoneType.id)}
                                            >
                                                <CardContent className="p-3 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{stoneType.name}</p>
                                                        {stoneType.description && (
                                                            <p className="text-xs text-muted-foreground truncate">{stoneType.description}</p>
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
                                                <p className="text-sm text-muted-foreground">
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
                                                        {/* <div className="space-y-2">
                                                            <Label>Color Code (Hex)</Label>
                                                            <Input
                                                                value={newStoneColorCode}
                                                                onChange={(e) => setNewStoneColorCode(e.target.value)}
                                                                placeholder="#000000"
                                                            />
                                                        </div> */}
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
                                            <div className="flex items-center justify-center h-40 text-muted-foreground">
                                                No colors added yet. Click "Add Color" to get started.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-muted-foreground">
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