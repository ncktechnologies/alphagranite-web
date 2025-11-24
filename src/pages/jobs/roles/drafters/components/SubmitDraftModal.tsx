import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSubmitDraftingForReviewMutation } from '@/store/api/job';

const submitDraftSchema = z.object({
  no_of_piece_drafted: z.number().min(1, "Number of pieces is required"),
  total_sqft_drafted: z.string().min(1, "Total sq ft is required"),
  draft_note: z.string().optional(),
  mentions: z.string().optional(),
});

type SubmitDraftData = z.infer<typeof submitDraftSchema>;

interface SubmitDraftModalProps {
  draftingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: () => void;
  uploadedFiles: ""
}

export const SubmitDraftModal = ({ draftingId, open, onOpenChange, onSubmitSuccess, uploadedFiles }: SubmitDraftModalProps) => {
  const [submitDraftingForReview] = useSubmitDraftingForReviewMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubmitDraftData>({
    resolver: zodResolver(submitDraftSchema),
    defaultValues: {
      no_of_piece_drafted: 1,
      total_sqft_drafted: '',
      draft_note: '',
      mentions: '',
      file_ids:''
    },
  });

  const onSubmit = async (values: SubmitDraftData) => {
    try {
      setIsSubmitting(true);
      
      // Submit drafting for review
      await submitDraftingForReview({
        drafting_id: draftingId,
        data: {
          file_ids:uploadedFiles, // This would be populated with actual file IDs
          no_of_piece_drafted: values.no_of_piece_drafted,
          total_sqft_drafted: values.total_sqft_drafted,
          draft_note: values.draft_note || '',
          mentions: values.mentions || '',
          is_completed: true,
        }
      }).unwrap();
      
      toast.success('Draft submitted for review successfully');
      onSubmitSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting draft:', error);
      toast.error('Failed to submit draft for review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Draft for Review</DialogTitle>
          <div className="space-y-1 mt-2">
            <p className="font-semibold text-black leading-4">FAB-2024-0845</p>
            <p className="text-sm text-black">Conference Table - Quartz</p>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="no_of_piece_drafted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Pieces Drafted</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="total_sqft_drafted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Sq Ft Drafted</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="draft_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Draft Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mentions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mentions</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sales person or other mentions" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};