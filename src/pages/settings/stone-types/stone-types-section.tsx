import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Container } from '@/components/common/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardHeading,
    CardTitle,
    CardToolbar,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, X, ChevronLeft, ChevronRight, Gem, Palette } from 'lucide-react';
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

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <div className="relative">
            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="ps-9 pe-8 w-[230px] h-[34px]"
            />
            {value && (
                <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                >
                    <X />
                </Button>
            )}
        </div>
    );
}

function CatalogTile({
    icon,
    swatch,
    title,
    subtitle,
    active,
    onToggle,
    onEdit,
    onDelete,
}: {
    icon: ReactNode;
    swatch?: string;
    title: string;
    subtitle?: string;
    active: boolean;
    onToggle: (active: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className={`group flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-all hover:border-primary/40 hover:shadow-sm ${active ? '' : 'bg-muted/40'}`}
        >
            {swatch ? (
                <div className="size-10 shrink-0 rounded-lg border shadow-xs" style={{ backgroundColor: swatch }} />
            ) : (
                <div
                    className={`size-10 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                    {icon}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold truncate ${active ? 'text-foreground' : 'text-muted-foreground'}`} title={title}>
                    {title}
                </p>
                {subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5" title={subtitle}>{subtitle}</p>
                )}
                <Badge
                    variant={active ? 'success' : 'secondary'}
                    appearance="light"
                    size="sm"
                    className="mt-2"
                >
                    {active ? 'Active' : 'Inactive'}
                </Badge>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Switch checked={active} onCheckedChange={onToggle} aria-label={`Toggle ${title} active`} />
                <div className="flex items-center gap-0.5">
                    <Button
                        mode="icon"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={onEdit}
                        aria-label={`Edit ${title}`}
                    >
                        <Pencil className="size-3.5" />
                    </Button>
                    <Button
                        mode="icon"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={onDelete}
                        aria-label={`Delete ${title}`}
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">{icon}</div>
            <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
        </div>
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
    const [stoneTypeSearch, setStoneTypeSearch] = useState('');

    // Stone colors state
    const [selectedStoneTypeId, setSelectedStoneTypeId] = useState<string>('all');
    const [showAddStoneColorDialog, setShowAddStoneColorDialog] = useState(false);
    const [colorFormStoneTypeId, setColorFormStoneTypeId] = useState<string>('');
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
    const allStoneTypes = useMemo<StoneType[]>(
        () => (Array.isArray(allStoneTypesData) ? allStoneTypesData : []),
        [allStoneTypesData],
    );
    const { data: stoneTypesData, isLoading: isLoadingStoneTypes, refetch: refetchStoneTypes } = useGetStoneTypesQuery({
        limit: 1000,
        status_id: statusIdFor(stoneTypeStatusFilter),
    });
    const stoneTypes = useMemo(() => {
        const list: StoneType[] = Array.isArray(stoneTypesData) ? stoneTypesData : [];
        const term = stoneTypeSearch.trim().toLowerCase();
        if (!term) return list;
        return list.filter((st) => st.name.toLowerCase().includes(term) || st.description?.toLowerCase().includes(term));
    }, [stoneTypesData, stoneTypeSearch]);
    const stoneTypeNames = useMemo(() => new Map(allStoneTypes.map((st) => [st.id, st.name])), [allStoneTypes]);

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
    const closeStoneTypeDialog = () => {
        setShowAddStoneTypeDialog(false);
        setEditingStoneTypeId(null);
        setNewStoneTypeName('');
        setNewStoneTypeDesc('');
    };

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
            closeStoneTypeDialog();
            refetchStoneTypes();
        } catch (error) {
            console.error('Failed to add stone type:', error);
            toast.error('Failed to add stone type');
        }
    };

    const handleEditStoneType = (stoneType: StoneType) => {
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
            closeStoneTypeDialog();
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
    const closeStoneColorDialog = () => {
        setShowAddStoneColorDialog(false);
        setEditingStoneColorId(null);
        setNewStoneColorName('');
        setNewStoneColorCode('');
        setColorFormStoneTypeId('');
    };

    const openAddStoneColorDialog = () => {
        setColorFormStoneTypeId(isTypeFiltered ? selectedStoneTypeId : '');
        setShowAddStoneColorDialog(true);
    };

    const handleAddStoneColor = async () => {
        if (!newStoneColorName.trim()) {
            toast.error('Stone color name is required');
            return;
        }
        if (!colorFormStoneTypeId) {
            toast.error('Please select a stone type for this color');
            return;
        }
        try {
            await createStoneColor({
                name: newStoneColorName.trim(),
                stone_type_id: Number(colorFormStoneTypeId),
                color_code: newStoneColorCode.trim() || undefined,
                description: `Color for ${stoneTypeNames.get(Number(colorFormStoneTypeId)) || 'stone type'}`
            }).unwrap();
            toast.success('Stone color added successfully');
            closeStoneColorDialog();
            refetchStoneColors();
        } catch (error) {
            console.error('Failed to add stone color:', error);
            toast.error('Failed to add stone color');
        }
    };

    const handleEditStoneColor = (color: StoneColor) => {
        setEditingStoneColorId(color.id);
        setNewStoneColorName(color.name);
        setNewStoneColorCode(color.color_code || '');
        setColorFormStoneTypeId(color.stone_type_id ? String(color.stone_type_id) : '');
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
                    stone_type_id: colorFormStoneTypeId ? Number(colorFormStoneTypeId) : undefined
                }
            }).unwrap();
            toast.success('Stone color updated successfully');
            closeStoneColorDialog();
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

    const selectedStoneTypeName = isTypeFiltered ? stoneTypeNames.get(Number(selectedStoneTypeId)) : undefined;

    const stoneTypesEmptyMessage = stoneTypeSearch.trim()
        ? `No stone types match "${stoneTypeSearch.trim()}".`
        : stoneTypeStatusFilter === 'all'
            ? 'No stone types yet. Click "Add Stone Type" to create one.'
            : `No ${stoneTypeStatusFilter} stone types.`;

    const stoneColorsEmptyMessage = colorSearch
        ? `No colors match "${colorSearch}".`
        : stoneColorStatusFilter !== 'all'
            ? `No ${stoneColorStatusFilter} colors${isTypeFiltered ? ' for this stone type' : ''}.`
            : isTypeFiltered
                ? 'No colors for this stone type yet. Click "Add Color" to create one.'
                : 'No colors yet. Click "Add Color" to create one.';

    return (
        <Fragment>
            <PageMenu />
            <Container>
                <div className="mt-6 space-y-5">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Stone Types &amp; Colors</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage the stone types and colors offered when creating FABs. Inactive items stay on existing FABs but can't be picked for new ones.
                        </p>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="stone-types">Stone Types</TabsTrigger>
                            <TabsTrigger value="stone-colors">Stone Colors</TabsTrigger>
                        </TabsList>

                        {/* Stone Types Tab */}
                        <TabsContent value="stone-types" className="mt-4">
                            <Card>
                                <CardHeader className="py-3.5 border-b flex-wrap gap-3">
                                    <CardHeading>
                                        <div className="flex items-center gap-2">
                                            <CardTitle>Stone Types</CardTitle>
                                            <Badge variant="secondary" appearance="light" size="sm">{stoneTypes.length}</Badge>
                                        </div>
                                        <CardDescription>
                                            {stoneTypeStatusFilter === 'all' ? 'All stone types' : `Showing ${stoneTypeStatusFilter} stone types`}
                                        </CardDescription>
                                    </CardHeading>
                                    <CardToolbar className="flex-wrap">
                                        <SearchInput value={stoneTypeSearch} onChange={setStoneTypeSearch} placeholder="Search stone types" />
                                        <StatusFilterSelect value={stoneTypeStatusFilter} onChange={setStoneTypeStatusFilter} />
                                        <Button variant="primary" size="sm" className="h-[34px]" onClick={() => setShowAddStoneTypeDialog(true)}>
                                            <Plus className="size-4" /> Add Stone Type
                                        </Button>
                                    </CardToolbar>
                                </CardHeader>
                                <CardContent className="p-5">
                                    {stoneTypes.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                            {stoneTypes.map((stoneType) => (
                                                <CatalogTile
                                                    key={stoneType.id}
                                                    icon={<Gem className="size-5" />}
                                                    title={stoneType.name}
                                                    subtitle={stoneType.description}
                                                    active={isActive(stoneType)}
                                                    onToggle={(checked) => handleToggleStoneTypeStatus(stoneType, checked)}
                                                    onEdit={() => handleEditStoneType(stoneType)}
                                                    onDelete={() => handleDeleteStoneType(stoneType.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Gem className="size-5" />}
                                            message={isLoadingStoneTypes ? 'Loading stone types...' : stoneTypesEmptyMessage}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Stone Colors Tab */}
                        <TabsContent value="stone-colors" className="mt-4">
                            <Card>
                                <CardHeader className="py-3.5 border-b flex-wrap gap-3">
                                    <CardHeading>
                                        <div className="flex items-center gap-2">
                                            <CardTitle>Stone Colors</CardTitle>
                                            <Badge variant="secondary" appearance="light" size="sm">{colorTotal}</Badge>
                                        </div>
                                        <CardDescription>
                                            {selectedStoneTypeName ? `Colors for ${selectedStoneTypeName}` : 'Colors across all stone types'}
                                        </CardDescription>
                                    </CardHeading>
                                    <CardToolbar className="flex-wrap">
                                        <SearchInput value={colorSearchInput} onChange={setColorSearchInput} placeholder="Search colors" />
                                        <Select value={selectedStoneTypeId} onValueChange={setSelectedStoneTypeId}>
                                            <SelectTrigger className="w-[200px] h-[34px]">
                                                <SelectValue placeholder="All stone types" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px] overflow-y-auto">
                                                <SelectItem value="all">All Stone Types</SelectItem>
                                                {allStoneTypes.map((stoneType) => (
                                                    <SelectItem key={stoneType.id} value={String(stoneType.id)}>
                                                        {stoneType.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <StatusFilterSelect value={stoneColorStatusFilter} onChange={setStoneColorStatusFilter} />
                                        <Button variant="primary" size="sm" className="h-[34px]" onClick={openAddStoneColorDialog}>
                                            <Plus className="size-4" /> Add Color
                                        </Button>
                                    </CardToolbar>
                                </CardHeader>
                                <CardContent className="p-5">
                                    {stoneColors.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                            {stoneColors.map((color) => (
                                                <CatalogTile
                                                    key={color.id}
                                                    icon={<Palette className="size-5" />}
                                                    swatch={color.color_code || undefined}
                                                    title={color.name}
                                                    subtitle={color.stone_type_id ? stoneTypeNames.get(color.stone_type_id) : undefined}
                                                    active={isActive(color)}
                                                    onToggle={(checked) => handleToggleStoneColorStatus(color, checked)}
                                                    onEdit={() => handleEditStoneColor(color)}
                                                    onDelete={() => handleDeleteStoneColor(color.id)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={<Palette className="size-5" />}
                                            message={isFetchingStoneColors ? 'Loading colors...' : stoneColorsEmptyMessage}
                                        />
                                    )}
                                </CardContent>
                                {colorTotal > 0 && (
                                    <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t py-3 text-sm text-muted-foreground">
                                        <span>
                                            Showing <span className="font-medium text-foreground">{colorPageIndex * colorPageSize + 1}–{Math.min((colorPageIndex + 1) * colorPageSize, colorTotal)}</span> of{' '}
                                            <span className="font-medium text-foreground">{colorTotal}</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span>Per page</span>
                                            <Select value={String(colorPageSize)} onValueChange={(v) => setColorPageSize(Number(v))}>
                                                <SelectTrigger className="w-[72px] h-[34px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COLOR_PAGE_SIZES.map((size) => (
                                                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                mode="icon"
                                                variant="outline"
                                                className="h-[34px] w-[34px]"
                                                disabled={colorPageIndex === 0}
                                                onClick={() => setColorPageIndex(colorPageIndex - 1)}
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeft className="size-4" />
                                            </Button>
                                            <span className="min-w-[90px] text-center">Page {colorPageIndex + 1} of {colorPageCount}</span>
                                            <Button
                                                mode="icon"
                                                variant="outline"
                                                className="h-[34px] w-[34px]"
                                                disabled={colorPageIndex + 1 >= colorPageCount}
                                                onClick={() => setColorPageIndex(colorPageIndex + 1)}
                                                aria-label="Next page"
                                            >
                                                <ChevronRight className="size-4" />
                                            </Button>
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Add / edit stone type */}
                <Dialog open={showAddStoneTypeDialog} onOpenChange={(open) => (open ? setShowAddStoneTypeDialog(true) : closeStoneTypeDialog())}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStoneTypeId ? 'Edit Stone Type' : 'Add Stone Type'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
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
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={closeStoneTypeDialog}>Cancel</Button>
                                <Button variant="primary" onClick={editingStoneTypeId ? handleUpdateStoneType : handleAddStoneType}>
                                    {editingStoneTypeId ? 'Save Changes' : 'Add Stone Type'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Add / edit stone color */}
                <Dialog open={showAddStoneColorDialog} onOpenChange={(open) => (open ? setShowAddStoneColorDialog(true) : closeStoneColorDialog())}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStoneColorId ? 'Edit Stone Color' : 'Add Stone Color'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Stone Type *</Label>
                                <Select value={colorFormStoneTypeId} onValueChange={setColorFormStoneTypeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stone type" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px] overflow-y-auto">
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
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={closeStoneColorDialog}>Cancel</Button>
                                <Button variant="primary" onClick={editingStoneColorId ? handleUpdateStoneColor : handleAddStoneColor}>
                                    {editingStoneColorId ? 'Save Changes' : 'Add Color'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </Container>
        </Fragment>
    );
}

export default StoneTypesSection;
