// WorkPercentageModal.tsx
// Shown when the timer is paused.
// Only records work percentage — does NOT stop the timer.
// Toast fires in the parent AFTER this modal is submitted.

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface WorkPercentageModalProps {
    open: boolean;
    currentPercentage: number;
    onSave: (percentage: number) => void; // parent handles toast + state update
    onClose: () => void;
}

export function WorkPercentageModal({
    open,
    currentPercentage,
    onSave,
    onClose,
}: WorkPercentageModalProps) {
    const [percentage, setPercentage] = useState(currentPercentage);

    const handleSave = () => {
        onSave(percentage); // parent fires toast after this
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <div className="border-b pb-3">
                        <DialogTitle className="text-[15px] font-semibold">
                            Work Progress
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-0.5">
                            How much of this task is complete?
                        </p>
                    </div>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* Percentage display */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-5xl font-bold text-[#111827] tabular-nums">
                            {percentage}%
                        </span>
                        <span className="text-sm text-gray-500">Work completed</span>
                    </div>

                    {/* Slider */}
                    <div className="px-2">
                        <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[percentage]}
                            onValueChange={([val]) => setPercentage(val)}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Quick-pick buttons */}
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

                <div className="flex justify-end gap-3 pt-2 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="bg-[#111827] hover:bg-[#1f2937]"
                    >
                        Save &amp; Pause
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}