import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const formSchema = z.object({
  status: z.enum(["completed", "not_completed"]),
  start_date: z.string().min(1, "Start date is required"),
  duration: z.string().min(1, "Duration is required"),
  notes: z.string().optional(),
  square_ft: z.string().optional(),
});

export function TemplatingActivityForm() {
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "not_completed",
      start_date: "",
      duration: "",
      notes: "",
      square_ft: ''
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));

    toast.success("Checklist review completed successfully!");
    setIsSubmitting(false);
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className=" space-y-6"
        >
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block mb-2 font-medium">
                  Status
                </FormLabel>
                <div className="flex items-center gap-8">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => field.onChange("completed")}
                  >
                    <Checkbox completed={field.value === "completed"} />
                    <span className="font-medium text-sm">
                      Completed
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => field.onChange("not_completed")}
                  >
                    <Checkbox completed={field.value === "not_completed"} />
                    <span className="font-medium text-sm">
                      Not completed
                    </span>
                  </div>
                </div>
              </FormItem>
            )}
          />

          {/* Static Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <FormLabel>Scheduled date</FormLabel>
              <div className="flex items-center gap-2">
                <Input value="03 October, 2025" disabled />
              </div>
            </div>

            <div>
              <FormLabel>Schedule time (Current time)</FormLabel>
              <div className="flex items-center gap-2">
                <Input value={format(new Date(), "hh:mm a")} disabled />
              </div>
            </div>
          </div>

          {/* Dynamic Inputs */}
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (End now)</FormLabel>
                  <FormControl>
                    <Input placeholder="00:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>

            <FormField
              control={form.control}
              name="square_ft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Ft</FormLabel>
                  <Input placeholder="146" disabled {...field} />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Type here..." className="min-h-[120px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline">
              Cancel
            </Button>
            <Button type="submit" className="px-10">
              Save
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Please assign a technician to handle this templating activity.
          </p>
          <div className="space-y-3">
            <Label>Technician Name</Label>
            <Input placeholder="Select or enter technician" />
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Cancel
            </Button>
            <Button className="bg-[#8FBF3C] hover:bg-[#7AAC33]" onClick={() => setOpenModal(false)}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
