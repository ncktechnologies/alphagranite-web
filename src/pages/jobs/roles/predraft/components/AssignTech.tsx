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
import { useGetEmployeesQuery } from "@/store/api/employee"; // Import employees query
import { useGetDepartmentsQuery } from "@/store/api/department"; // Import departments query
import { useNavigate } from "react-router"; // Import navigate

const assignDrafterSchema = z.object({
  drafter: z.string().optional(), // Make drafter optional
  date: z
    .string()
    .min(1, { message: "date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." }),

});

type AssignDrafterData = z.infer<typeof assignDrafterSchema>;

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
  const navigate = useNavigate(); // Add navigate hook

  // Fetch employees and departments
  const { data: employeesData, isLoading: isEmployeesLoading } = useGetEmployeesQuery();
  const { data: departmentsData } = useGetDepartmentsQuery();
  
  // Find the drafters department
  const draftersDepartment = departmentsData?.items?.find((dept: any) => 
    dept.name.toLowerCase().includes('draft') || dept.name.toLowerCase().includes('pre')
  );
  
  // Get drafters from employees data
  const drafters = draftersDepartment && employeesData?.data ? 
    employeesData.data.filter((emp: any) => emp.department_id === draftersDepartment.id) : [];

  const form = useForm<AssignDrafterData>({
    resolver: zodResolver(assignDrafterSchema),
    defaultValues: {
      drafter: "none", // Update default value to match the new "none" option
    },
  });

  const onSubmit = async (values: AssignDrafterData) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));

    if (values.drafter && values.drafter !== "none") {
      toast.success(`Drafter assigned successfully!`);
    } else {
      toast.success(`Template scheduled without drafter assignment!`);
    }
    
    setIsSubmitting(false);
    onClose();
    // Navigate back to predraft page
    navigate('/job/predraft');
  };

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
                        const formatted = date?.toISOString().split("T")[0] // "YYYY-MM-DD"
                        field.onChange(formatted)
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
              name="drafter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drafter (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEmployeesLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select drafter (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isEmployeesLoading ? (
                        <SelectItem value="loading" disabled>Loading drafters...</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="none">No drafter assigned</SelectItem>
                          {drafters.map((drafter: any) => (
                            <SelectItem key={drafter.id} value={drafter.id.toString()}>
                              {drafter.first_name} {drafter.last_name}
                            </SelectItem>
                          ))}
                        </>
                      )}
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
                  "Assign Drafter"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}