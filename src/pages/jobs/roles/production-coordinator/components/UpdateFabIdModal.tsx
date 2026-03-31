import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
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
import {
  useUpdateCutListScheduleMutation,
  useGetCutListDetailsQuery,
  useUpdateCutListMutation,
} from "@/store/api/job";

// ── Schema ────────────────────────────────────────────────────────────────────
const updateFabSchema = z.object({
  pieces: z.string().optional(),
  totalSqFt: z.string().optional(),
  wjLinFt: z.string().optional(),
  edgingLinFt: z.string().optional(),
  cncLinFt: z.string().optional(),
  miterLinFt: z.string().optional(),
  sawCutLnft: z.string().optional(),
  shopDate: z.string().optional(),
  installationDate: z.string().optional(),
  // ✅ renamed from revisionComplete → cutlistComplete
  cutlistComplete: z.boolean().optional(),
});

type UpdateFabData = z.infer<typeof updateFabSchema>;

// ── Date helpers ──────────────────────────────────────────────────────────────
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
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

// ── Component ─────────────────────────────────────────────────────────────────
export function UpdateFabIdModal({
  open,
  onClose,
  fabData,
}: {
  open: boolean;
  onClose: () => void;
  fabData: any;
}) {
  const { data: cutListData, isLoading: isCutListLoading } = useGetCutListDetailsQuery(
    fabData?.id,
    { skip: !fabData?.id }
  );

  const navigate = useNavigate();
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
      sawCutLnft: "",
      shopDate: "",
      installationDate: "",
      cutlistComplete: false,
    },
  });

  // ── Populate form from backend data ──────────────────────────────────────
  // Priority: cutListData (specific cut-list endpoint) → fabData (general FAB)
  useEffect(() => {
    if (!open || !fabData) return;

    // cutListData?.data is the authoritative backend source for cut-list fields
    const cutData = cutListData?.data;

    form.reset({
      pieces: (cutData?.no_of_pieces ?? fabData.no_of_pieces ?? "").toString() || "",
      totalSqFt: (cutData?.total_sqft ?? fabData.total_sqft ?? "").toString() || "",
      wjLinFt: (cutData?.wj_linft ?? fabData.wj_linft ?? "").toString() || "",
      edgingLinFt: (cutData?.edging_linft ?? fabData.edging_linft ?? "").toString() || "",
      cncLinFt: (cutData?.cnc_linft ?? fabData.cnc_linft ?? "").toString() || "",
      miterLinFt: (cutData?.miter_linft ?? fabData.miter_linft ?? "").toString() || "",
      sawCutLnft: (cutData?.saw_cut_lnft ?? fabData.saw_cut_lnft ?? "").toString() || "",
      shopDate: cutData?.shop_date_schedule ?? fabData.shop_date_schedule ?? "",
      installationDate: cutData?.installation_date ?? fabData.installation_date ?? "",
      // ✅ read cutlist_complete from backend; fall back to fabData field
      cutlistComplete: cutData?.cutlist_complete === true || fabData?.cutlist_complete === true,
    });
  }, [open, cutListData, fabData, form]);

  // ── Job info display ──────────────────────────────────────────────────────
  const jobInfo = [
    { label: "Job #", value: fabData?.job_details?.job_number || "-" },
    { label: "FAB type", value: fabData?.fab_type || "-" },
    { label: "Account", value: fabData?.job_details?.name || "-" },
    { label: "Area (s)", value: fabData?.input_area || "-" },
    { label: "Stone type", value: fabData?.stone_type_name || "-" },
    { label: "Stone color", value: fabData?.stone_color_name || "-" },
    { label: "Stone thickness", value: fabData?.stone_thickness_value || "-" },
    { label: "Edge", value: fabData?.edge_name || "-" },
  ];

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (values: UpdateFabData) => {
    setIsSubmitting(true);
    try {
      // Build schedule payload — only include defined values
      const requestData: Record<string, any> = {
        fab_id: fabData?.id,
        no_of_pieces: values.pieces ? parseInt(values.pieces) : undefined,
        total_sqft: values.totalSqFt ? parseFloat(values.totalSqFt) : undefined,
        wj_linft: values.wjLinFt ? parseFloat(values.wjLinFt) : undefined,
        edging_linft: values.edgingLinFt ? parseFloat(values.edgingLinFt) : undefined,
        cnc_linft: values.cncLinFt ? parseFloat(values.cncLinFt) : undefined,
        miter_linft: values.miterLinFt ? parseFloat(values.miterLinFt) : undefined,
        saw_cut_lnft: values.sawCutLnft ? parseFloat(values.sawCutLnft) : undefined,
        shop_date_schedule: values.shopDate || null,
        installation_date: values.installationDate || null,
      };

      const cleanedData = Object.fromEntries(
        Object.entries(requestData).filter(([_, v]) => v !== undefined)
      );

      await updateCutListSchedule({
        fab_id: fabData?.id,
        data: cleanedData,
      }).unwrap();

      // ✅ Send cutlist_complete (not revision_complete) to backend
      if (values.cutlistComplete) {
        await updateCutList({
          fab_id: fabData?.id,
          data: { cutlist_complete: true },
        }).unwrap();
      }

      toast.success(
        values.cutlistComplete
          ? "FAB scheduled and cut list confirmed!"
          : "FAB scheduled successfully!"
      );
      onClose();
      navigate("/job/cut-list");
    } catch (error) {
      console.error("Error scheduling FAB:", error);
      toast.error("Failed to schedule FAB");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── FAB type background colour ────────────────────────────────────────────
  const fabBgMap: Record<string, string> = {
    "standard": "bg-[#9eeb47]",
    "fab only": "bg-[#5bd1d7]",
    "cust redo": "bg-[#f0bf4c]",
    "resurface": "bg-[#d094ea]",
    "fast track": "bg-[#f59794]",
    "ag redo": "bg-[#f5cc94]",
  };

  const fabTypeKey = fabData?.fab_type
    ?.toLowerCase()
    ?.replace(/_/g, " ")
    ?.trim();

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className={`sm:max-w-2xl max-h-[90vh] flex flex-col ${fabBgMap[fabTypeKey] || ""}`}
      >
        <DialogHeader className="border-b">
          <DialogTitle>Update FAB ID</DialogTitle>
        </DialogHeader>

        {/* FAB identifier */}
        <div className="space-y-1 mb-4">
          <p className="font-bold text-lg">
            {fabData?.fabId || `FAB-${fabData?.id || "2024-001"}`}
          </p>
          <p className="text-sm">
            {fabData?.jobName || fabData?.job_details?.name || "Conference Table - Quartz"}
          </p>
        </div>

        {/* Job info grid */}
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

        {/* Scrollable form body */}
        <div className="overflow-y-auto overflow-x-visible flex-grow pr-2 -mr-2">
          <Form {...form}>
            <form
              id="update-fab-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 py-4"
            >
              {/* ── Quantities row ── */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pieces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. of pieces</FormLabel>
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Linear ft row ── */}
              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="edgingLinFt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edging LinFt</FormLabel>
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sawCutLnft"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saw Cut LnFt</FormLabel>
                      <FormControl><Input placeholder="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Dates + cut list complete ── */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="shopDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop date schedule</FormLabel>
                      <DateTimePicker
                        mode="date"
                        value={parseDateString(field.value)}
                        onChange={(date) => field.onChange(formatDate(date))}
                        minDate={new Date(new Date().setDate(new Date().getDate() - 1))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="installationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation date</FormLabel>
                      <DateTimePicker
                        mode="date"
                        value={parseDateString(field.value)}
                        onChange={(date) => field.onChange(formatDate(date))}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ✅ cutlistComplete — reads cutlist_complete from backend */}
                <FormField
                  control={form.control}
                  name="cutlistComplete"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-2">
                      <FormLabel>Cut List Complete</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
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