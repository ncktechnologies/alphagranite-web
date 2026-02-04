import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useScheduleTemplatingMutation, useCreateFabNoteMutation } from "@/store/api/job";
import { useNavigate, useParams } from "react-router";
import { useGetEmployeesQuery, useGetSalesPersonsQuery } from "@/store/api/employee";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const assignTechnicianSchema = z.object({
  technician: z.string().min(1, "Please select a technician"),
  date: z
    .string()
    .min(1, { message: "date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." }),
  revenue: z.string().optional()
    .refine((val) => val === "" || !isNaN(parseFloat(val)), { message: "Revenue must be a valid number" }),
  notes: z.string().optional(),
});

type AssignTechnicianData = z.infer<typeof assignTechnicianSchema>;

export function AssignTechnicianModal({
  open,
  onClose,
  fabData,
}: {
  open: boolean;
  onClose: () => void;
  fabData?: any;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scheduleTemplating] = useScheduleTemplatingMutation();
  const [createFabNote] = useCreateFabNoteMutation();
  const { data: employeesData, isLoading, isError, error } = useGetSalesPersonsQuery();

  const form = useForm<AssignTechnicianData>({
    resolver: zodResolver(assignTechnicianSchema),
    defaultValues: {
      technician: "",
      revenue: "",
    },
  });

  // Auto-populate revenue from FAB data when available
  useEffect(() => {
    if (fabData?.revenue && !form.getValues('revenue')) {
      form.setValue('revenue', String(fabData.revenue));
    }
  }, [fabData, form]);

  const onSubmit = async (values: AssignTechnicianData) => {
    setIsSubmitting(true);

    try {
      // Update the templating schedule with technician information
      if (id) {
        // const selectedEmployee = employeesData?.data.find(
        //   (emp: any) => `${emp.id}` === values.technician
        // );

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
            // Don't prevent scheduling if note creation fails
          }
        }

        const response = await scheduleTemplating({
          fab_id: Number(id),
          technician_id: Number(values.technician),
          schedule_start_date: values.date ? format(new Date(values.date), 'yyyy-MM-dd') : "",
          schedule_due_date: values.date ? format(new Date(new Date(values.date).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') : "", // 7 days after start
          total_sqft: String(fabData?.total_sqft ),
          revenue: values.revenue ? parseFloat(values.revenue) : undefined,
          notes: [values.notes || ""],
        }).unwrap();

        // Use success message from endpoint if available and successful, otherwise use default
        let successMessage = "Technician assigned successfully!";
        if (response?.detail?.success !== false && (response?.detail?.message || response?.message)) {
          successMessage = response?.detail?.message || response?.message || successMessage;
        }
        toast.success(successMessage);
      }

      onClose();
      navigate('/job/templating');
    } catch (error: any) {
      console.error("Failed to assign technician:", error);
      // Extract error message from the response
      const errorMessage = error?.data?.detail?.message || error?.data?.message || "Failed to assign technician. Please try again.";
      // toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md space-y-5">
          <DialogHeader className="border-b">
            <DialogTitle>Schedule template</DialogTitle>
          </DialogHeader>

          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-32" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md space-y-5">
          <DialogHeader className="border-b">
            <DialogTitle>Schedule template</DialogTitle>
          </DialogHeader>

          <div>
            <p className="font-bold"> {fabData?.fabId || "FAB-2024-001"}</p>
            <p>{fabData?.jobName || "Conference Table - Quartz"}</p>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ? `Failed to load employees: ${JSON.stringify(error)}` : "Failed to load employees"}
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const technicians = Array.isArray(employeesData) ? employeesData : [];;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md space-y-5">
        <DialogHeader className="border-b">
          <DialogTitle>Schedule template</DialogTitle>
        </DialogHeader>

        <div>
          <p className="font-bold"> {fabData?.fabId || "FAB-2024-001"}</p>
          <p>{fabData?.jobName || "Conference Table - Quartz"}</p>
        </div>

        {/* Display existing FAB notes */}
        {fabData?.fab_notes && fabData.fab_notes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">FAB Notes</h3>
            <ScrollArea className="h-32 w-full rounded-md border p-3">
              <div className="space-y-3">
                {fabData.fab_notes.map((note: any, index: number) => (
                  <div key={note.id || index} className="text-sm border-b pb-2 last:border-b-0">
                    <p className="text-muted-foreground">{note.note}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {note.created_by_name && <span>By: {note.created_by_name}</span>}
                      {note.stage && <span>• Stage: {note.stage}</span>}
                      {note.created_at && (
                        <span>• {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel> Date *</FormLabel>
                  <FormControl>
                    <DateTimePicker
                      mode="date"
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => {
                        if (!date) return field.onChange("");
                        const formatted = format(date, 'yyyy-MM-dd'); // YYYY-MM-DD format
                        field.onChange(formatted);
                      }}

                      placeholder="Schedule date"
                      minDate={new Date()}
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="technician"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technician *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicians.map((technician: any) => (
                        <SelectItem key={technician.id} value={`${technician.id}`}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter revenue amount"
                      {...field}
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
                      placeholder="Enter any additional notes"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Assigning...
                  </span>
                ) : (
                  "Assign Technician"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}