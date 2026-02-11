import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const approveSchema = z.object({
  revenue: z.string().min(1, "Revenue is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Please enter a valid revenue amount"
  ),
  slabSmithUsed: z.boolean(),
  notes: z.string().optional(),
});

type ApproveData = z.infer<typeof approveSchema>;

interface ApproveAndSendToSlabSmithModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { revenue: number; slabSmithUsed: boolean; notes: string }) => Promise<void>;
  fabId: string;
}

export const ApproveAndSendToSlabSmithModal = ({
  open,
  onClose,
  onSubmit,
  fabId
}: ApproveAndSendToSlabSmithModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<ApproveData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      revenue: "",
      slabSmithUsed: false,
      notes: "",
    },
    mode: "onChange",
  });

  const handleSubmit = async (values: ApproveData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        revenue: parseFloat(values.revenue),
        slabSmithUsed: values.slabSmithUsed,
        notes: values.notes || ""
      });
      
      toast.custom(
        () => (
          <Alert variant="success" icon="success">
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>
              Approved and Sent <br />
              FAB approved and sent to Slab Smith successfully
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-right',
        },
      );
      
      onClose();
      navigate('/job/draft-review');
    } catch (error) {
      console.error("Failed to approve and send to slab smith:", error);
      toast.error("Failed to approve and send to Slab Smith. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold py-2 border-b">
            Approve and Send to Slab Smith
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-5 pb-6">
          <p className="font-semibold text-black leading-4">{fabId}</p>
          <p className="text-sm text-black">Approve FAB and send to Slab Smith processing</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-5">
            {/* Revenue */}
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter revenue amount"
                      step="0.01"
                      min="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slab Smith Used Checkbox */}
            <FormField
              control={form.control}
              name="slabSmithUsed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      SlabSmith Used
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Add any additional notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="w-[127px]" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? "Processing..." :
                  !form.formState.isValid ? "Enter required fields" :
                    "Approve and Send"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};