import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { LoaderCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useUpdateCutListScheduleMutation, useGetCutListDetailsQuery, useUpdateCutListMutation } from "@/store/api/job";

// ------------------ ZOD SCHEMA ------------------ //
const updateFabSchema = z.object({
  pieces: z.string().optional(),
  totalSqFt: z.string().optional(),
  wjLinFt: z.string().optional(),
  edgingLinFt: z.string().optional(),
  cncLinFt: z.string().optional(),
  miterLinFt: z.string().optional(),
  shopDate: z.string().optional(),
  installationDate: z.string().optional(),
  revisionComplete: z.boolean().optional(),
});

type UpdateFabData = z.infer<typeof updateFabSchema>;

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date | undefined): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to parse date string to Date object (handles timezone correctly)
const parseDateString = (dateString: string | undefined): Date | undefined => {
  if (!dateString) return undefined;
  
  // If the string is already in YYYY-MM-DD format, parse it correctly
  const parts = dateString.split('-');
  if (parts.length === 3) {
    // Create date in local timezone (not UTC)
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  
  // Fallback to Date constructor
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

// ------------------ COMPONENT ------------------ //
export function UpdateFabIdModal({
  open,
  onClose,
  fabData,
}: {
  open: boolean;
  onClose: () => void;
  fabData: any;
}) {
  const { data: cutListData, isLoading: isCutListLoading } = useGetCutListDetailsQuery(fabData?.id, { 
    skip: !fabData?.id 
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateCutListSchedule] = useUpdateCutListScheduleMutation();
  const [updateCutList] = useUpdateCutListMutation();

  const form = useForm<UpdateFabData>({
    resolver: zodResolver(updateFabSchema),
    defaultValues: {
      pieces: "",
      totalSqFt: "",
      wjLinFt: "",
      edgingLinFt: "",
      cncLinFt: "",
      miterLinFt: "",
      shopDate: "",
      installationDate: "",
      revisionComplete: undefined,
    },
  });

  // Reset form when cutListData changes
  useEffect(() => {
    if (cutListData?.data) {
      const data = cutListData.data;
      form.reset({
        pieces: data.no_of_pieces?.toString() || "",
        totalSqFt: data.total_sqft?.toString() || "",
        wjLinFt: data.wj_linft?.toString() || "",
        edgingLinFt: data.edging_linft?.toString() || "",
        cncLinFt: data.cnc_linft?.toString() || "",
        miterLinFt: data.miter_linft?.toString() || "",
        shopDate: data.shop_date_schedule || "",
        installationDate: data.installation_date || "",
        revisionComplete: data.revision_complete === true,
      });
    }
  }, [cutListData, form]);

  // ---------------- JOB INFO DATA ---------------- //
  const jobInfo = [
    { label: "Job #", value: fabData?.job_details?.job_number || '-' },
    { label: "FAB type", value: fabData?.fab_type || '-' },
    { label: "Account", value: fabData?.job_details?.name || '-' },
    { label: "Area (s)", value: fabData?.input_area || '-' },
    { label: "Stone type", value: fabData?.stone_type_name || '-' },
    { label: "Stone color", value: fabData?.stone_color_name || '-' },
    { label: "Stone thickness", value: fabData?.stone_thickness_value || '-' },
    { label: "Edge", value: fabData?.edge_name || '-' },
  ];

  // ---------------- SUBMIT HANDLER ---------------- //
  const onSubmit = async (values: UpdateFabData) => {
    setIsSubmitting(true);

    try {
      // If revision_complete is checked, call the update endpoint
      if (values.revisionComplete) {
        await updateCutList({
          fab_id: fabData?.id,
          data: { revision_complete: true }
        }).unwrap();

        toast.success("Revision marked as complete!");
        onClose();
        return;
      }

      // Otherwise, prepare data for schedule API call
      const requestData = {
        fab_id: fabData?.id,
        no_of_pieces: values.pieces ? parseInt(values.pieces) : undefined,
        total_sqft: values.totalSqFt ? parseFloat(values.totalSqFt) : undefined,
        wj_linft: values.wjLinFt ? parseFloat(values.wjLinFt) : undefined,
        edging_linft: values.edgingLinFt ? parseFloat(values.edgingLinFt) : undefined,
        cnc_linft: values.cncLinFt ? parseFloat(values.cncLinFt) : undefined,
        miter_linft: values.miterLinFt ? parseFloat(values.miterLinFt) : undefined,
        shop_date_schedule: values.shopDate,
        installation_date: values.installationDate,
      };

      // Remove undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v !== undefined)
      );

      // Call the schedule API endpoint
      await updateCutListSchedule({
        fab_id: fabData?.id,
        data: cleanedData
      }).unwrap();

      toast.success("FAB scheduled successfully!");
      onClose();
    } catch (error) {
      console.error("Error scheduling FAB:", error);
      toast.error("Failed to schedule FAB");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCutListLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center items-center h-20">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="border-b">
          <DialogTitle>Update FAB ID</DialogTitle>
        </DialogHeader>

        {/* ---------- FAB HEADER ---------- */}
        <div className="space-y-1 mb-4">
          <p className="font-bold text-lg">
            {fabData?.fabId || `FAB-${fabData?.id || "2024-001"}`}
          </p>
          <p className="text-sm">
            {fabData?.jobName || fabData?.job_details?.name || "Conference Table - Quartz"}
          </p>
        </div>

        {/* ---------- JOB INFO GRID ---------- */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6">
          {jobInfo.map((item, idx) => (
            <div key={idx}>
              <p className="text-sm text-text-foreground uppercase tracking-wide">
                {item.label}
              </p>
              <p className="font-semibold text-text text-base leading-[28px]">
                {item.value || "-"}
              </p>
            </div>
          ))}
        </div>

        <Separator />

        {/* ---------- SCROLLABLE FORM CONTAINER ---------- */}
        <div className="overflow-y-auto overflow-x-visible flex-grow pr-2 -mr-2">
          {/* ---------- FORM ---------- */}
          <Form {...form}>
            <form id="update-fab-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              {/* ---- QUANTITIES ROW ---- */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of pieces</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalSqFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Sq Ft</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wjLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WJ LinFt</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ---- LINEAR FT ROW ---- */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="edgingLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edging LinFt</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cncLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNC LinFt</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="miterLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Miter LinFt</FormLabel>
                      <FormControl>
                        <Input placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ---- DATES + REVISION ROW ---- */}
              <div className="grid grid-cols-3 gap-4">
                {/* Shop date */}
                <FormField
                  control={form.control}
                  name="shopDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop date schedule</FormLabel>
                      <DateTimePicker
                        mode="date"
                        value={parseDateString(field.value)}
                        onChange={(date) => {
                          field.onChange(formatDate(date));
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Installation date */}
                <FormField
                  control={form.control}
                  name="installationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation date</FormLabel>
                      <DateTimePicker
                        mode="date"
                        value={parseDateString(field.value)}
                        onChange={(date) => {
                          field.onChange(formatDate(date));
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Revision complete */}
                <FormField
                  control={form.control}
                  name="revisionComplete"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>Confirmed</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        {/* ---- FOOTER BUTTONS ---- */}
        <DialogFooter className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" form="update-fab-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : (
              "Schedule shop date"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}