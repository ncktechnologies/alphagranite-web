import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetFabByIdQuery, useUpdateFabStageMutation } from '@/store/api/job';
import { toast } from 'sonner';
import { Documents } from '@/pages/shop/components/files';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface MoveStageModalProps {
    open: boolean;
    onClose: () => void;
    fabId: number | null;
}

export const MoveStageModal = ({ open, onClose, fabId }: MoveStageModalProps) => {
    const [selectedStage, setSelectedStage] = useState<string>('');
    const [updateFabStage, { isLoading: isUpdating }] = useUpdateFabStageMutation();

    const { data: fabData, isLoading: isFabLoading } = useGetFabByIdQuery(fabId!, {
        skip: !fabId,
    });

    const stages = [
        { value: 'templating', label: 'Templating' },
        { value: 'pre_draft_review', label: 'Pre-Draft Review' },
        { value: 'drafting', label: 'Drafting' },
        { value: 'sales_ct', label: 'Sales CT' },
        { value: 'slab_smith_request', label: 'Slab Smith Request' },
        { value: 'cut_list', label: 'Final Programming' },
        { value: 'cutting', label: 'Cutting' },
        { value: 'revisions', label: 'Revisions' },
        { value: 'draft', label: 'Draft' },
    ];

    const payload = {
        current_stage: selectedStage,
    };
    const handleStageChange = async () => {
        if (!fabId || !selectedStage) return;

        try {
            await updateFabStage({ fab_id: fabId, data: payload }).unwrap();
            toast.success('Stage updated successfully');
            onClose();
        } catch (error) {
            console.error('Failed to update stage:', error);
            toast.error('Failed to update stage');
        }
    };

    const draftData = (fabData as any)?.draft_data;

    const notes = useMemo(() => {
        if (!fabData?.fab_notes) return [];
        return fabData.fab_notes;
    }, [fabData]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Move Fab Stage</DialogTitle>
                </DialogHeader>

                {isFabLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : fabData ? (
                    <div className="space-y-6">
                        <div className="flex items-center">
                            <div className="flex items-center">
                                <h3 className="text-base font-medium">Fab Id:</h3>
                                <p className="text-base font-medium ml-2">{fabData.id || 'N/A'}</p>
                            </div>
                        </div>
                        {/* Stage Selection */}
                        <div className="flex justify-center">
                            <div className="flex items-center gap-4">
                                <Select value={selectedStage || fabData.current_stage || ''} onValueChange={setSelectedStage}>
                                    <SelectTrigger className="w-2xl">
                                        <SelectValue placeholder="Select new stage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.value} value={stage.value}>
                                                {stage.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleStageChange} disabled={isUpdating} className="w-[150px] h-10 text-base">
                                    {isUpdating ? 'Updating...' : 'Move Stage'}
                                </Button>
                            </div>
                        </div>

                        {/* Fab Details Grid */}



                    </div>
                ) : (
                    <div className="p-4 text-center text-red-500">Failed to load FAB data</div>
                )}
            </DialogContent>
        </Dialog>
    );
};
