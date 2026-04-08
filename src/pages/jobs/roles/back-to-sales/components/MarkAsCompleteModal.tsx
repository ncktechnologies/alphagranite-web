import { useState, useEffect } from "react";
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

// Dynamic schema – will be refined based on slabSmithNeeded
const markAsCompleteBaseSchema = z.object({
  revenue: z.string().min(1, "Revenue is required"),
  notes: z.string().optional(),
  slabSmithApproved: z.boolean().default(false),
  blockDrawingApproved: z.boolean().default(false),
  sctCompleted: z.boolean().default(false),
});

type MarkAsCompleteData = z.infer<typeof markAsCompleteBaseSchema>;

export const MarkAsCompleteModal = ({
  open,
  onClose,
  onSubmit,
  slabSmithNeeded = false,
  isSlabSmithActivityComplete = false,
  fabId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MarkAsCompleteData) => void;
  slabSmithNeeded?: boolean;
  isSlabSmithActivityComplete?: boolean;
  fabId: number;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Build schema with required checkboxes
  const getMarkAsCompleteSchema = () => {
    let schema = markAsCompleteBaseSchema;

    // Block drawing is always required
    schema = schema.refine(data => data.blockDrawingApproved === true, {
      message: "Block Drawing must be approved",
      path: ["blockDrawingApproved"],
    });

    // SCT is always required
    schema = schema.refine(data => data.sctCompleted === true, {
      message: "SCT must be completed",
      path: ["sctCompleted"],
    });

    // SlabSmith approval required only if needed
    if (slabSmithNeeded) {
      schema = schema.refine(data => data.slabSmithApproved === true, {
        message: "SlabSmith must be approved",
        path: ["slabSmithApproved"],
      });
    }

    return schema;
  };

  const form = useForm<MarkAsCompleteData>({
    resolver: zodResolver(getMarkAsCompleteSchema()),
    defaultValues: {
      revenue: "",
      notes: "",
      slabSmithApproved: false,
      blockDrawingApproved: false,
      sctCompleted: false,
    },
    mode: "onChange", // re-validate on every change
  });

  // ✅ Re-run validation when slabSmithNeeded changes (modal reopened)
  useEffect(() => {
    if (open) {
      form.clearErrors();
      form.trigger(); // re-validate entire form
    }
  }, [open, slabSmithNeeded, form]);

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

  // ✅ External condition (SlabSmith activity must be complete before allowing submit)
  const isExternalBlocked = slabSmithNeeded && !isSlabSmithActivityComplete;

  // ✅ Checkboxes are already enforced via Zod – so isValid covers them
  const isSubmitDisabled = isSubmitting || !form.formState.isValid || isExternalBlocked;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mark as Complete</DialogTitle>
          <span className="ml-3 text-sm font-normal text-gray-500">
            FAB ID: {fabId}
          </span>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue ($) *</FormLabel>
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

            {slabSmithNeeded && (
              <FormField
                control={form.control}
                name="slabSmithApproved"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>SlabSmith Approved *</FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="blockDrawingApproved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Block Drawing Approved *</FormLabel>
                  </div>
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
                    <FormLabel>SCT Complete *</FormLabel>
                  </div>
                  <FormMessage />
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
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                title={
                  isExternalBlocked
                    ? "SlabSmith activity must be complete first"
                    : !form.formState.isValid
                    ? "Please fill all required fields and check all required checkboxes"
                    : ""
                }
              >
                {isSubmitting ? "Submitting..." : "Approve and Send to Cut List"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};