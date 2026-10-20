import { Fragment, useEffect, useState } from 'react';
import { Container } from '@/components/common/container';
import { SETTINGS_NAV } from '@/config/menu.config';
import { Toolbar, ToolbarBreadcrumbs, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
    useGetStoneTypesQuery,
    useGetStoneColorsPageQuery,
    useCreateStoneTypeMutation,
    useUpdateStoneTypeMutation,
    useDeleteStoneTypeMutation,
    useCreateStoneColorMutation,
    useUpdateStoneColorMutation,
    useDeleteStoneColorMutation,
    STONE_STATUS,
    type StoneColor,
    type StoneType,
} from '@/store/api/job';
import { PageMenu } from '../page-menu';

type StatusFilter = 'all' | 'active' | 'inactive';

const statusIdFor = (filter: StatusFilter) =>
    filter === 'active' ? STONE_STATUS.ACTIVE : filter === 'inactive' ? STONE_STATUS.INACTIVE : undefined;

const isActive = (item: { status_id?: number }) => item.status_id === STONE_STATUS.ACTIVE;

const COLOR_PAGE_SIZES = [24, 48, 96];

function StatusFilterSelect({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
    return (
        <Select value={value} onValueChange={(v) => onChange(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] h-[34px]">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
        </Select>
    );
}

export function StoneTypesSection() {
    const [activeTab, setActiveTab] = useState('stone-types');
    const [stoneTypeStatusFilter, setStoneTypeStatusFilter] = useState<StatusFilter>('all');
    const [stoneColorStatusFilter, setStoneColorStatusFilter] = useState<StatusFilter>('all');

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
    const [colorSearchInput, setColorSearchInput] = useState('');
    const [colorSearch, setColorSearch] = useState('');
    const [colorPageSize, setColorPageSize] = useState(COLOR_PAGE_SIZES[1]);
    // The page belongs to one set of filters; changing any filter starts again at the first page.
    const colorFilterKey = JSON.stringify([selectedStoneTypeId, stoneColorStatusFilter, colorSearch, colorPageSize]);
    const [colorPageState, setColorPageState] = useState({ key: colorFilterKey, index: 0 });
    const colorPageIndex = colorPageState.key === colorFilterKey ? colorPageState.index : 0;
    const setColorPageIndex = (index: number) => setColorPageState({ key: colorFilterKey, index });

    useEffect(() => {
        const timer = setTimeout(() => setColorSearch(colorSearchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [colorSearchInput]);

    // Fetch every stone type (for dropdowns and type names) and the ones shown on the Stone Types tab
    const { data: allStoneTypesData } = useGetStoneTypesQuery({ limit: 1000 });
    const allStoneTypes: StoneType[] = Array.isArray(allStoneTypesData) ? allStoneTypesData : [];
    const { data: stoneTypesData, refetch: refetchStoneTypes } = useGetStoneTypesQuery({
        limit: 1000,
        status_id: statusIdFor(stoneTypeStatusFilter),
    });
    const stoneTypes: any[] = (stoneTypesData && Array.isArray(stoneTypesData) ? stoneTypesData : []) || [];

    // Fetch one page of stone colors for the current filters
    const isTypeFiltered = Boolean(selectedStoneTypeId) && selectedStoneTypeId !== 'all';
    const { data: stoneColorPage, isFetching: isFetchingStoneColors, refetch: refetchStoneColors } = useGetStoneColorsPageQuery({
        skip: colorPageIndex * colorPageSize,
        limit: colorPageSize,
        stone_type_id: isTypeFiltered ? Number(selectedStoneTypeId) : undefined,
        status_id: statusIdFor(stoneColorStatusFilter),
        search: colorSearch || undefined,
    });
    const stoneColors: StoneColor[] = stoneColorPage?.data ?? [];
    const colorTotal = stoneColorPage?.total ?? 0;
    const colorPageCount = Math.max(1, Math.ceil(colorTotal / colorPageSize));

    // After a delete empties the last page, step back to the new last page.
    useEffect(() => {
        if (!isFetchingStoneColors && colorPageIndex > 0 && colorPageIndex >= colorPageCount) {
            setColorPageState({ key: colorFilterKey, index: colorPageCount - 1 });
        }
    }, [isFetchingStoneColors, colorPageIndex, colorPageCount, colorFilterKey]);

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

    const handleToggleStoneTypeStatus = async (stoneType: StoneType, active: boolean) => {
        try {
            await updateStoneType({
                id: stoneType.id,
                data: { status_id: active ? STONE_STATUS.ACTIVE : STONE_STATUS.INACTIVE }
            }).unwrap();
            toast.success(`${stoneType.name} marked ${active ? 'active' : 'inactive'}`);
        } catch (error) {
            console.error('Failed to update stone type status:', error);
            toast.error('Failed to update stone type status');
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
                description: `Color for ${allStoneTypes.find((st) => st.id === Number(selectedStoneTypeId))?.name || 'stone type'}`
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
        } catch (error) {
            console.error('Failed to update stone color:', error);
            toast.error('Failed to update stone color');
        }
    };

    const handleToggleStoneColorStatus = async (color: StoneColor, active: boolean) => {
        try {
            await updateStoneColor({
                id: color.id,
                data: { status_id: active ? STONE_STATUS.ACTIVE : STONE_STATUS.INACTIVE }
            }).unwrap();
            toast.success(`${color.name} marked ${active ? 'active' : 'inactive'}`);
        } catch (error) {
            console.error('Failed to update stone color status:', error);
            toast.error('Failed to update stone color status');
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

    return (
        <Fragment>
            <PageMenu />
            <Container>


                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6" >
                    <CardHeader className="py-3.5 border-b flex flex-row items-center justify-between">
                        <CardHeading>
                            <TabsList className="mb-6">
                                <TabsTrigger value="stone-types">Stone Types</TabsTrigger>
                                <TabsTrigger value="stone-colors">Stone Colors</TabsTrigger>
                            </TabsList>
                        </CardHeading>
                    </CardHeader>

                    {/* Stone Types Tab */}
                    <TabsContent value="stone-types" className="mt-0">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Stone Types</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {stoneTypes.length} {stoneTypeStatusFilter === 'all' ? '' : `${stoneTypeStatusFilter} `}stone type(s)
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusFilterSelect value={stoneTypeStatusFilter} onChange={setStoneTypeStatusFilter} />
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stoneTypes.map((stoneType: any) => (
                                    <Card key={stoneType.id} className={isActive(stoneType) ? undefined : 'opacity-60'}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-lg">{stoneType.name}</p>
                                                        {!isActive(stoneType) && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                                    </div>
                                                    {stoneType.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{stoneType.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Switch
                                                        checked={isActive(stoneType)}
                                                        onCheckedChange={(checked) => handleToggleStoneTypeStatus(stoneType, checked)}
                                                        aria-label={`Toggle ${stoneType.name} active`}
                                                    />
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
                                <div className="flex items-center justify-center h-40 text-muted-foreground">
                                    {stoneTypeStatusFilter === 'all'
                                        ? 'No stone types added yet. Click "Add Stone Type" to get started.'
                                        : `No ${stoneTypeStatusFilter} stone types.`}
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
                                    <p className="text-sm text-muted-foreground">
                                        {isTypeFiltered
                                            ? `${colorTotal} color(s) for ${allStoneTypes.find((st) => st.id === Number(selectedStoneTypeId))?.name || 'selected type'}`
                                            : `${colorTotal} total color(s)`
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
                                                        {allStoneTypes.map((stoneType) => (
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

                            {/* Filter by stone type */}
                            <div className="flex items-center gap-4">
                                <Label className="text-sm font-medium">Filter by Stone Type:</Label>
                                <Select value={selectedStoneTypeId} onValueChange={setSelectedStoneTypeId}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="All colors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Colors</SelectItem>
                                        {allStoneTypes.map((stoneType) => (
                                            <SelectItem key={stoneType.id} value={String(stoneType.id)}>
                                                {stoneType.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <StatusFilterSelect value={stoneColorStatusFilter} onChange={setStoneColorStatusFilter} />
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        value={colorSearchInput}
                                        onChange={(e) => setColorSearchInput(e.target.value)}
                                        placeholder="Search colors..."
                                        className="pl-8 h-[34px]"
                                    />
                                </div>
                            </div>

                            {/* Display colors */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {stoneColors.map((color) => (
                                    <Card key={color.id} className={isActive(color) ? 'relative' : 'relative opacity-60'}>
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
                                                            {!isActive(color) && (
                                                                <Badge variant="secondary" className="text-xs mt-1">Inactive</Badge>
                                                            )}
                                                            {color.color_code && (
                                                                <Badge variant="secondary" className="text-xs mt-1">
                                                                    {color.color_code}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {color.stone_type_id && (
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Type: {allStoneTypes.find((st) => st.id === color.stone_type_id)?.name || 'Unknown'}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Switch
                                                        checked={isActive(color)}
                                                        onCheckedChange={(checked) => handleToggleStoneColorStatus(color, checked)}
                                                        aria-label={`Toggle ${color.name} active`}
                                                    />
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

                            {stoneColors.length === 0 && !isFetchingStoneColors && (
                                <div className="flex items-center justify-center h-40 text-muted-foreground">
                                    {colorSearch
                                        ? `No colors match "${colorSearch}".`
                                        : stoneColorStatusFilter !== 'all'
                                            ? `No ${stoneColorStatusFilter} colors${isTypeFiltered ? ' for this stone type' : ''}.`
                                            : isTypeFiltered
                                                ? 'No colors for this stone type. Click "Add Color" to get started.'
                                                : 'No colors added yet. Click "Add Color" to get started.'
                                    }
                                </div>
                            )}

                            {colorTotal > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm text-muted-foreground">
                                    <span>
                                        Showing {colorPageIndex * colorPageSize + 1}–{Math.min((colorPageIndex + 1) * colorPageSize, colorTotal)} of {colorTotal}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span>Per page</span>
                                        <Select value={String(colorPageSize)} onValueChange={(v) => setColorPageSize(Number(v))}>
                                            <SelectTrigger className="w-[80px] h-[34px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLOR_PAGE_SIZES.map((size) => (
                                                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-[34px] w-[34px] p-0"
                                            disabled={colorPageIndex === 0}
                                            onClick={() => setColorPageIndex(colorPageIndex - 1)}
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span>Page {colorPageIndex + 1} of {colorPageCount}</span>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-[34px] w-[34px] p-0"
                                            disabled={colorPageIndex + 1 >= colorPageCount}
                                            onClick={() => setColorPageIndex(colorPageIndex + 1)}
                                            aria-label="Next page"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
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
