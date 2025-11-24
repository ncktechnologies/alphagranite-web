import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { DrafterSelector } from './DrafterSelector';
import { useCreateDraftingMutation } from '@/store/api/job';

const assignDrafterSchema = z.object({
  drafter_id: z.number({ required_error: "Please select a drafter" }),
});

type AssignDrafterData = z.infer<typeof assignDrafterSchema>;

interface AssignDrafterModalProps {
  fabId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignSuccess?: () => void;
}

export const AssignDrafterModal = ({ fabId, open, onOpenChange, onAssignSuccess }: AssignDrafterModalProps) => {
  const [createDrafting] = useCreateDraftingMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssignDrafterData>({
    resolver: zodResolver(assignDrafterSchema),
    defaultValues: {
      drafter_id: undefined,
    },
  });

  const onSubmit = async (values: AssignDrafterData) => {
    try {
      setIsSubmitting(true);
      
      // Create drafting assignment
      await createDrafting({
        fab_id: fabId,
        drafter_id: values.drafter_id,
      }).unwrap();
      
      toast.success('Drafter assigned successfully');
      onAssignSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error assigning drafter:', error);
      toast.error('Failed to assign drafter. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Drafter</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="drafter_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drafter</FormLabel>
                  <FormControl>
                    <DrafterSelector 
                      value={field.value} 
                      onValueChange={field.onChange} 
                      placeholder="Select a drafter"
                    />
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
                {isSubmitting ? 'Assigning...' : 'Assign Drafter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};