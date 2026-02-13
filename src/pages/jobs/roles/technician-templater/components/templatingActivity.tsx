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
import { useCompleteTemplatingMutation, useGetTemplatingByFabIdQuery, useUpdateTemplatingMutation, useCreateFabNoteMutation } from "@/store/api/job";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Can } from '@/components/permission';

const formSchema = z.object({
  is_completed: z.boolean().nullable(),
  start_date: z.string().min(1, "Start date is required"),
  schedule_start_date: z.string().min(1, "Scheduled date is required"), // Added schedule_start_date
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
  const [createFabNote] = useCreateFabNoteMutation();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      const id = fabId;
      if (!id) {
        throw new Error("FAB ID is missing");
      }

      // Create fab note if notes exist
      if (values.notes && values.notes.trim()) {
        try {
          await createFabNote({
            fab_id: Number(id),
            note: values.notes.trim(),
            stage: "templating"
          }).unwrap();
        } catch (noteError) {
          console.error("Error creating fab note:", noteError);
          // Don't prevent submission if note creation fails
        }
      }

      // Get the templating ID from the templating data
      const templatingId = templatingData?.data?.id;
      if (!templatingId) {
        throw new Error("Templating record not found. Please schedule templating first.");
      }

      // Prepare update data
      const updateData: any = {
        templating_id: templatingId
      };

      // Add notes if provided
      if (values.notes) {
        updateData.notes = [values.notes];
      }

      // Add actual start date if provided
      if (values.start_date) {
        updateData.actual_end_date = new Date(values.start_date).toISOString();
      }

      // Add scheduled start date if provided
      if (values.schedule_start_date) {
        updateData.schedule_start_date = new Date(values.schedule_start_date).toISOString();
      }

      // Add duration if provided
      if (values.duration) {
        updateData.duration = values.duration;
      }

      // Add square footage if provided
      if (values.square_ft) {
        updateData.total_sqft = values.square_ft;
      }

      // Add completion status if provided
      if (values.is_completed !== null) {
        updateData.is_completed = values.is_completed;
      }

      // Only submit if status is completed
      if (values.is_completed === true) {
        // First update the templating record with all data
        await updateTemplating(updateData).unwrap();

        // Then complete templating
        const response = await completeTemplating({
          templating_id: templatingId,
          actual_sqft: values.square_ft || "",
          notes: values.notes ? [values.notes] : []
        }).unwrap();

        toast.success(response?.message || "Templating completed successfully!");
      } else {
        // When not completed, update the templating record with all relevant data
        const response = await updateTemplating(updateData).unwrap();

        toast.success(response?.message || "Templating activity saved successfully!");
      }

      navigate('/job/templating');
    } catch (error: any) {
      console.error("Failed to complete templating:", error);
      const errorMessage = error?.data?.message || error?.message || "Failed to complete templating. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Fetch templating record by FAB ID
  const { data: templatingData, isLoading: isTemplatingLoading } = useGetTemplatingByFabIdQuery(
    Number(fabId),
    { skip: !fabId }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_completed: null,
      start_date: "",
      schedule_start_date: "", // Added default
      duration: "",
      notes: "",
      square_ft: ''
    },
  });

  // Watch form values
  const statusValue = form.watch("is_completed");

  useEffect(() => {
    // Populate form with templating data when it's available
    if (templatingData?.data) {
      // Prepare values for the form
      const formValues: Partial<z.infer<typeof formSchema>> = {
        is_completed: templatingData.data.is_completed || null,
        start_date: templatingData.data.end_date
          ? templatingData.data.end_date.split('T')[0]
          : "",
        schedule_start_date: templatingData.data.schedule_start_date
          ? templatingData.data.schedule_start_date.split('T')[0]
          : "",
        duration: templatingData.data.duration || "",
        notes: "",
        square_ft: templatingData.data.total_sqft?.toString() || ''
      };

      // Use reset with { keepDefaultValues: false } to prevent infinite loop
      form.reset(formValues, { keepDefaultValues: false });
    }
  }, [templatingData]);

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
            name="is_completed"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block mb-2 font-medium">
                  Status
                </FormLabel>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="completed"
                      checked={field.value === true}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange(true);
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
                      checked={field.value === false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange(false);
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

          {/* Editable Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Scheduled Date - Now Editable */}
            <FormField
              control={form.control}
              name="schedule_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode="date"
                      value={field.value ? (() => {
                        // Parse YYYY-MM-DD string in local timezone
                        const [y, m, d] = field.value.split('-').map(Number);
                        return new Date(y, m - 1, d);
                      })() : undefined}
                      onChange={(date) => {
                        if (!date) return field.onChange("");
                        const formatted = date.toISOString().split('T')[0];
                        field.onChange(formatted);
                      }}
                      placeholder="Select scheduled date"
                    />
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
                  <FormLabel>Duration</FormLabel>
                  <Input placeholder="146" {...field} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completed date</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode="date"
                      value={field.value ? (() => {
                        // Parse YYYY-MM-DD string in local timezone
                        const [y, m, d] = field.value.split('-').map(Number);
                        return new Date(y, m - 1, d);
                      })() : undefined}
                      onChange={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const formatted = `${year}-${month}-${day}`;
                          field.onChange(formatted);
                        } else {
                          field.onChange("");
                        }
                      }}
                      placeholder="Select complete date"
                    />
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
            <Button type="button" variant="outline" onClick={() => navigate('/job/templating')}>
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
