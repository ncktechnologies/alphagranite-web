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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUpdateFabMutation,
  useGetFabByIdQuery,
  useCreateFabNoteMutation,
  useCreateInstallSchedulingMutation,
  useUpdateInstallSchedulingMutation,
  useGetInstallSchedulingByFabIdQuery,
  useUpdateFabStageMutation,
} from "@/store/api/job";
import { Can } from "@/components/permission";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useGetSalesPersonsQuery } from "@/store/api";

// ---------- Helper functions ----------
const formatDate = (date: Date | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateString = (dateString: string | undefined): Date | undefined => {
  if (!dateString) return undefined;
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2])
    );
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};
// --------------------------------------

const installChecklistSchema = z.object({
  install_completed: z.boolean(),
  fab_notes: z.string().optional(),
  installer_id: z.string().optional(),
  scheduled_install_date: z.string().optional(),
  scheduled_end_date: z.string().optional(),
});

type InstallChecklistData = z.infer<typeof installChecklistSchema>;

interface InstallChecklistFormProps {
  fabId?: number;
  showCompletionFields?: boolean; // New prop to control visibility of completion fields
}

export function InstallChecklistForm({ fabId, showCompletionFields = false }: InstallChecklistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Fetch employers for installer dropdown
  const { data: employersData } = useGetSalesPersonsQuery();
  const employers = Array.isArray(employersData) ? employersData : [];

  // Mutations
  const [createFabNote] = useCreateFabNoteMutation();
  const [createInstallScheduling] = useCreateInstallSchedulingMutation();
  const [updateInstallScheduling] = useUpdateInstallSchedulingMutation();
  const [updateFabStage] = useUpdateFabStageMutation();

  // Queries
  const { data: fabData } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
  const { data: installData } = useGetInstallSchedulingByFabIdQuery(
    fabId || 0,
    { skip: !fabId }
  );

  const form = useForm<InstallChecklistData>({
    resolver: zodResolver(installChecklistSchema),
    defaultValues: {
      install_completed: false,
      fab_notes: "",
      installer_id: "",
      scheduled_install_date: "",
      scheduled_end_date: "",
    },
  });

  // Watch install_completed to conditionally enable scheduled_end_date
  const installCompleted = form.watch("install_completed");

  // Pre-fill form when fabData / installData loads
  useEffect(() => {
    if (fabData?.data || installData) {
      const fab = fabData?.data;
      const install = installData?.data ?? installData;
      form.reset({
        install_completed: install?.is_completed === true,
        fab_notes: fab?.fab_notes || "",
        installer_id: install?.installer_id
          ? String(install.installer_id)
          : "",
        scheduled_install_date: install?.scheduled_install_date
          ? install.scheduled_install_date.split("T")[0]
          : "",
        scheduled_end_date: install?.scheduled_end_date
          ? install.scheduled_end_date.split("T")[0]
          : "",
      });
    }
  }, [fabData, installData, form]);

  const onSubmit = async (values: InstallChecklistData) => {
    if (!fabId) {
      toast.error("No FAB ID provided. Cannot save.");
      return;
    }

    const hasNotes = !!values.fab_notes?.trim();
    const hasInstallDate = !!values.scheduled_install_date;
    const hasInstaller = !!values.installer_id;
    const isCompleted = values.install_completed;
    const hasEndDate = !!values.scheduled_end_date;

    if (!hasNotes && !hasInstallDate && !hasInstaller && !isCompleted && !hasEndDate) {
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
            stage: "install_scheduling",
          }).unwrap();
          someSuccess = true;
        } catch (noteError) {
          console.error("Error creating fab note:", noteError);
          toast.error("Failed to save note");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Ensure an install scheduling record exists
      let installId = installData?.data?.id ?? installData?.id;

      if ((hasInstallDate || hasInstaller || isCompleted || hasEndDate) && !installId) {
        try {
          const createResponse = await createInstallScheduling({
            fab_id: fabId,
          }).unwrap();
          installId = createResponse?.data?.id ?? createResponse?.id;

          if (!installId) {
            throw new Error(
              "Could not obtain install scheduling ID after creation"
            );
          }
        } catch (createError) {
          console.error("Error creating install record:", createError);
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Build the install scheduling payload
      if (installId && (hasInstallDate || hasInstaller || isCompleted || hasEndDate)) {
        try {
          const payload: Record<string, unknown> = {};

          if (hasInstaller) {
            payload.installer_id = Number(values.installer_id);
          }

          if (hasInstallDate) {
            payload.scheduled_install_date = values.scheduled_install_date;
          }

          if (hasEndDate) {
            payload.scheduled_end_date = values.scheduled_end_date;
          }

          if (isCompleted) {
            payload.is_completed = true;
            // If no end date provided, set to now (optional)
            if (!hasEndDate) {
              payload.scheduled_end_date = formatDate(new Date());
            }
          } else {
            payload.is_completed = false;
          }

          await updateInstallScheduling({
            install_scheduling_id: installId,
            data: payload,
          }).unwrap();

          someSuccess = true;
        } catch (updateError) {
          console.error("Error updating install scheduling:", updateError);
          setIsSubmitting(false);
          return;
        }
      }

      // 4. If a scheduled_install_date was provided, move FAB stage to "install_completion" (if not already there)
      if (hasInstallDate && fabData?.data?.current_stage !== "install_completion") {
        try {
          await updateFabStage({
            fab_id: fabId,
            data: { current_stage: "install_completion" },
          }).unwrap();
          someSuccess = true;
        } catch (stageError) {
          console.error("Error updating FAB stage:", stageError);
          // Don't block the whole operation, just warn
          toast.warning("Install date saved, but failed to update stage automatically.");
        }
      }

      // 5. Final feedback
      if (someSuccess) {
        toast.success(isCompleted ? "Install checklist completed and saved!" : "Changes saved successfully");
        navigate(-1); // Go back to previous page
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
          {/* Install completed checkbox - only shown when showCompletionFields is true */}
          {showCompletionFields && (
            <FormField
              control={form.control}
              name="install_completed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-base font-semibold text-text">
                    Install completed
                  </FormLabel>
                </FormItem>
              )}
            />
          )}

          {/* Installer dropdown */}
          <FormField
            control={form.control}
            name="installer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installer</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an installer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {employers.map((employer: any) => (
                      <SelectItem
                        key={employer.id}
                        value={String(employer.id)}
                      >
                        {employer.name ?? employer.full_name ?? `Employer #${employer.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Scheduled install date */}
          <FormField
            control={form.control}
            name="scheduled_install_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Scheduled install date</FormLabel>
                <DateTimePicker
                  mode="date"
                  value={parseDateString(field.value)}
                  onChange={(date) => field.onChange(formatDate(date))}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Scheduled end date - only shown when showCompletionFields is true and install_completed is true */}
          {showCompletionFields && installCompleted && (
            <FormField
              control={form.control}
              name="scheduled_end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Install Completed date</FormLabel>
                  <DateTimePicker
                    mode="date"
                    value={parseDateString(field.value)}
                    onChange={(date) => field.onChange(formatDate(date))}
                    // minDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}