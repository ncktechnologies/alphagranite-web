import { useState, useEffect } from "react";
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
import { useNavigate } from "react-router";
import { useCompleteTemplatingMutation, useGetTemplatingByFabIdQuery, useUpdateTemplatingMutation } from '@/store/api/job';
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Can } from '@/components/permission';

const formSchema = z.object({
  status: z.enum(["completed", "not_completed"]),
  start_date: z.string().min(1, "Start date is required"),
  duration: z.string().optional().refine(
  (val) => !val || /^\d+$/.test(val),
  { message: "Duration must be in days (numbers only)" }
),
  notes: z.string().optional(),
  square_ft: z.string().optional(),
});

interface TemplatingActivityFormProps {
  fabId?: string;
}

export function TemplatingActivityForm({ fabId }: TemplatingActivityFormProps) {
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [completeTemplating] = useCompleteTemplatingMutation();
  const [updateTemplating] = useUpdateTemplatingMutation();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // console.log("Form values:", values);

      const id = fabId;
      if (!id) {
        throw new Error("FAB ID is missing");
      }

      // Get the templating ID from the templating data
      const templatingId = templatingData?.data?.id;
      if (!templatingId) {
        throw new Error("Templating record not found. Please schedule templating first.");
      }

      // Only submit if status is completed
      if (values.status === "completed") {
        const response = await completeTemplating({
          templating_id: templatingId,
          actual_sqft: values.square_ft || "",
          notes: values.notes ? [values.notes] : []
        }).unwrap();

        toast.success(response?.message || "Templating completed successfully!");
      } else {
        // When not completed, update the templating record with all relevant data
        const updateData: any = {
          templating_id: templatingId
        };

        // Add notes if provided
        if (values.notes) {
          updateData.notes = [values.notes];
        }

        // Add actual start date and duration if provided
        if (values.start_date) {
          updateData.actual_start_date = new Date(values.start_date).toISOString();
        }

        if (values.duration) {
          updateData.duration = values.duration;
        }

        // Add square footage if provided
        if (values.square_ft) {
          updateData.total_sqft = values.square_ft;
        }

        const response = await updateTemplating(updateData).unwrap();

        toast.success(response?.message || "Templating activity saved successfully!");
      }

      navigate('/job/templating');
    } catch (error: any) {
      console.error("Failed to complete templating:", error);
      // Don't navigate if there's an error
      const errorMessage = error?.data?.message || error?.message || "Failed to complete templating. Please try again.";
      // toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Fetch templating record by FAB ID
  const { data: templatingData, isLoading: isTemplatingLoading } = useGetTemplatingByFabIdQuery(
    Number(fabId),
    { skip: !fabId }
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "",
      start_date: "",
      duration: "",
      notes: "",
      square_ft: ''
    },
  });

  // Watch form values for debugging
  const statusValue = form.watch("status");
  const squareFtValue = form.watch("square_ft");

  // useEffect(() => {
  //   console.log("Status value changed to:", statusValue);
  // }, [statusValue]);

  // useEffect(() => {
  //   console.log("Square ft value changed to:", squareFtValue);
  // }, [squareFtValue]);

  useEffect(() => {
    // Debugging: Log the templating data
    // console.log("Templating data:", templatingData);

    // Populate form with templating data when it's available
    if (templatingData?.data) {
      console.log("Populating form with templating data:", templatingData.data);

      // Prepare values for the form
      const formValues: Partial<z.infer<typeof formSchema>> & { status: "not_completed" } = {
        status: "",
        start_date: templatingData.data.schedule_start_date
          ? (() => {
            const date = new Date(templatingData.data.schedule_start_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })()
          : "",
        duration: "",
        notes: "",
        square_ft: templatingData.data.total_sqft?.toString() || ''
      };

      console.log("Resetting form with values:", formValues);
      form.reset(formValues);
    }
  }, [templatingData, form]);

  if (isTemplatingLoading) {
    return <div>Loading...</div>;
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
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="completed"
                      checked={field.value === "completed"}
                      onCheckedChange={(checked) => {
                        console.log("Checkbox completed changed:", checked);
                        if (checked) {
                          field.onChange("completed");
                        }
                      }}
                    />
                    <label
                      htmlFor="completed"
                      className="font-medium text-sm cursor-pointer"
                    >
                      Completed
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="not-completed"
                      checked={field.value === "not_completed"}
                      onCheckedChange={(checked) => {
                        console.log("Checkbox not_completed changed:", checked);
                        if (checked) {
                          field.onChange("not_completed");
                        }
                      }}
                    />
                    <label
                      htmlFor="not-completed"
                      className="font-medium text-sm cursor-pointer"
                    >
                      Not completed
                    </label>
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
                <Input
                  value={templatingData?.data?.schedule_start_date
                    ? format(new Date(templatingData.data.schedule_start_date), "dd MMMM, yyyy")
                    : "Not scheduled"}
                  disabled
                />
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
                    <DateTimePicker
                      mode="date"
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        if (date) {
                          // Format date as YYYY-MM-DD while preserving local timezone
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const formatted = `${year}-${month}-${day}`;
                          field.onChange(formatted);
                        } else {
                          field.onChange("");
                        }
                      }}
                      placeholder="Select start date"
                      minDate={new Date()}

                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
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
            /> */}
          </div>

          <div>
            <FormField
              control={form.control}
              name="square_ft"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Square Ft</FormLabel>
                  <Input placeholder="146" {...field} />
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
            <Button type="button" variant="outline" onClick={() => navigate('/job/templating-technician')}>
              Cancel
            </Button>
            <Can action="update" on="Templating">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </Can>
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