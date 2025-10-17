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

const assignTechnicianSchema = z.object({
  technician: z.string().min(1, "Please select a technician"),
  date: z
    .string()
    .min(1, { message: "Bulletin date is required." })
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

  const form = useForm<AssignTechnicianData>({
    resolver: zodResolver(assignTechnicianSchema),
    defaultValues: {
      technician: "",

    },
  });

  const onSubmit = async (values: AssignTechnicianData) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));

    toast.success(`Technician ${values.technician} assigned successfully!`);
    setIsSubmitting(false);
    onClose();
  };

  const technicians = ["John Doe", "Mary Smith", "Daniel Kim", "Sophia Brown"];

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
                      placeholder="Schdule date"
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
                      {technicians.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
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
