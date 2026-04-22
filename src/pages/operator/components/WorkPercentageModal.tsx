import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';

interface WorkPercentageModalProps {
    open: boolean;
    currentPercentage: number;
    onSave: (percentage: number, notes?: string) => void;
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        defaultValues: {
            work_percentage: currentPercentage,
            notes: '',
        },
    });

    const percentage = form.watch('work_percentage');
    const notes = form.watch('notes');

    // Reset form when modal opens with fresh data
    useEffect(() => {
        if (open) {
            form.reset({
                work_percentage: currentPercentage,
                notes: '',
            });
        }
    }, [open, currentPercentage, form]);

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Just pass the data back to parent, don't make API call here
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UX
            onSave(percentage, notes);
        } catch (error: any) {
            console.error('Failed to save work percentage:', error);
            toast.error('Failed to save work percentage');
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

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6 py-4">
                        <div className="flex flex-col gap-2">
                            <FormLabel>Work Percentage</FormLabel>
                            <FormField
                                control={form.control}
                                name="work_percentage"
                                render={() => (
                                    <FormItem>
                                        <FormControl>
                                            <Select
                                                value={percentage.toString()}
                                                onValueChange={(val) => form.setValue('work_percentage', parseInt(val))}
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
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes <span className="text-gray-400 font-normal">(optional)</span></FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add notes about your progress..."
                                            className="resize-none min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
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
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}