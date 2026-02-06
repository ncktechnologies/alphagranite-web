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
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useScheduleTemplatingMutation, useCreateFabNoteMutation, useUnscheduleTemplatingMutation } from "@/store/api/job";
import { useNavigate, useParams } from "react-router";
import { useGetSalesPersonsQuery } from "@/store/api/employee";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const rescheduleTechnicianSchema = z.object({
    technician: z.string().min(1, "Please select a technician"),
    date: z
        .string()
        .min(1, { message: "date is required." })
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." }),
    revenue: z.string().optional()
        .refine((val) => val === "" || !isNaN(parseFloat(val)), { message: "Revenue must be a valid number" }),
    notes: z.string().optional(),
    total_sqft: z.string().optional(),
});

type RescheduleTechnicianData = z.infer<typeof rescheduleTechnicianSchema>;

export function RescheduleTechnicianModal({
    open,
    onClose,
    fabData,
    templatingId,
}: {
    open: boolean;
    onClose: () => void;
    fabData?: {
        fabId: string | number;
        jobName: string;
        revenue?: string | number;
        total_sqft?: string;
    };
    templatingId?: number;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const params = useParams<{ id: string }>();
    const fabId = fabData?.fabId ? String(fabData.fabId) : params.id;

    const navigate = useNavigate();
    const [scheduleTemplating] = useScheduleTemplatingMutation();
    const [unscheduleTemplating] = useUnscheduleTemplatingMutation();
    const [createFabNote] = useCreateFabNoteMutation();
    const { data: employeesData, isLoading, isError, error } = useGetSalesPersonsQuery();

    const form = useForm<RescheduleTechnicianData>({
        resolver: zodResolver(rescheduleTechnicianSchema),
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
        if (fabData?.total_sqft && !form.getValues('total_sqft')) {
            form.setValue('total_sqft', String(fabData.total_sqft));
        }
        console.log(fabData)
    }, [fabData, form]);

    const onSubmit = async (values: RescheduleTechnicianData) => {
        setIsSubmitting(true);

        try {
            if (!fabId) {
                toast.error("FAB ID is required");
                setIsSubmitting(false);
                return;
            }

            // Create fab note if notes exist
            if (values.notes && values.notes.trim()) {
                try {
                    await createFabNote({
                        fab_id: Number(fabId),
                        note: values.notes.trim(),
                        stage: "templating"
                    }).unwrap();
                } catch (noteError) {
                    console.error("Error creating fab note:", noteError);
                    // Continue even if note creation fails
                }
            }

            // Unschedule first to clear formatted stages if templatingId exists
            if (templatingId) {
                try {
                    await unscheduleTemplating({ templating_id: templatingId }).unwrap();
                } catch (unscheduleError) {
                    console.error("Error unscheduling:", unscheduleError);
                    // Continue with scheduling even if unscheduling fails
                }
            }

            // Schedule the new appointment
            const response = await scheduleTemplating({
                fab_id: Number(fabId),
                technician_id: Number(values.technician),
                schedule_start_date: values.date ? format(new Date(values.date), 'yyyy-MM-dd') : "",
                schedule_due_date: values.date ? format(new Date(new Date(values.date).getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') : "",
                total_sqft: values?.total_sqft ? String(values.total_sqft) : 0,
                revenue: values.revenue ? parseFloat(values.revenue) : undefined,
                notes: [values.notes || ""],
            }).unwrap();

            let successMessage = "Technician rescheduled successfully!";
            if (response?.detail?.success !== false && (response?.detail?.message || response?.message)) {
                successMessage = response?.detail?.message || response?.message || successMessage;
            }

            toast.success(successMessage);
            onClose();
            navigate('/job/templating');
        } catch (error: any) {
            console.error("Failed to reschedule technician:", error);
            const errorMessage = error?.data?.detail?.message || error?.data?.message || "Failed to reschedule technician. Please try again.";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md space-y-5">
                    <DialogHeader className="border-b">
                        <DialogTitle>Reschedule Template</DialogTitle>
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

    // Error state
    if (isError) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md space-y-5">
                    <DialogHeader className="border-b">
                        <DialogTitle>Reschedule Template</DialogTitle>
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

    const technicians = Array.isArray(employeesData) ? employeesData : [];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md space-y-5">
                <DialogHeader className="border-b">
                    <DialogTitle>Reschedule Template</DialogTitle>
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
                                    <FormLabel>Date *</FormLabel>
                                    <FormControl>
                                        <DateTimePicker
                                            mode="date"
                                            value={field.value ? new Date(field.value) : undefined}
                                            onChange={(date) => {
                                                if (!date) return field.onChange("");
                                                const formatted = format(date, 'yyyy-MM-dd');
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
                                        Rescheduling...
                                    </span>
                                ) : (
                                    "Reschedule "
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}