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
import { useAddFilesToFinalProgrammingMutation, useCompleteFinalProgrammingMutation, useUpdateFabMutation } from '@/store/api/job';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const submissionSchema = z.object({
  wjTimeMinutes: z.string().optional(),
  draftNotes: z.string().optional(),
});

type SubmissionData = z.infer<typeof submissionSchema>;

interface UploadedFile {
  id: string | number;
  name: string;
  url?: string;
  file?: File; // Add the actual File object
}

interface SubmissionModalProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  drafting: any; // the existing drafting response object (drafting.data must exist)
  uploadedFiles: UploadedFile[]; // uploaded file meta (must contain .id and .file)
  draftStart: Date | null;
  draftEnd: Date | null;
  totalTime?: number; // tracked total time in seconds
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

  const [addFilesToFinalProgramming] = useAddFilesToFinalProgrammingMutation();
  const [completeFinalProgramming] = useCompleteFinalProgrammingMutation();
  const [updateFab] = useUpdateFabMutation();

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      wjTimeMinutes: "",
      draftNotes: "",
    },
  });

  // Calculate total hours from tracked time instead of date difference
  const calculateTotalHoursFromTrackedTime = (trackedSeconds: number): number => {
    const hours = trackedSeconds / 3600;
    return parseFloat(hours.toFixed(2));
  };

  const handleFinalSubmit = async (values: SubmissionData) => {
    // Check if we have a final programming ID
    let fpId = drafting?.id ?? drafting?.data?.id;
    
    // If no final programming session exists, we may need to create one by updating the FAB
    if (!fpId) {
      try {
        // Update FAB to ensure final programming is needed
        await updateFab({
          id: fabId,
          data: {
            final_programming_needed: true
          }
        }).unwrap();
        
        // Try to get the session again (this might trigger creation on the backend)
        toast.info('Initializing final programming session...');
        // Note: We won't wait for this as it's likely the backend creates it asynchronously
      } catch (updateError) {
        console.error('Failed to update FAB for final programming:', updateError);
        toast.error('Failed to initialize final programming session');
        return;
      }
      
      // Try to get the fpId again after a short delay
      // In a real implementation, you might want to poll or have a better mechanism
      fpId = drafting?.id ?? drafting?.data?.id;
      
      // If still no fpId, we'll have to proceed without it and let the complete endpoint handle it
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
      // Filter only files that haven't been uploaded yet (no ID or temporary ID)
      const filesToUpload = uploadedFiles.filter(f => 
        !f.id || // No ID at all
        typeof f.id === 'string' && f.id.includes('temp') || // Temporary ID
        f.file instanceof File // Has File object (not yet uploaded)
      );

      // Upload files if there are any to upload AND we have an fpId
      if (filesToUpload.length > 0 && fpId) {
        const fileObjects = filesToUpload.map(f => f.file as File);
        
        try {
          await addFilesToFinalProgramming({
            fp_id: fpId,
            files: fileObjects
          }).unwrap();
          toast.success('Files uploaded successfully');
        } catch (fileError) {
          console.error('File upload failed:', fileError);
          toast.error('Failed to upload files');
          throw fileError;
        }
      } else if (filesToUpload.length > 0 && !fpId) {
        toast.warning('Cannot upload files - no session ID available');
      }

      // Complete the final programming with data
      await completeFinalProgramming({
        fab_id: fabId,
        data: {
          final_programming_complete: true,
          notes: values.draftNotes || null,
          drafter_id: userId,
          wj_time_minutes: values.wjTimeMinutes ? parseInt(values.wjTimeMinutes) : null,
          // Use the tracked totalTime passed from parent component for accurate time calculation
          total_hours_final_programmed: calculateTotalHoursFromTrackedTime(totalTime)
        }
      }).unwrap();

      toast.success('Final programming completed successfully');
      onClose(true);
    } catch (err: any) {
      console.error('Failed to submit final programming:', err);
      toast.error(err?.data?.message || 'Failed to submit final programming work');
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
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 py-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="wjTimeMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WJ Time (Minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter waterjet time in minutes" 
                        {...field} 
                        type="number"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  I confirm that the final programming work is completed
                </label>
              </div>
            </div>

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