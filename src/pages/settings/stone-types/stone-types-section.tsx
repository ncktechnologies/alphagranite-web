import { Fragment, useState } from 'react';
import { Container } from '@/components/common/container';
import { SETTINGS_NAV } from '@/config/menu.config';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    useGetStoneTypesQuery,
    useGetStoneColorsQuery,
    useGetStoneColorsByStoneTypeQuery,
    useCreateStoneTypeMutation,
    useUpdateStoneTypeMutation,
    useDeleteStoneTypeMutation,
    useCreateStoneColorMutation,
    useUpdateStoneColorMutation,
    useDeleteStoneColorMutation,
} from '@/store/api/job';
import { PageMenu } from '../page-menu';

export function StoneTypesSection() {
    const [activeTab, setActiveTab] = useState('stone-types');
    
    // Stone types state
    const [showAddStoneTypeDialog, setShowAddStoneTypeDialog] = useState(false);
    const [newStoneTypeName, setNewStoneTypeName] = useState('');
    const [newStoneTypeDesc, setNewStoneTypeDesc] = useState('');
    const [editingStoneTypeId, setEditingStoneTypeId] = useState<number | null>(null);

    // Stone colors state
    const [selectedStoneTypeId, setSelectedStoneTypeId] = useState<string>('all');
    const [showAddStoneColorDialog, setShowAddStoneColorDialog] = useState(false);
    const [newStoneColorName, setNewStoneColorName] = useState('');
    const [newStoneColorCode, setNewStoneColorCode] = useState('');
    const [editingStoneColorId, setEditingStoneColorId] = useState<number | null>(null);

    // Fetch stone types
    const { data: stoneTypesData, refetch: refetchStoneTypes } = useGetStoneTypesQuery({ limit: 1000 });
    const stoneTypes: any[] = (stoneTypesData && Array.isArray(stoneTypesData) ? stoneTypesData : []) || [];

    // Fetch all stone colors
    const { data: allStoneColorsData, refetch: refetchAllStoneColors } = useGetStoneColorsQuery({ limit: 1000 });
    const allStoneColors: any[] = (allStoneColorsData && Array.isArray(allStoneColorsData) ? allStoneColorsData : []) || [];

    // Fetch stone colors for selected stone type
    const { data: stoneColorsData, refetch: refetchStoneColors } = useGetStoneColorsByStoneTypeQuery(
        { stone_type_id: Number(selectedStoneTypeId), limit: 1000 },
        { skip: !selectedStoneTypeId || selectedStoneTypeId === 'all' }
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
            refetchStoneTypes();
        } catch (error) {
            console.error('Failed to delete stone type:', error);
            toast.error('Failed to delete stone type');
        }
    };

    // Stone Color handlers
    const handleAddStoneColor = async () => {
        if (!newStoneColorName.trim()) {
            toast.error('Stone color name is required');
            return;
        }
        if (!selectedStoneTypeId || selectedStoneTypeId === 'all') {
            toast.error('Please select a stone type for this color');
            return;
        }
        try {
            await createStoneColor({
                name: newStoneColorName.trim(),
                stone_type_id: Number(selectedStoneTypeId),
                color_code: newStoneColorCode.trim() || undefined,
                description: `Color for ${stoneTypes.find((st: any) => st.id === Number(selectedStoneTypeId))?.name || 'stone type'}`
            }).unwrap();
            toast.success('Stone color added successfully');
            setNewStoneColorName('');
            setNewStoneColorCode('');
            setShowAddStoneColorDialog(false);
            refetchStoneColors();
            refetchAllStoneColors();
        } catch (error) {
            console.error('Failed to add stone color:', error);
            toast.error('Failed to add stone color');
        }
    };

    const handleEditStoneColor = (color: any) => {
        setEditingStoneColorId(color.id);
        setNewStoneColorName(color.name);
        setNewStoneColorCode(color.color_code || '');
        setSelectedStoneTypeId(color.stone_type_id ? String(color.stone_type_id) : 'all');
        setShowAddStoneColorDialog(true);
    };

    const handleUpdateStoneColor = async () => {
        if (!editingStoneColorId || !newStoneColorName.trim()) return;
        try {
            await updateStoneColor({
                id: editingStoneColorId,
                data: {
                    name: newStoneColorName.trim(),
                    color_code: newStoneColorCode.trim() || undefined,
                    stone_type_id: selectedStoneTypeId && selectedStoneTypeId !== 'all' ? Number(selectedStoneTypeId) : undefined
                }
            }).unwrap();
            toast.success('Stone color updated successfully');
            setNewStoneColorName('');
            setNewStoneColorCode('');
            setEditingStoneColorId(null);
            setShowAddStoneColorDialog(false);
            refetchStoneColors();
            refetchAllStoneColors();
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
            refetchAllStoneColors();
        } catch (error) {
            console.error('Failed to delete stone color:', error);
            toast.error('Failed to delete stone color');
        }
    };

    return (
        <Fragment>
            <PageMenu />
            <Container>
               

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6" >
                    <TabsList className="mb-6">
                        <TabsTrigger value="stone-types">Stone Types</TabsTrigger>
                        <TabsTrigger value="stone-colors">Stone Colors</TabsTrigger>
                    </TabsList>

                    {/* Stone Types Tab */}
                    <TabsContent value="stone-types" className="mt-0">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Stone Types</h3>
                                    <p className="text-sm text-gray-500">
                                        {stoneTypes.length} stone type(s) available
                                    </p>
                                </div>
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
                                            <Plus className="w-4 h-4 mr-1" /> Add Stone Type
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
                                                    placeholder="e.g., Granite, Marble, Quartz"
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

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stoneTypes.map((stoneType: any) => (
                                    <Card key={stoneType.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-lg">{stoneType.name}</p>
                                                    {stoneType.description && (
                                                        <p className="text-sm text-gray-500 mt-1">{stoneType.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleEditStoneType(stoneType)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-600"
                                                        onClick={() => handleDeleteStoneType(stoneType.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {stoneTypes.length === 0 && (
                                <div className="flex items-center justify-center h-40 text-gray-500">
                                    No stone types added yet. Click "Add Stone Type" to get started.
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Stone Colors Tab */}
                    <TabsContent value="stone-colors" className="mt-0">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Stone Colors</h3>
                                    <p className="text-sm text-gray-500">
                                        {selectedStoneTypeId && selectedStoneTypeId !== 'all'
                                            ? `${stoneColors.length} color(s) for ${stoneTypes.find((st: any) => st.id === Number(selectedStoneTypeId))?.name || 'selected type'}`
                                            : `${allStoneColors.length} total color(s) available`
                                        }
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
                                                <Label>Stone Type *</Label>
                                                <Select value={selectedStoneTypeId} onValueChange={setSelectedStoneTypeId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select stone type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {stoneTypes.map((stoneType: any) => (
                                                            <SelectItem key={stoneType.id} value={String(stoneType.id)}>
                                                                {stoneType.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
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

                            {/* Filter by stone type */}
                            <div className="flex items-center gap-4">
                                <Label className="text-sm font-medium">Filter by Stone Type:</Label>
                                <Select value={selectedStoneTypeId} onValueChange={setSelectedStoneTypeId}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="All colors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Colors</SelectItem>
                                        {stoneTypes.map((stoneType: any) => (
                                            <SelectItem key={stoneType.id} value={String(stoneType.id)}>
                                                {stoneType.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Display colors */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {(selectedStoneTypeId && selectedStoneTypeId !== 'all' ? stoneColors : allStoneColors).map((color: any) => (
                                    <Card key={color.id} className="relative">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {color.color_code && (
                                                            <div
                                                                className="w-8 h-8 rounded border shadow-sm"
                                                                style={{ backgroundColor: color.color_code }}
                                                            />
                                                        )}
                                                        <div>
                                                            <p className="font-semibold">{color.name}</p>
                                                            {color.color_code && (
                                                                <Badge variant="secondary" className="text-xs mt-1">
                                                                    {color.color_code}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {color.stone_type_id && (
                                                        <p className="text-xs text-gray-500 mt-2">
                                                            Type: {stoneTypes.find((st: any) => st.id === color.stone_type_id)?.name || 'Unknown'}
                                                        </p>
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

                            {(selectedStoneTypeId && selectedStoneTypeId !== 'all' ? stoneColors : allStoneColors).length === 0 && (
                                <div className="flex items-center justify-center h-40 text-gray-500">
                                    {selectedStoneTypeId && selectedStoneTypeId !== 'all'
                                        ? 'No colors for this stone type. Click "Add Color" to get started.'
                                        : 'No colors added yet. Click "Add Color" to get started.'
                                    }
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </Container>
        </Fragment>
    );
}

export default StoneTypesSection;
