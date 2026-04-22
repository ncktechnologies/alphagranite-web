import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateOperatorTaskMutation } from '@/store/api/operator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700">Work Percentage</label>
                        <Select
                            value={percentage.toString()}
                            onValueChange={(val) => setPercentage(parseInt(val))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select work percentage" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {Array.from({ length: 11 }, (_, i) => i * 10).map((val) => (
                                    <SelectItem key={val} value={val.toString()}>
                                        {val}%
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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