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
import { useUpdateSlabSmithMutation, useAddFilesToSlabSmithMutation, useCreateSlabSmithMutation, useCreateFabNoteMutation, useMarkSlabSmithCompletedMutation } from "@/store/api/job";
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const submissionSchema = z.object({
  draftNotes: z.string().optional(),
  mentions: z.string().optional(),
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
  draftStart?: Date | null;
  draftEnd?: Date | null;
  fabId: number; // Add fabId prop
  userId: number; // Add userId prop for drafter ID
  fabData?: any; // Add fabData prop to get scheduling information
  slabSmithId?: number;
}

export const SubmissionModal = ({ open, onClose, drafting, uploadedFiles, draftStart, draftEnd, fabId, userId, fabData, slabSmithId }: SubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [updateSlabSmith] = useUpdateSlabSmithMutation();
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();
  const [createSlabSmith] = useCreateSlabSmithMutation(); // Add createSlabSmith mutation
  const [createFabNote] = useCreateFabNoteMutation();
  const [markSlabSmithCompleted] = useMarkSlabSmithCompletedMutation();

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      draftNotes: ''
    }
  });

  // Updated handleFinalSubmit function
  const handleFinalSubmit = async (values: SubmissionData) => {
    // Check if we have a slabSmithId or need to create one
    let currentSlabSmithId = slabSmithId || drafting?.id || drafting?.data?.id;

    // If no slab smith exists, create one using FAB data
    if (!currentSlabSmithId) {
      try {
        const createResponse = await createSlabSmith({
          fab_id: fabId,
          slab_smith_type: 'standard',
          drafter_id: fabData.drafter_id,
          start_date: fabData?.templating_schedule_start_date || new Date().toISOString().substring(0, 19),
          end_date: new Date().toISOString().substring(0, 19),
          total_sqft_completed: String(fabData?.total_sqft || values.totalSqFt || "0")
        }).unwrap();

        // Response is already transformed to the data object
        currentSlabSmithId = createResponse.id;
        console.log('Created slab smith with ID:', currentSlabSmithId);
        toast.success("SlabSmith entry created successfully");
      } catch (createError) {
        console.error('Failed to create slab smith:', createError);
        toast.error('Failed to create slab smith entry');
        return;
      }
    }

    if (!isConfirmed) {
      toast.error('Please confirm the slab smith work is completed by checking the box.');
      return;
    }

    console.log('Submitting slab smith with ID:', currentSlabSmithId, 'Files:', uploadedFiles);

    setIsSubmitting(true);
    try {
      // Create fab note if notes exist
      if (values.draftNotes && values.draftNotes.trim()) {
        try {
          await createFabNote({
            fab_id: fabId,
            note: values.draftNotes.trim(),
            stage: "slab_smith_request"
          }).unwrap();
        } catch (noteError) {
          console.error("Error creating fab note:", noteError);
          // Don't prevent submission if note creation fails
        }
      }

      // Filter only files that haven't been uploaded yet (no ID or temporary ID)
      const filesToUpload = uploadedFiles.filter(f =>
        !f.id || // No ID at all
        typeof f.id === 'string' && f.id.includes('temp') || // Temporary ID
        f.file instanceof File // Has File object (not yet uploaded)
      );

      console.log('Files to upload:', filesToUpload);

      let fileIds: number[] = [];

      if (filesToUpload.length > 0) {
        const fileObjects = filesToUpload.map(f => f.file as File);

        try {
          console.log('Uploading files:', fileObjects);
          const response = await addFilesToSlabSmith({
            slabsmith_id: currentSlabSmithId,
            files: fileObjects
          }).unwrap();
          console.log('File upload response:', response);

          // Extract file IDs from the response
          if (response && Array.isArray(response)) {
            fileIds = response.map((file: any) => file.id);
          }
        } catch (fileError) {
          console.error('File upload failed:', fileError);
          toast.error('Failed to upload files');
          throw fileError;
        }
      }

      // Update slab smith with other data
      const payload: any = {
        start_date: draftStart ? draftStart.toISOString().substring(0, 19) : null,
        end_date: draftEnd ? draftEnd.toISOString().substring(0, 19) : null,
        total_hours_completed: calculateTotalHours(draftStart || null, draftEnd || null), // Fix type issue
        notes: values.draftNotes || null,
        mentions: values.mentions || null,
        status_id: 1
      };

      console.log('Updating slab smith with payload:', payload);
      await updateSlabSmith({ slabsmith_id: currentSlabSmithId, data: payload }).unwrap();
      console.log('Slab smith update successful');

      // Call the complete endpoint
      console.log('Marking slab smith as completed');
      await markSlabSmithCompleted({
        slabsmith_id: currentSlabSmithId,
        updated_by: userId
      }).unwrap();
      console.log('Slab smith marked as completed');

      toast.success('Slab smith work submitted successfully');
      onClose(true);
    } catch (err: any) {
      console.error('Failed to submit slab smith:', err);
      toast.error(err?.data?.message || 'Failed to submit slab smith work');
      onClose(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalHours = (start: Date | null, end: Date | null) => {
    if (!start || !end) return 0;
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="border-b">
            <DialogTitle className="text-[15px] font-semibold py-2">Submit Slab Smith Work</DialogTitle>
            <span className="ml-3 text-sm font-normal text-gray-500">
              FAB ID: {fabId}
            </span>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 p-4">
            <FormField
              control={form.control}
              name="draftNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes about the slab smith work..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-completion"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
              />
              <label
                htmlFor="confirm-completion"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                SlabSmith Complete
              </label>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};