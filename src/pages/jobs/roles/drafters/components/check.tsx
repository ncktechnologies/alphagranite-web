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
import { useUpdateDraftingMutation, useAddFilesToDraftingMutation } from '@/store/api/job';
import { toast } from 'sonner';

const submissionSchema = z.object({
  totalSqFt: z.string().optional(),
  numberOfPieces: z.string().optional(),
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
  draftStart?: Date | null;
  draftEnd?: Date | null;
}

export const SubmissionModal = ({ open, onClose, drafting, uploadedFiles, draftStart, draftEnd }: SubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [updateDrafting] = useUpdateDraftingMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqFt: '',
      numberOfPieces: '',
      draftNotes: ''
    }
  });

  const handleFinalSubmit = async (values: SubmissionData) => {
    if (!drafting?.id && !drafting?.data?.id) {
      toast.error('Drafting ID is missing. Cannot submit.');
      return;
    }

    if (!isConfirmed) {
      toast.error('Please confirm the drafting is completed by checking the box.');
      return;
    }

    const draftingId = drafting?.id ?? drafting?.data?.id;
    console.log('Submitting draft with ID:', draftingId);

    setIsSubmitting(true);
    try {
      // First, upload any files that haven't been uploaded yet
      let fileIds: number[] = [];
      const fileObjects = uploadedFiles
        .filter(f => f.file instanceof File)
        .map(f => f.file as File);

      console.log('File objects to upload:', fileObjects);

      // if (fileObjects.length > 0) {
      //   try {
      //     console.log('Uploading files:', fileObjects);
      //     const response = await addFilesToDrafting({
      //       drafting_id: draftingId,
      //       files: fileObjects
      //     }).unwrap();
      //     console.log('File upload response:', response);
          
      //     // Extract file IDs from the response
      //     if (response && response.data && Array.isArray(response.data)) {
      //       fileIds = response.data.map((file: any) => file.id);
      //     }
      //   } catch (fileError) {
      //     console.error('File upload failed:', fileError);
      //     toast.error('Failed to upload files');
      //     throw fileError;
      //   }
      // }

      // Use updateDrafting to include date fields (without file_ids)
      const payload: any = {
        drafter_start_date: draftStart ? draftStart.toISOString() : null,
        drafter_end_date: draftEnd ? draftEnd.toISOString() : null,

        total_sqft_drafted: values.totalSqFt || null,
        no_of_piece_drafted: values.numberOfPieces || null,
        draft_note: values.draftNotes || null,

        is_completed: true,
        status_id: 1
      };

      console.log('Updating draft with payload:', payload);
      await updateDrafting({ id: draftingId, data: payload }).unwrap();
      console.log('Draft update successful');

      toast.success('Draft submitted successfully');
      onClose(true);
    } catch (err: any) {
      console.error('Failed to submit drafting:', err);
      toast.error(err?.data?.message || 'Failed to submit drafting');
      onClose(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="border-b">
            <DialogTitle className="text-[15px] font-semibold py-2">Submit Draft</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 p-4">
            <FormField
              control={form.control}
              name="totalSqFt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sq Ft</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 60" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numberOfPieces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No. of pieces</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3" {...field} />
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
                    <Textarea placeholder="Optional notes..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Uploaded files preview (read-only) */}
            {uploadedFiles && uploadedFiles.length > 0 && (
              <div className="p-3 bg-slate-50 rounded">
                <div className="text-sm font-medium mb-2">Uploaded Files ({uploadedFiles.length})</div>
                <ul className="text-sm">
                  {uploadedFiles.map((f, i) => (
                    <li key={i} className="truncate">• {f.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="flex items-center gap-2 mt-4">
              <input
                id="confirm-completed"
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="confirm-completed" className="text-sm font-medium">
                I confirm the drafting is completed
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose(false)}>
                Cancel
              </Button>

              <Button type="submit" disabled={!isConfirmed || isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting ? 'Submitting...' : 'Submit draft'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};