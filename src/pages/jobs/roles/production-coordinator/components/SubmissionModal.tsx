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
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

const submissionSchema = z.object({
  wjTimeMinutes: z.string().optional(),
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
  draftStart: Date | null;
  draftEnd: Date | null;
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
  fabId,
  userId,
  fabData
}: SubmissionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const form = useForm<SubmissionData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      wjTimeMinutes: "",
      draftNotes: "",
      mentions: "",
    },
  });

  const handleFinalSubmit = async (values: SubmissionData) => {
    if (!isConfirmed) {
      toast.error('Please confirm the final programming work is completed by checking the box.');
      return;
    }

    setIsSubmitting(true);
    try {
      // In the parent component, this will trigger the file upload and completion
      onClose(true);
    } catch (err: any) {
      console.error('Failed to submit final programming:', err);
      toast.error(err?.data?.message || 'Failed to submit final programming work');
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
            <DialogTitle className="text-[15px] font-semibold py-2">Submit Final Programming Work</DialogTitle>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinalSubmit)} className="space-y-6 p-4">
            <FormField
              control={form.control}
              name="wjTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WJ Time (Minutes)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter waterjet time in minutes" {...field} />
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
                I confirm that the final programming work is completed
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
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Final Programming'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}