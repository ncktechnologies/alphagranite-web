import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router";
import {
  useUpdateFabMutation,
  useGetFabByIdQuery,
  useCreateFabNoteMutation,
  useCreateResurfaceSchedulingMutation,
  useUpdateResurfaceSchedulingMutation,
  useGetResurfaceSchedulingByFabIdQuery,
  useUpdateCutListScheduleMutation,
} from "@/store/api/job";
import { useGetSalesPersonsQuery } from "@/store/api";
import { Can } from "@/components/permission";
import { DateTimePicker } from "@/components/ui/date-time-picker";

// ---------- Helper functions ----------
const formatDate = (date: Date | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string | undefined): Date | undefined => {
  if (!dateString) return undefined;
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};
// --------------------------------------

const reviewChecklistSchema = z.object({
  resurface_completed: z.boolean(),
  fab_notes: z.string().optional(),
  drafter: z.string().optional(),
  shop_date_schedule: z.string().optional(),
});

type ReviewChecklistData = z.infer<typeof reviewChecklistSchema>;

interface ReviewChecklistFormProps {
  fabId?: number;
}

export function ReviewChecklistForm({ fabId }: ReviewChecklistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch sales persons (optional)
  const { data: salesPersonsData } = useGetSalesPersonsQuery();
  const salesPersons = Array.isArray(salesPersonsData) ? salesPersonsData : [];

  // Mutations
  const [updateFab] = useUpdateFabMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const [createResurfaceScheduling] = useCreateResurfaceSchedulingMutation();
  const [updateResurfaceScheduling] = useUpdateResurfaceSchedulingMutation();
  const [updateCutListSchedule] = useUpdateCutListScheduleMutation();

  // Queries
  const { data: fabData } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
  const { data: resurfaceData } = useGetResurfaceSchedulingByFabIdQuery(fabId || 0, { skip: !fabId });

  const form = useForm<ReviewChecklistData>({
    resolver: zodResolver(reviewChecklistSchema),
    defaultValues: {
      resurface_completed: false,
      drafter: 'none',
      shop_date_schedule: '',
    },
  });

  // Pre-fill form when fabData loads
  useEffect(() => {
    if (fabData?.data) {
      const data = fabData.data;
      form.reset({
        resurface_completed: data.resurface_completed === true,
        fab_notes: data.fab_notes || '',
        drafter: data.drafter || 'none',
        shop_date_schedule: data.shop_date_schedule || '',
      });
    }
  }, [fabData, form]);

  const onSubmit = async (values: ReviewChecklistData) => {
    // Guard: fabId must be present
    if (!fabId) {
      toast.error("No FAB ID provided. Cannot save.");
      return;
    }

    const hasNotes = values.fab_notes?.trim() ? true : false;
    const hasShopDate = values.shop_date_schedule ? true : false;
    const hasResurface = values.resurface_completed;

    if (!hasNotes && !hasShopDate && !hasResurface) {
      toast.warning("No changes to save.");
      return;
    }

    setIsSubmitting(true);
    let someSuccess = false;

    try {
      // 1. Save fab note if provided
      if (hasNotes) {
        try {
          await createFabNote({
            fab_id: fabId,
            note: values.fab_notes!.trim(),
            stage: "resurfacing",
          }).unwrap();
          someSuccess = true;
        } catch (noteError) {
          console.error("Error creating fab note:", noteError);
          toast.error("Failed to save note");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Ensure a resurfacing record exists if scheduling a date or marking complete
      let resurfaceId = resurfaceData?.data?.id || resurfaceData?.id;

      if ((hasShopDate || hasResurface) && !resurfaceId) {
        try {
          const createResponse = await createResurfaceScheduling({ fab_id: fabId }).unwrap();
          resurfaceId = createResponse?.data?.id || createResponse?.id;

          if (!resurfaceId) {
            throw new Error("Could not obtain resurface scheduling ID after creation");
          }
        } catch (createError) {
          console.error("Error creating resurfacing record:", createError);
          toast.error("Failed to initialise resurfacing record");
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Save shop date schedule if provided — sets is_completed: false
      if (hasShopDate) {
        try {
          await updateCutListSchedule({
            fab_id: fabId,
            data: { shop_date_schedule: values.shop_date_schedule },
          }).unwrap();

          // Only mark as not-completed if we're not also ticking the checkbox
          if (resurfaceId && !hasResurface) {
            await updateResurfaceScheduling({
              resurface_scheduling_id: resurfaceId,
              data: { is_completed: false },
            }).unwrap();
          }

          someSuccess = true;
        } catch (scheduleError) {
          console.error("Error saving shop date:", scheduleError);
          toast.error("Failed to save shop date");
          setIsSubmitting(false);
          return;
        }
      }

      // 4. Handle resurface completed — sets is_completed: true
      if (hasResurface) {
        try {
          if (resurfaceId) {
            await updateResurfaceScheduling({
              resurface_scheduling_id: resurfaceId,
              data: { is_completed: true },
            }).unwrap();
            someSuccess = true;
          } else {
            throw new Error("Could not obtain resurface scheduling ID");
          }
        } catch (resurfaceError) {
          console.error("Error in resurfacing workflow:", resurfaceError);
          toast.error("Resurfacing update failed: " + (resurfaceError as any)?.message);
          setIsSubmitting(false);
          return;
        }
      }

      // Final success message based on what was saved
      if (someSuccess) {
        if (hasResurface) {
          toast.success("Resurfacing checklist completed and saved!");
          navigate('/job/resurfacing');
        } else {
          toast.success("Changes saved successfully");
        }
      } else {
        toast.warning("No data was saved");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Can action="update" on="Pre-draft Review">
          {/* Resurface completed checkbox */}
          <FormField
            control={form.control}
            name="resurface_completed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-base font-semibold text-text">
                  Resurface completed
                </FormLabel>
              </FormItem>
            )}
          />

          {/* Notes field */}
          <FormField
            control={form.control}
            name="fab_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Type here..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Shop date schedule */}
          <FormField
            control={form.control}
            name="shop_date_schedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop date schedule</FormLabel>
                <DateTimePicker
                  mode="date"
                  value={parseDateString(field.value)}
                  onChange={(date) => field.onChange(formatDate(date))}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </Can>

        <Separator className="my-4" />

        <div className="space-y-3 mt-6">
          <Can action="update" on="Pre-draft Review">
            <Button
              className="w-full py-6 text-base"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </Can>
          <Button
            variant="outline"
            type="button"
            className="w-full text-secondary font-bold py-6 text-base"
            onClick={() => navigate('/job/resurfacing')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}