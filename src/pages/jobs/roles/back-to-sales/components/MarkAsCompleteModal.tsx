import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { toast } from "sonner";
import { Can } from '@/components/permission';

const markAsCompleteSchema = z.object({
  revenue: z.string().min(1, "Revenue is required"),
  slabSmithUsed: z.boolean(),
  notes: z.string().optional(),
  sctCompleted: z.boolean().default(false),
});

type MarkAsCompleteData = z.infer<typeof markAsCompleteSchema>;

export const MarkAsCompleteModal = ({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MarkAsCompleteData) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<MarkAsCompleteData>({
    resolver: zodResolver(markAsCompleteSchema),
    defaultValues: {
      revenue: "",
      slabSmithUsed: false,
      notes: "",
      sctCompleted: false,
    },
  });

  const handleFormSubmit = async (values: MarkAsCompleteData) => {
    setIsSubmitting(true);
    try {
      onSubmit(values);
      form.reset();
      onClose();
    } catch (error: any) {
      console.error("Failed to submit:", error);
      toast.error("Failed to submit data");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Complete</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue ($)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter revenue amount" 
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="slabSmithUsed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Slab Smith Used</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional notes (optional)" 
                      {...field}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sctCompleted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mark as Completed</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
              >
                Cancel
              </Button>
              <Can action="update" on="sct">
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.formState.isValid}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </Can>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};