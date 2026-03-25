import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateOperatorTaskMutation } from '@/store/api/operator';

interface WorkPercentageModalProps {
    open: boolean;
    currentPercentage: number;
    onSave: (percentage: number) => void;
    onClose: () => void;
    // ✅ New props for the update endpoint
    operatorId: number;
    workstationId: number;
    taskId: number;
}

export function WorkPercentageModal({
    open,
    currentPercentage,
    onSave,
    onClose,
    operatorId,
    workstationId,
    taskId,
}: WorkPercentageModalProps) {
    const [percentage, setPercentage] = useState(currentPercentage);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateOperatorTask] = useUpdateOperatorTaskMutation();

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // ✅ Update the task with the new work percentage
            await updateOperatorTask({
                operator_id: operatorId,
                workstation_id: workstationId,
                task_id: taskId,
                data: {
                    work_percentage: percentage,
                    // optionally include other fields like notes, but keep as is
                },
            }).unwrap();

            toast.success(`Work percentage updated to ${percentage}%`);
            onSave(percentage);
            onClose();
        } catch (error: any) {
            console.error('Failed to update work percentage:', error);
            toast.error(error?.data?.message || 'Failed to update work percentage');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Work Percentage</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex items-center justify-center">
                        <span className="text-4xl font-bold text-[#111827] tabular-nums">
                            {percentage}%
                        </span>
                    </div>
                    <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[percentage]}
                        onValueChange={([val]) => setPercentage(val)}
                        className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        {[25, 50, 75, 90, 100].map((val) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setPercentage(val)}
                                className={`text-xs py-1.5 rounded-md border transition-colors ${
                                    percentage === val
                                        ? 'bg-[#111827] text-white border-[#111827]'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                {val}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center gap-2">
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}