import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  start_date: z.string(),
  schedule_start_date: z.string(),
  duration: z.string().optional().refine(
    (val) => !val || /^\d+$/.test(val),
    { message: "Duration must be in days (numbers only)" }
  ),
  notes: z.string().optional(),
  square_ft: z.string().optional(),
  revenue: z.string().optional(),
});

interface TemplatingActivityFormProps {
  fabId?: string;
  revenue?: number;
}

export function TemplatingActivityForm({ fabId, revenue }: TemplatingActivityFormProps) {
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [completeTemplating] = useCompleteTemplatingMutation();
  const [updateTemplating] = useUpdateTemplatingMutation();
  const [createFabNote] = useCreateFabNoteMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_completed: null,
      start_date: "",
      schedule_start_date: "",
      duration: "",
      notes: "",
      square_ft: '',
      revenue: ''
    },
  });

  const statusValue = form.watch("is_completed");

  // Fetch templating record by FAB ID
  const { data: templatingData, isLoading: isTemplatingLoading } = useGetTemplatingByFabIdQuery(
    Number(fabId),
    { skip: !fabId }
  );

  // Populate form with existing data
  useEffect(() => {
    if (templatingData?.data) {
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
        square_ft: templatingData.data.total_sqft?.toString() || '',
      };
      form.reset(formValues, { keepDefaultValues: false });
    }
    if (revenue && !form.getValues('revenue')) {
      form.setValue('revenue', String(revenue));
    }
  }, [templatingData, revenue, form]);

  // Helper to parse YYYY-MM-DD string into a local Date object
  const parseLocalDate = (dateString: string) => {
    if (!dateString) return undefined;
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const id = fabId;
      if (!id) throw new Error("FAB ID is missing");

      // Create fab note if notes exist
      if (values.notes && values.notes.trim()) {
        await createFabNote({
          fab_id: Number(id),
          note: values.notes.trim(),
          stage: "templating"
        }).unwrap();
      }

      const templatingId = templatingData?.data?.id;
      if (!templatingId) throw new Error("Templating record not found. Please schedule templating first.");

      const updateData: any = { templating_id: templatingId };

      if (values.notes) updateData.notes = [values.notes];
      if (values.start_date) updateData.actual_end_date = new Date(values.start_date).toISOString();
      if (values.schedule_start_date) updateData.schedule_start_date = new Date(values.schedule_start_date).toISOString();
      if (values.duration) updateData.duration = values.duration;
      if (values.square_ft) updateData.total_sqft = values.square_ft;
      if (values.is_completed !== null) updateData.is_completed = values.is_completed;

      if (values.is_completed === true) {
        await updateTemplating(updateData).unwrap();
        const response = await completeTemplating({
          templating_id: templatingId,
          actual_sqft: values.square_ft || "",
          notes: values.notes ? [values.notes] : []
        }).unwrap();
        toast.success(response?.message || "Templating completed successfully!");
      } else {
        const response = await updateTemplating(updateData).unwrap();
        toast.success(response?.message || "Templating activity saved successfully!");
      }

      navigate('/job/templating');
    } catch (error: any) {
      console.error("Failed to save templating:", error);
      const errorMessage = error?.data?.message || error?.message || "Failed to save. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isTemplatingLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Status */}
          <FormField
            control={form.control}
            name="is_completed"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block mb-2 font-medium">Status</FormLabel>
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
                    <label htmlFor="completed" className="font-medium text-sm cursor-pointer">
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
                    <label htmlFor="not-completed" className="font-medium text-sm cursor-pointer">
                      Not completed
                    </label>
                  </div>
                </div>
              </FormItem>
            )}
          />

          {/* Editable Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Scheduled Date */}
            <FormField
              control={form.control}
              name="schedule_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled date</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode="date"
                      value={parseLocalDate(field.value)}
                      onChange={(date) => {
                        if (!date) return field.onChange("");
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        field.onChange(`${year}-${month}-${day}`);
                      }}
                      placeholder="Select scheduled date"
                      // minDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Completed Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Completed date</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode="date"
                      value={parseLocalDate(field.value)}
                      onChange={(date) => {
                        if (!date) return field.onChange("");
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        field.onChange(`${year}-${month}-${day}`);
                      }}
                      placeholder="Select complete date"
                      // minDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                      disabled={statusValue !== true}  // 👈 Disable unless Completed is checked
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Square Ft */}
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

          {/* Notes */}
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

          {/* Buttons */}
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

      {/* Modal – unchanged */}
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