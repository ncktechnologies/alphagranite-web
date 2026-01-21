import { ReactNode, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoaderCircleIcon, Plus, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { Job } from "@/store/api/job";
import {
  useCreateJobMutation,
  useUpdateJobMutation,
  useGetAccountsQuery,
  useCreateAccountMutation,
} from "@/store/api/job";
import { useGetSalesPersonsQuery } from "@/store/api/employee";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// =======================
// Schema
// =======================
const jobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  job_number: z.string().min(1, "Job number is required"),
  project_value: z.string().optional(),
  sq_ft: z.string().optional(),
  account_id: z.string().optional(),
  description: z.string().optional(),
  sales_person_id: z.string().optional(),
});

type JobFormType = z.infer<typeof jobSchema>;

interface JobFormData {
  name: string;
  job_number: string;
  project_value: string;
  sq_ft: string;
  account_id?: number;
}

interface JobFormSheetProps {
  trigger: ReactNode;
  job?: Job;
  mode?: "create" | "edit" | "view";
  onSubmitSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const JobFormSheet = ({
  trigger,
  job,
  mode = "create",
  onSubmitSuccess,
  open: controlledOpen,
  onOpenChange,
}: JobFormSheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isSheetOpen = controlledOpen ?? internalOpen;
  const setIsSheetOpen = onOpenChange || setInternalOpen;

  const isEditMode = mode === "edit";
  const isViewMode = mode === "view";

  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();
  const [updateJob, { isLoading: isUpdating }] = useUpdateJobMutation();
  const { data: accountsData, isLoading: accountsLoading } =
    useGetAccountsQuery();
  const [createAccount] = useCreateAccountMutation();
  const { data: salesPersonsData, isLoading: salesPersonsLoading } =
    useGetSalesPersonsQuery();

  const isSubmitting = isCreating || isUpdating;

  // =======================
  // Account UI state
  // =======================
  const [accountSearch, setAccountSearch] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState("");

  const filteredAccounts = useMemo(() => {
    if (!accountsData) return [];
    return accountsData.filter((a) =>
      a.name.toLowerCase().includes(accountSearch.toLowerCase())
    );
  }, [accountsData, accountSearch]);

  // =======================
  // Sales persons
  // =======================
  const salesPersons = useMemo(() => {
    if (!salesPersonsData) return [];
    return Array.isArray(salesPersonsData)
      ? salesPersonsData.map((sp: any) => ({
        id: sp.id || sp.user_id,
        name: sp.name || `${sp.first_name} ${sp.last_name}`,
      }))
      : [];
  }, [salesPersonsData]);

  // =======================
  // Form
  // =======================
  const form = useForm<JobFormType>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      name: "",
      job_number: "",
      project_value: "",
      sq_ft: "",
      account_id: "",
      description: "",
      sales_person_id: "",
    },
  });

  useEffect(() => {
    if (isSheetOpen && job) {
      form.reset({
        name: job.name || "",
        job_number: job.job_number || "",
        project_value: job.project_value || "",
        sq_ft: (job as any).sq_ft || "",
        account_id: job.account_id ? String(job.account_id) : "",
        description: (job as any).description || "",
        sales_person_id: (job as any).sales_person_id
          ? String((job as any).sales_person_id)
          : "",
      });
    } else if (isSheetOpen && mode === 'create') {
      // Explicitly reset to empty values for new job creation
      form.reset({
        name: "",
        job_number: "",
        project_value: "",
        sq_ft: "",
        account_id: "",
        description: "",
        sales_person_id: "",
      });
    }
  }, [job, isSheetOpen, mode, form]);

  // =======================
  // Handlers
  // =======================
  const handleAddAccount = async () => {
    if (!newAccount.trim()) return;

    try {
      const created = await createAccount({
        name: newAccount.trim(),
      }).unwrap();

      if (created?.id) {
        form.setValue("account_id", String(created.id));
      }

      setNewAccount("");
      setAccountSearch("");
      setShowAddAccount(false);

      toast.success("Account created successfully");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create account");
    }
  };

  async function onSubmit(values: JobFormType) {
    if (isViewMode) return;

    try {
      const payload: any = {
        name: values.name,
        job_number: values.job_number,
        project_value: values.project_value || undefined,
        sq_ft: values.sq_ft || undefined,
        account_id: values.account_id
          ? parseInt(values.account_id)
          : undefined,
        description: values.description || undefined,
      };

      if (!isEditMode && values.sales_person_id) {
        payload.sales_person_id = parseInt(values.sales_person_id);
      }

      if (isEditMode && job) {
        payload.status_id = 3;
        await updateJob({ id: job.id, data: payload }).unwrap();
        toast.success("Job updated successfully");
      } else {
        await createJob(payload).unwrap();
        toast.success("Job created successfully");
      }

      form.reset();
      setIsSheetOpen(false);
      onSubmitSuccess?.();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save job");
    }
  }


  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[500px] rounded-lg p-4 h-[calc(100vh-2rem)]">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <SheetHeader className="mb-3 border-b pb-3">
              <SheetTitle>
                {isViewMode ? "View job" : isEditMode ? "Edit job" : "Add new job"}
              </SheetTitle>
            </SheetHeader>

            <SheetBody className="flex-1 overflow-y-auto">
              {/* Removed ScrollArea to fix tab focus issue - using native overflow instead */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Job Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewMode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Job Number */}
                  <FormField
                    control={form.control}
                    name="job_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Number *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewMode} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Project Value */}
                  <FormField
                    control={form.control}
                    name="project_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Value</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewMode} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Square Footage */}
                  <FormField
                    control={form.control}
                    name="sq_ft"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Footage</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewMode} placeholder="Enter square footage" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {/* Sales Person */}
                  <FormField
                    control={form.control}
                    name="sales_person_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Person</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isViewMode || salesPersonsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  salesPersonsLoading
                                    ? "Loading sales persons..."
                                    : "Select Sales Person"
                                }
                              >
                                {salesPersonsLoading
                                  ? "Loading..."
                                  : field.value
                                    ? salesPersons.find(
                                      (sp) => String(sp.id) === field.value
                                    )?.name
                                    : "Select Sales Person"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>

                          <SelectContent>
                            {salesPersons.map((salesPerson) => (
                              <SelectItem
                                key={salesPerson.id}
                                value={String(salesPerson.id)}
                              >
                                {salesPerson.name}
                              </SelectItem>
                            ))}

                            {!salesPersonsLoading && salesPersons.length === 0 && (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                No sales persons available
                              </div>
                            )}
                          </SelectContent>
                        </Select>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Account (FAB-style) */}
                  <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Account</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full h-10 px-3 justify-between font-normal"
                                disabled={isViewMode || accountsLoading}
                              >
                                {accountsLoading
                                  ? "Loading..."
                                  : field.value
                                    ? accountsData?.find(
                                      (a) =>
                                        String(a.id) === field.value
                                    )?.name
                                    : "Select account"}
                                <Search className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">
                                Accounts
                              </span>

                              {!isViewMode && (
                                <Popover
                                  open={showAddAccount}
                                  onOpenChange={setShowAddAccount}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </PopoverTrigger>

                                  <PopoverContent className="w-72">
                                    <div className="space-y-3">
                                      <Label>Account Name</Label>
                                      <Input
                                        value={newAccount}
                                        onChange={(e) =>
                                          setNewAccount(e.target.value)
                                        }
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setShowAddAccount(false)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={handleAddAccount}
                                        >
                                          Add
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>

                            <Input
                              placeholder="Search account..."
                              value={accountSearch}
                              onChange={(e) =>
                                setAccountSearch(e.target.value)
                              }
                              className="mb-2"
                            />

                            <div className="max-h-48 overflow-y-auto">
                              {filteredAccounts.map((account) => (
                                <div
                                  key={account.id}
                                  className="px-3 py-2 text-sm hover:bg-muted rounded cursor-pointer"
                                  onClick={() =>
                                    field.onChange(String(account.id))
                                  }
                                >
                                  {account.name}
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />
                  {/* Sales Person Field - Create mode only */}
                  

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            disabled={isViewMode}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
            </SheetBody>

            <SheetFooter className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>

              {!isViewMode && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save job"
                  )}
                </Button>
              )}
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

export default JobFormSheet;
