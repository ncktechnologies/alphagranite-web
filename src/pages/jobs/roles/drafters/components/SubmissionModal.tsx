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
import { useUpdateDraftingMutation, useAddFilesToDraftingMutation, useCreateDraftingMutation } from '@/store/api/job';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetSalesPersonsQuery } from '@/store/api/employee';
import { Can } from '@/components/permission';

const submissionSchema = z.object({
  totalSqFt: z.string().optional(),
  numberOfPieces: z.string().optional(),
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
  totalTime?: number; // tracked total time in seconds
  fabId: number; // Add fabId prop
  userId: number; // Add userId prop for drafter ID
  fabData?: any; // Add fabData prop to get scheduling information
}

export const SubmissionModal = ({ open, onClose, drafting, uploadedFiles, draftStart, draftEnd, totalTime = 0, fabId, userId, fabData }: SubmissionModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [updateDrafting] = useUpdateDraftingMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [createDrafting] = useCreateDraftingMutation(); // Add createDrafting mutation
  const { data: employeesData, isLoading, isError, error } = useGetSalesPersonsQuery();

  // Calculate total hours from tracked time instead of date difference
  const calculateTotalHoursFromTrackedTime = (trackedSeconds: number): number => {
    const hours = trackedSeconds / 3600;
    return parseFloat(hours.toFixed(2));
  };

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqFt: '',
      numberOfPieces: '',
      draftNotes: ''
    }
  });

  // Updated handleFinalSubmit function
  const handleFinalSubmit = async (values: SubmissionData) => {
    // Check if we have a drafting ID or need to create one
    let draftingId = drafting?.id ?? drafting?.data?.id;
    
    // If no drafting exists, create one using FAB data
    if (!draftingId) {
      try {
        const createResponse = await createDrafting({
          fab_id: fabId,
          drafter_id: userId,
          scheduled_start_date: fabData?.templating_schedule_start_date || new Date().toISOString(),
          scheduled_end_date: fabData?.templating_schedule_due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_sqft_required_to_draft: String(fabData?.total_sqft || values.totalSqFt || "0")
        }).unwrap();
        
        // Handle different response structures - extract ID from response
        const responseAny: any = createResponse;
        draftingId = responseAny.data?.id || responseAny.id;
        console.log('Created draft with ID:', draftingId);
        toast.success("Drafting created successfully");
      } catch (createError) {
        console.error('Failed to create drafting:', createError);
        toast.error('Failed to create drafting');
        return;
      }
    }

    if (!isConfirmed) {
      toast.error('Please confirm the drafting is completed by checking the box.');
      return;
    }

    console.log('Submitting draft with ID:', draftingId, 'Files:', uploadedFiles);

    setIsSubmitting(true);
    try {
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
          const response = await addFilesToDrafting({
            drafting_id: draftingId,
            files: fileObjects
          }).unwrap();
          console.log('File upload response:', response);

          // Extract file IDs from the response
          if (response && response.data && Array.isArray(response.data)) {
            fileIds = response.data.map((file: any) => file.id);
          }
        } catch (fileError) {
          console.error('File upload failed:', fileError);
          toast.error('Failed to upload files');
          throw fileError;
        }
      }

      // Update drafting with other data
      // Use the tracked totalTime passed from parent component for accurate time calculation
      const payload: any = {
        drafter_start_date: draftStart ? draftStart.toISOString() : null,
        drafter_end_date: draftEnd ? draftEnd.toISOString() : null,
        total_sqft_drafted: values.totalSqFt || null,
        no_of_piece_drafted: values.numberOfPieces || null,
        total_hours_drafted: calculateTotalHoursFromTrackedTime(totalTime), // Use tracked time
        draft_note: values.draftNotes || null,
        mentions: values.mentions || null,
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
  const salesPersons = Array.isArray(employeesData) ? employeesData : [];

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="border-b">
            <DialogTitle className="text-[15px] font-semibold py-2">Submit Draft</DialogTitle>
          </div>
          {/* <div className="space-y-1 mt-2">
            <p className="font-semibold text-black leading-4">
              {jobDetails.fabId}
            </p>
            <p className="text-sm text-black">{jobDetails.area}</p>
          </div> */}
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
                    <Input placeholder="(1)" {...field} />
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
                    <Input placeholder="5" {...field} />
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

        
            {/* Assign to Sales */}
            <FormField
              control={form.control}
              name="mentions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to sales</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {salesPersons.map((person: any) => (
                        <SelectItem key={person.id} value={`${person.id}`}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Confirmation Checkbox */}
            <div className="flex flex-row items-center space-x-3 mt-4">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(v) => setIsConfirmed(Boolean(v))}
              />
              <label className="font-semibold text-[16px]">
                CAD review complete
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onClose(false)}>
                Cancel
              </Button>

              <Can action="update" on="Drafting">
                <Button type="submit" disabled={!isConfirmed || isSubmitting} className="bg-green-600 hover:bg-green-700">
                  {isSubmitting ? 'Submitting...' : 'Submit draft'}
                </Button>
              </Can>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};