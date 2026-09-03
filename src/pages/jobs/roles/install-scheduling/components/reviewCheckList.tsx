import { useState, useEffect, useCallback, useMemo } from "react";
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
import { LoaderCircle, Search } from "lucide-react";
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
  useGetInstallCompletionByFabIdQuery,
  useUpdateFabStageMutation,
  useCreateInstallCompletionMutation,
  useUpdateInstallCompletionMutation,
} from "@/store/api/job";
import { Can } from "@/components/permission";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useGetRolesQuery } from "@/store/api/role";
import { useGetEmployeesQuery } from "@/store/api/employee";
import Popup from "@/components/ui/popup";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  install_confirm: z.boolean().optional(),
  fab_notes: z.string().optional(),
  installer_id: z.string().optional(),
  scheduled_install_date: z.string().optional(),
  scheduled_end_date: z.string().optional(),
});

type InstallChecklistData = z.infer<typeof installChecklistSchema>;

interface InstallChecklistFormProps {
  fabId?: number;
  showCompletionFields?: boolean;
}

// Extra Crew List component (unchanged)
const ExtraCrewList = ({
  options,
  selectedIds,
  onToggle,
  maxSelections = 3,
}: {
  options: Array<{ id: string; name: string }>;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  maxSelections?: number;
}) => {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() =>
    options.filter(opt =>
      opt.name.toLowerCase().includes(search.toLowerCase())
    ),
    [options, search]
  );

  const selectedCount = selectedIds.size;
  const isLimitReached = selectedCount >= maxSelections;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search crew members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-[34px]"
        />
      </div>
      <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 space-y-2">
        {filteredOptions.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            No crew members found
          </div>
        )}
        {filteredOptions.map((opt) => {
          const isSelected = selectedIds.has(opt.id);
          const disabled = !isSelected && isLimitReached;
          return (
            <div key={opt.id} className="flex items-center space-x-2">
              <Checkbox
                id={`extra-crew-${opt.id}`}
                checked={isSelected}
                disabled={disabled}
                onCheckedChange={(checked) => onToggle(opt.id, !!checked)}
              />
              <label
                htmlFor={`extra-crew-${opt.id}`}
                className={cn(
                  "text-sm font-medium leading-none",
                  disabled && "text-muted-foreground"
                )}
              >
                {opt.name}
              </label>
            </div>
          );
        })}
      </div>
      {isLimitReached && selectedCount > 0 && (
        <p className="text-xs text-amber-600">
          Maximum {maxSelections} extra crew members selected
        </p>
      )}
    </div>
  );
};

export function InstallChecklistForm({ fabId, showCompletionFields = false }: InstallChecklistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingValues, setPendingValues] = useState<InstallChecklistData | null>(null);
  const navigate = useNavigate();

  // Extra crew state
  const [selectedExtraCrewIds, setSelectedExtraCrewIds] = useState<Set<string>>(new Set());

  // ─── Fetch installer role ID ──────────────────────────────────────────────
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery();
  const installerRoleId = useMemo(() => {
    if (!rolesData) return null;
    const roles = rolesData?.data?.data ?? rolesData?.data ?? rolesData;
    if (!Array.isArray(roles)) return null;
    const role = roles.find((r: any) => {
      const name = (r.name || '').toLowerCase().trim();
      return name === 'installer';
    });
    return role?.id ?? null;
  }, [rolesData]);

  // ─── Fetch employees filtered by installerRoleId ────────────────────────
  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery(
    {
      role_id: installerRoleId ?? undefined,
      sort_by: 'first_name',
      sort_order: 'asc',
      limit: 500,
    },
    {
      skip: !installerRoleId,
    }
  );

  const installers = useMemo(() => {
    if (!employeesData) return [];
    const employees = employeesData?.data ?? employeesData;
    if (!Array.isArray(employees)) return [];
    return employees;
  }, [employeesData]);

  const isLoading = rolesLoading || employeesLoading;

  // Build options for dropdowns
  const installerOptions = useMemo(() =>
    installers.map((emp: any) => ({
      id: String(emp.id),
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email,
    })),
    [installers]
  );

  // Mutations
  const [createFabNote] = useCreateFabNoteMutation();
  const [createInstallScheduling] = useCreateInstallSchedulingMutation();
  const [updateInstallScheduling] = useUpdateInstallSchedulingMutation();
  const [updateFabStage] = useUpdateFabStageMutation();
  const [createInstallCompletion] = useCreateInstallCompletionMutation();
  const [updateInstallCompletion] = useUpdateInstallCompletionMutation();

  // Queries (always enabled when fabId exists)
  const { data: fabData, refetch: refetchFab } = useGetFabByIdQuery(fabId || 0, { skip: !fabId });
  const { data: installData, refetch: refetchInstall } = useGetInstallSchedulingByFabIdQuery(
    fabId || 0,
    { skip: !fabId }
  );
  const { data: completionData, refetch: refetchCompletion } = useGetInstallCompletionByFabIdQuery(
    fabId || 0,
    { skip: !fabId }
  );

  const form = useForm<InstallChecklistData>({
    resolver: zodResolver(installChecklistSchema),
    defaultValues: {
      install_completed: false,
      install_confirm: false,
      fab_notes: "",
      installer_id: "",
      scheduled_install_date: "",
      scheduled_end_date: "",
    },
  });

  const installCompleted = form.watch("install_completed");

  // Reset form – wait for installerOptions to be ready
  useEffect(() => {
    if (!fabId) return;
    if (installerOptions.length === 0) return;

    const fab = fabData?.data;
    const install = installData?.data ?? installData;
    const completion = completionData?.data ?? completionData;

    form.reset({
      install_completed: completion?.is_completed === true,
      install_confirm: completion?.install_confirm === true,
      fab_notes: fab?.fab_notes || "",
      installer_id: install?.installer_id ? String(install.installer_id) : "",
      scheduled_install_date: install?.scheduled_install_date
        ? install.scheduled_install_date.split("T")[0]
        : "",
      scheduled_end_date: install?.scheduled_end_date
        ? install.scheduled_end_date.split("T")[0]
        : "",
    });

    // Populate extra crew IDs
    const crewSet = new Set<string>();
    if (install?.extra_crew_1_id && install.extra_crew_1_id !== 0) crewSet.add(String(install.extra_crew_1_id));
    if (install?.extra_crew_2_id && install.extra_crew_2_id !== 0) crewSet.add(String(install.extra_crew_2_id));
    if (install?.extra_crew_3_id && install.extra_crew_3_id !== 0) crewSet.add(String(install.extra_crew_3_id));
    setSelectedExtraCrewIds(crewSet);
  }, [fabId, fabData, installData, completionData, installerOptions, form]);

  const toggleExtraCrew = useCallback((userId: string, checked: boolean) => {
    if (checked) {
      if (selectedExtraCrewIds.size >= 3) {
        toast.warning("Maximum 3 extra crew members allowed.");
        return;
      }
      setSelectedExtraCrewIds(prev => new Set(prev).add(userId));
    } else {
      setSelectedExtraCrewIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [selectedExtraCrewIds]);

  const getExtraCrewPayload = useCallback(() => {
    const ids = Array.from(selectedExtraCrewIds).sort();
    const payload = { extra_crew_1_id: 0, extra_crew_2_id: 0, extra_crew_3_id: 0 };
    ids.forEach((id, idx) => {
      if (idx === 0) payload.extra_crew_1_id = Number(id);
      else if (idx === 1) payload.extra_crew_2_id = Number(id);
      else if (idx === 2) payload.extra_crew_3_id = Number(id);
    });
    return payload;
  }, [selectedExtraCrewIds]);

  // ---------- MAIN SUBMIT LOGIC ----------
  const doSubmit = useCallback(async (values: InstallChecklistData) => {
    if (!fabId) {
      toast.error("No FAB ID provided.");
      return;
    }

    const hasNotes = !!values.fab_notes?.trim();
    const hasInstallDate = !!values.scheduled_install_date;
    const hasInstaller = !!values.installer_id;
    const isCompleted = values.install_completed;
    const hasEndDate = !!values.scheduled_end_date;
    const hasExtraCrew = selectedExtraCrewIds.size > 0;
    const hasConfirm = values.install_confirm === true;

    if (!hasNotes && !hasInstallDate && !hasInstaller && !isCompleted && !hasEndDate && !hasExtraCrew && !hasConfirm) {
      toast.warning("No changes to save.");
      return;
    }

    setIsSubmitting(true);
    let someSuccess = false;

    try {
      // 1. Notes
      if (hasNotes) {
        await createFabNote({
          fab_id: fabId,
          note: values.fab_notes!.trim(),
          stage: "install_scheduling",
        }).unwrap();
        someSuccess = true;
      }

      // 2. Install scheduling – get or create
      let installId = installData?.data?.id ?? installData?.id;
      if (!installId && (hasInstallDate || hasInstaller || isCompleted || hasEndDate || hasExtraCrew || hasConfirm)) {
        const createRes = await createInstallScheduling({ fab_id: fabId }).unwrap();
        installId = createRes?.data?.id ?? createRes?.id;
        if (!installId) throw new Error("Failed to create install scheduling");
        someSuccess = true;
        await refetchInstall();
      }

      // 3. Update install scheduling details (if installId exists)
      if (installId && (hasInstallDate || hasInstaller || hasExtraCrew || hasEndDate || isCompleted)) {
        const schedulePayload: any = { ...getExtraCrewPayload() };
        if (hasInstaller) schedulePayload.installer_id = Number(values.installer_id);
        if (hasInstallDate) schedulePayload.scheduled_install_date = values.scheduled_install_date;
        if (hasEndDate) schedulePayload.scheduled_end_date = values.scheduled_end_date;
        if (isCompleted && !hasEndDate) {
          schedulePayload.scheduled_end_date = formatDate(new Date());
        }
        schedulePayload.is_completed =  false;
        await updateInstallScheduling({ install_scheduling_id: installId, data: schedulePayload }).unwrap();
        someSuccess = true;
      }

      // 4. Handle Install Completion – ONLY if install_confirm is checked
      if (hasConfirm) {
        const completionPayload: any = {
          fab_id: fabId,
          installer_id: hasInstaller ? Number(values.installer_id) : undefined,
          install_date: hasInstallDate ? values.scheduled_install_date : undefined,
          completion_date: hasEndDate ? values.scheduled_end_date : null,
          is_completed: isCompleted || false,
          install_confirm: true, // always true because we're in hasConfirm block
        };

        let completionId = completionData?.data?.id;
        if (completionId) {
          await updateInstallCompletion({ fab_id: completionId, data: completionPayload }).unwrap();
        } else {
          const createCompRes = await createInstallCompletion(completionPayload).unwrap();
          completionId = createCompRes?.data?.id ?? createCompRes?.id;
        }
        someSuccess = true;
      }

      // 5. Stage transition – only if stage is not already install_completion
      if (hasInstallDate && fabData?.data?.current_stage !== "install_completion") {
        await updateFabStage({ fab_id: fabId, data: { current_stage: "install_completion" } }).unwrap();
        someSuccess = true;
      }

      if (someSuccess) {
        toast.success(isCompleted ? "Install completed and saved!" : "Changes saved successfully");
        navigate(-1);
      } else {
        toast.warning("No data was saved");
      }
    } catch (error) {
      console.error("ERROR in doSubmit:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSubmitting(false);
    }
  }, [fabId, selectedExtraCrewIds, createFabNote, createInstallScheduling, updateInstallScheduling, updateFabStage, createInstallCompletion, updateInstallCompletion, installData, completionData, getExtraCrewPayload, navigate, refetchInstall, refetchCompletion]);

  const onSubmit = useCallback(async (values: InstallChecklistData) => {
    if (values.install_completed) {
      setPendingValues(values);
      setShowConfirmModal(true);
      return;
    }
    await doSubmit(values);
  }, [doSubmit]);

  const handleConfirmProceed = useCallback(async () => {
    if (pendingValues) {
      await doSubmit(pendingValues);
    }
    setShowConfirmModal(false);
    setPendingValues(null);
  }, [pendingValues, doSubmit]);

  const handleCancelProceed = useCallback(() => {
    setShowConfirmModal(false);
    setPendingValues(null);
  }, []);

  const getEndDateDisplay = useCallback(() => {
    if (!pendingValues) return "";
    const endDate = pendingValues.scheduled_end_date;
    if (endDate) return new Date(endDate).toLocaleDateString();
    return "No end date provided";
  }, [pendingValues]);

  // ---------- RENDER ----------
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {showCompletionFields && (
            <>
              <FormField
                control={form.control}
                name="install_confirm"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-base font-semibold text-text">
                      Install confirmation
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="install_completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-base font-semibold text-text">Install completed</FormLabel>
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="installer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Installer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-[34px]">
                      <SelectValue placeholder={isLoading ? "Loading installers..." : "Select an installer"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {!isLoading &&
                      installerOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    {!isLoading && installerOptions.length === 0 && (
                      <div className="px-2 py-1 text-sm text-muted-foreground">No installers found</div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Extra Crew (max 3)</FormLabel>
            <ExtraCrewList
              options={installerOptions}
              selectedIds={selectedExtraCrewIds}
              onToggle={toggleExtraCrew}
              maxSelections={3}
            />
            <FormMessage />
          </FormItem>

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
                  triggerClassName="h-[34px]"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {showCompletionFields && installCompleted && (
            <FormField
              control={form.control}
              name="scheduled_end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual end date</FormLabel>
                  <DateTimePicker
                    mode="date"
                    value={parseDateString(field.value)}
                    onChange={(date) => field.onChange(formatDate(date))}
                    triggerClassName="h-[34px]"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="fab_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Type here..." className="min-h-[100px] resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-4" />

          <div className="space-y-3 mt-6">
            <Button className="w-full py-6 text-base" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button variant="outline" type="button" className="w-full text-secondary font-bold py-6 text-base" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <Popup
        isOpen={showConfirmModal}
        onClose={handleCancelProceed}
        title="Confirm Install Completion"
        description={`The install completion date is set to ${getEndDateDisplay()}. Are you sure you want to mark this install as completed and proceed?`}
        centered
        className="h-auto max-w-[500px] px-3"
      >
        <div className="flex justify-center space-x-3 my-3">
          <Button variant="outline" onClick={handleCancelProceed} className="w-[200px] text-red-500">
            Cancel
          </Button>
          <Button onClick={handleConfirmProceed} disabled={isSubmitting} className="w-[140px]">
            {isSubmitting ? "Processing..." : "Proceed"}
          </Button>
        </div>
      </Popup>
    </>
  );
}