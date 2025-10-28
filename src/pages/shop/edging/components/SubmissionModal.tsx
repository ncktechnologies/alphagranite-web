import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Check } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const cuttingSchema = z.object({
  workstation: z.string().min(1, "Workstation is required"),
  hoursScheduled: z.string().min(1, "Hours are required"),
  scheduleDate: z.date({ required_error: "Schedule date is required" }),
  operator: z.string().min(1, "Operator is required"),
});

type CuttingFormValues = z.infer<typeof cuttingSchema>;

interface ScheduleCuttingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CuttingFormValues) => void;
}

export const ScheduleCuttingModal = ({
  open,
  onClose,
  onSubmit,
}: ScheduleCuttingModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CuttingFormValues>({
    resolver: zodResolver(cuttingSchema),
    defaultValues: {
      workstation: "",
      hoursScheduled: "",
      scheduleDate: undefined,
      operator: "Mike Rodriguez",
    },
  });
const navigate = useNavigate()

  const handleSubmit = async (values: CuttingFormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Scheduling cutting:", values);
      await new Promise((r) => setTimeout(r, 1500));
      toast.custom(
        () => (
          <Alert variant="success" icon="success">
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>
              Edging scheduled successful <br />
              Your Edging schedule was updated successfully
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-right',
        },
      );
      onSubmit(values);
      onClose();
      form.reset();
      navigate('/shop/miter')
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px] text-text font-semibold py-2 border-b">
            Schedule edging
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pt-3 pb-6 border-b">
          <p className="font-semibold text-black leading-4">FAB-2024-0845</p>
          <p className="text-sm text-black">Conference Table – Quartz</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-3">
            {/* Workstation */}
            <div className="grid grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="workstation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workstation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workstation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="edging">Edging</SelectItem>
                        {/* <SelectItem value="polishing">Polishing</SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem> */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hours */}
              <FormField
                control={form.control}
                name="hoursScheduled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours scheduled</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter hours" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Schedule Date */}
            {/* Schedule Date */}
            <FormField
              control={form.control}
              name="scheduleDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schedule date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <InputWrapper className="cursor-pointer">
                          <div className="flex items-center justify-between w-full px-3 py-2">
                            <span className={cn("text-sm", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : "Select date"}
                            </span>
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </InputWrapper>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />


            {/* Operator */}
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned operator</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-[#DFDFDF]">
                      <img
                        src="/images/app/300-2.png"
                        alt="operator"
                        className="size-6 rounded-full"
                      />
                      <span className="text-sm font-medium">{field.value}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 ">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Scheduling..." : "Schedule for Edging"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
