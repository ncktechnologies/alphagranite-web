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

// Schema: all measurement fields are required (can be "0")
const submissionSchema = z.object({
  totalSqft:    z.string().min(1, "Total Sq Ft is required"),
  noOfPieces:   z.string().min(1, "No. of Pieces is required"),
  draftNotes:   z.string().optional(),
  wjLinFt:      z.string().min(1, "WJ Lin Ft is required"),
  edgingLinFt:  z.string().min(1, "Edging Lin Ft is required"),
  cncLinFt:     z.string().min(1, "CNC Lin Ft is required"),
  miterLinFt:   z.string().min(1, "Miter Lin Ft is required"),
  sawCutLnft:   z.string().min(1, "Saw Cut Ln Ft is required"),
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
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [isConfirmed, setIsConfirmed]     = useState(false);
  const [completeFinalProgramming]        = useCompleteFinalProgrammingMutation();
  const [updateFab]                       = useUpdateFabMutation();
  const [createFabNote]                   = useCreateFabNoteMutation();

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      totalSqft:   "",
      noOfPieces:  "",
      draftNotes:  "",
      wjLinFt:     "",
      edgingLinFt: "",
      cncLinFt:    "",
      miterLinFt:  "",
      sawCutLnft:  "",
    },
  });

  const calculateTotalHoursFromTrackedTime = (trackedSeconds: number): number => {
    return parseFloat((trackedSeconds / 3600).toFixed(2));
  };

  const handleFinalSubmit = async (values: SubmissionData) => {
    let fpId = drafting?.id ?? drafting?.data?.id;

    if (!fpId) {
      try {
        await updateFab({ id: fabId, data: { final_programming_needed: true } }).unwrap();
      } catch (updateError) {
        console.error('Failed to update FAB for final programming:', updateError);
        return;
      }
      fpId = drafting?.id ?? drafting?.data?.id;
    }

    if (!isConfirmed) {
      toast.error('Please confirm the final programming work is completed by checking the box.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create FAB note if notes exist
      if (values.draftNotes?.trim()) {
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

      // 2. Update FAB with all measurement fields (all are now guaranteed to have a value)
      const fabUpdateData: Record<string, any> = {
        total_sqft:    parseFloat(values.totalSqft),
        no_of_pieces:  parseInt(values.noOfPieces),
        wj_linft:      parseFloat(values.wjLinFt),
        edging_linft:  parseFloat(values.edgingLinFt),
        cnc_linft:     parseFloat(values.cncLinFt),
        miter_linft:   parseFloat(values.miterLinFt),
        saw_cut_lnft:  parseFloat(values.sawCutLnft),
      };

      await updateFab({ id: fabId, data: fabUpdateData }).unwrap();

      // 3. Complete final programming
      await completeFinalProgramming({
        fab_id: fabId,
        data: {
          final_programming_complete: true,
          notes: values.draftNotes || null,
          drafter_id: userId,
          total_hours_final_programmed: calculateTotalHoursFromTrackedTime(totalTime),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Submit Final Programming</DialogTitle>
          <span className="ml-3 text-sm font-normal text-gray-500">FAB ID: {fabId}</span>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 py-4">
            <div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="noOfPieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of Pieces *</FormLabel>
                      <FormControl>
                        <Input placeholder="0" type="number" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalSqft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Sq Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wjLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WJ Lin Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="edgingLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edging Lin Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cncLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNC Lin Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="miterLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miter Lin Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sawCutLnft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saw Cut Ln Ft *</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="draftNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
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
                Final programming completed *
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