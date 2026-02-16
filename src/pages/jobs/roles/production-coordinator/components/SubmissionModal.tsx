// SubmissionModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  useCompleteFinalProgrammingMutation,
  useUpdateFabMutation,
  useCreateFabNoteMutation
} from "@/store/api/job";
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

// Schema with new fields
const submissionSchema = z.object({
  totalSqft: z.string().optional(),
  noOfPieces: z.string().optional(),
  draftNotes: z.string().optional(),
});

type SubmissionData = z.infer<typeof submissionSchema>;

interface UploadedFile {
  id: string | number;
  name: string;
  url?: string;
  file?: File;
}

interface SubmissionModalProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  drafting: any;
  uploadedFiles: UploadedFile[];
  draftStart: Date | null;
  draftEnd: Date | null;
  totalTime?: number;
  fabId: number;
  userId: number;
  fabData: any;
}

export function SubmissionModal({
  open,
  onClose,
  drafting,
  uploadedFiles,
  draftStart,
  draftEnd,
  totalTime = 0,
  fabId,
  userId,
  fabData
}: SubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [completeFinalProgramming] = useCompleteFinalProgrammingMutation();
  const [updateFab] = useUpdateFabMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqft: "",
      noOfPieces: "",
      draftNotes: "",
    },
  });

  const calculateTotalHoursFromTrackedTime = (trackedSeconds: number): number => {
    const hours = trackedSeconds / 3600;
    return parseFloat(hours.toFixed(2));
  };

  const handleFinalSubmit = async (values: SubmissionData) => {
    let fpId = drafting?.id ?? drafting?.data?.id;

    // Ensure final programming session exists
    if (!fpId) {
      try {
        await updateFab({
          id: fabId,
          data: { final_programming_needed: true }
        }).unwrap();
        toast.info('Initializing final programming session...');
      } catch (updateError) {
        console.error('Failed to update FAB for final programming:', updateError);
        toast.error('Failed to initialize final programming session');
        return;
      }
      fpId = drafting?.id ?? drafting?.data?.id;
      if (!fpId) {
        toast.warning('Proceeding without session ID - files may not be saved');
      }
    }

    if (!isConfirmed) {
      toast.error('Please confirm the final programming work is completed by checking the box.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create FAB note if notes exist
      if (values.draftNotes && values.draftNotes.trim()) {
        try {
          await createFabNote({
            fab_id: fabId,
            note: values.draftNotes.trim(),
            stage: "final_programming"
          }).unwrap();
        } catch (noteError) {
          console.error("Error creating fab note:", noteError);
        }
      }

      // 2. Update FAB with total square feet and number of pieces
      const fabUpdateData: any = {};
      if (values.totalSqft) fabUpdateData.total_sqft = parseFloat(values.totalSqft);
      if (values.noOfPieces) fabUpdateData.no_of_pieces = parseInt(values.noOfPieces);

      if (Object.keys(fabUpdateData).length > 0) {
        await updateFab({
          id: fabId,
          data: fabUpdateData
        }).unwrap();
      }

      // 3. Complete the final programming (mark as done)
      await completeFinalProgramming({
        fab_id: fabId,
        data: {
          final_programming_complete: true,
          notes: values.draftNotes || null,
          drafter_id: userId,
          total_hours_final_programmed: calculateTotalHoursFromTrackedTime(totalTime)
          // Note: total_sqft and no_of_pieces are NOT sent here – they go to updateFab
        }
      }).unwrap();

      toast.success('Final programming completed successfully');
      onClose(true);
    } catch (err: any) {
      console.error('Failed to submit final programming:', err);
      onClose(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Submit Final Programming</DialogTitle>
          <span className="ml-3 text-sm font-normal text-gray-500">
            FAB ID: {fabId}
          </span>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 py-4">
            <div className="space-y-4">
              {/* Total Square Feet */}
              <FormField
                control={form.control}
                name="totalSqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Square Feet</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter total square feet"
                        {...field}
                        type="number"
                        step="0.01"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Number of Pieces */}
              <FormField
                control={form.control}
                name="noOfPieces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Pieces</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter number of pieces"
                        {...field}
                        type="number"
                        step="1"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="draftNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add notes about the final programming work..."
                        className="resize-none w-full min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Summary */}
              {uploadedFiles.length > 0 && (
                <div className="rounded-md border p-4">
                  <h3 className="font-medium text-sm mb-2">Files to be submitted</h3>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((file, index) => (
                      <li key={index} className="flex items-center text-muted-foreground">
                        <span className="truncate">{file.name}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} will be submitted
                  </p>
                </div>
              )}

              {/* Confirmation checkbox */}
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="confirm-completion"
                  checked={isConfirmed}
                  onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-completion"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Final programming completed
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isConfirmed}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}