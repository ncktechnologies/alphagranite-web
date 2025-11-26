import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useScheduleTemplatingMutation } from "@/store/api/job";
import { useNavigate, useParams } from "react-router";
import { useGetEmployeesQuery, useGetSalesPersonsQuery } from "@/store/api/employee";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const assignTechnicianSchema = z.object({
  technician: z.string().min(1, "Please select a technician"),
  date: z
    .string()
    .min(1, { message: "date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." }),
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
  const { data: employeesData, isLoading, isError, error } = useGetSalesPersonsQuery();

  const form = useForm<AssignTechnicianData>({
    resolver: zodResolver(assignTechnicianSchema),
    defaultValues: {
      technician: "",
    },
  });

  const onSubmit = async (values: AssignTechnicianData) => {
    setIsSubmitting(true);

    try {
      // Update the templating schedule with technician information
      if (id) {
        // const selectedEmployee = employeesData?.data.find(
        //   (emp: any) => `${emp.id}` === values.technician
        // );

        const response = await scheduleTemplating({
          fab_id: Number(id),
          technician_id: Number(values.technician),
          schedule_start_date: values.date,
          schedule_due_date: new Date(new Date(values.date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days after start
          total_sqft: "0", // This would be updated with actual value
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
                        const formatted = date.toLocaleDateString("en-CA"); // YYYY-MM-DD without timezone issues
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