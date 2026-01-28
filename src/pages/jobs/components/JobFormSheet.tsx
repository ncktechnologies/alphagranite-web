import { ReactNode, useEffect, useState, useMemo, useRef } from "react";
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
import { LoaderCircleIcon, Plus, Search, ArrowLeft } from "lucide-react";
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
// Schema with proper transformation
// =======================
const jobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  job_number: z.string().min(1, "Job number is required"),
  project_value: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return "";
      return String(val);
    },
    z.string().optional()
  ),
  sq_ft: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === "") return "";
      return String(val);
    },
    z.string().optional()
  ),
  account_id: z.string().optional(),
  description: z.string().optional(),
  sales_person_id: z.string().optional(),
});

type JobFormType = z.infer<typeof jobSchema>;

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
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  
  // Separate state for create account form
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountData, setNewAccountData] = useState({
    account_number: "",
    contact_person: "",
    email: "",
    phone: "",
  });
  
  // Store account data to persist across popover closes
  const persistAccountDataRef = useRef({
    search: "",
    showCreateForm: false,
    newAccountName: "",
    accountData: {
      account_number: "",
      contact_person: "",
      email: "",
      phone: "",
    }
  });

  // Restore persisted data when popover opens
  useEffect(() => {
    if (accountPopoverOpen) {
      setAccountSearch(persistAccountDataRef.current.search);
      if (persistAccountDataRef.current.showCreateForm) {
        setShowCreateAccountForm(true);
        setNewAccountName(persistAccountDataRef.current.newAccountName);
        setNewAccountData(persistAccountDataRef.current.accountData);
      }
    } else {
      // Clear search when popover closes
      setAccountSearch("");
      setShowCreateAccountForm(false);
    }
  }, [accountPopoverOpen]);

  // Save data when popover closes
  const handleAccountPopoverClose = () => {
    persistAccountDataRef.current = {
      search: accountSearch,
      showCreateForm: showCreateAccountForm,
      newAccountName: newAccountName,
      accountData: newAccountData
    };
    setAccountPopoverOpen(false);
  };

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

  // =======================
  // Reset form with proper type conversion
  // =======================
  useEffect(() => {
    if (isSheetOpen) {
      // Clear persisted data when sheet opens
      persistAccountDataRef.current = {
        search: "",
        showCreateForm: false,
        newAccountName: "",
        accountData: {
          account_number: "",
          contact_person: "",
          email: "",
          phone: "",
        }
      };
      
      if (job) {
        // Convert all values to strings for the form
        const formData = {
          name: job.name || "",
          job_number: job.job_number || "",
          project_value: job.project_value != null ? String(job.project_value) : "",
          sq_ft: (job as any).sq_ft != null ? String((job as any).sq_ft) : "",
          account_id: job.account_id ? String(job.account_id) : "",
          description: (job as any).description || "",
          sales_person_id: (job as any).sales_person_id
            ? String((job as any).sales_person_id)
            : "",
        };
        form.reset(formData);
      } else if (mode === 'create') {
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
    }
  }, [job, isSheetOpen, mode, form]);

  // =======================
  // Handlers
  // =======================
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error("Account name is required");
      return;
    }

    try {
      const created = await createAccount({
        name: newAccountName.trim(),
        account_number: newAccountData.account_number,
        contact_person: newAccountData.contact_person,
        email: newAccountData.email,
        phone: newAccountData.phone,
      }).unwrap();

      if (created?.id) {
        form.setValue("account_id", String(created.id));
        // Close popover when account is created
        setAccountPopoverOpen(false);
      }

      // Reset form
      setNewAccountName("");
      setNewAccountData({
        account_number: "",
        contact_person: "",
        email: "",
        phone: "",
      });
      setShowCreateAccountForm(false);
      
      // Update persisted data
      persistAccountDataRef.current = {
        ...persistAccountDataRef.current,
        showCreateForm: false,
        newAccountName: "",
        accountData: {
          account_number: "",
          contact_person: "",
          email: "",
          phone: "",
        }
      };

      toast.success("Account created successfully");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create account");
    }
  };

  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    form.setValue("account_id", accountId);
    setAccountPopoverOpen(false); // Close popover when account is selected
  };

  // Reset create account form
  const resetCreateAccountForm = () => {
    setShowCreateAccountForm(false);
    setNewAccountName("");
    setNewAccountData({
      account_number: "",
      contact_person: "",
      email: "",
      phone: "",
    });
    
    // Update persisted data
    persistAccountDataRef.current = {
      ...persistAccountDataRef.current,
      showCreateForm: false,
      newAccountName: "",
      accountData: {
        account_number: "",
        contact_person: "",
        email: "",
        phone: "",
      }
    };
  };

  async function onSubmit(values: JobFormType) {
    if (isViewMode) return;

    try {
      const payload: any = {
        name: values.name,
        job_number: values.job_number,
        project_value: values.project_value?.trim() || undefined,
        sq_ft: values.sq_ft?.trim() || undefined,
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
                          <Input 
                            {...field} 
                            disabled={isViewMode}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
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
                          <Input 
                            {...field} 
                            disabled={isViewMode} 
                            placeholder="Enter square footage"
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
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

                  {/* Account Selector */}
                  <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Account</FormLabel>
                        <Popover 
                          open={accountPopoverOpen} 
                          onOpenChange={setAccountPopoverOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full h-10 px-3 justify-between font-normal"
                                disabled={isViewMode || accountsLoading}
                                type="button"
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

                          <PopoverContent 
                            className="w-[--radix-popover-trigger-width] p-2"
                            align="start"
                            onInteractOutside={handleAccountPopoverClose}
                            onEscapeKeyDown={handleAccountPopoverClose}
                          >
                            {/* Show either create account form or account list */}
                            {showCreateAccountForm ? (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetCreateAccountForm}
                                    className="h-6 w-6 p-0"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </Button>
                                  <Label className="text-sm font-medium">Create New Account</Label>
                                </div>
                                
                                <div className="space-y-2">
                                  <div>
                                    <Label className="text-xs">Account Name *</Label>
                                    <Input
                                      value={newAccountName}
                                      onChange={(e) => {
                                        setNewAccountName(e.target.value);
                                        // Update persisted data
                                        persistAccountDataRef.current.newAccountName = e.target.value;
                                      }}
                                      placeholder="Enter account name"
                                      required
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Account Number</Label>
                                    <Input
                                      value={newAccountData.account_number}
                                      onChange={(e) => {
                                        setNewAccountData(prev => ({...prev, account_number: e.target.value}));
                                        persistAccountDataRef.current.accountData.account_number = e.target.value;
                                      }}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Contact Person</Label>
                                    <Input
                                      value={newAccountData.contact_person}
                                      onChange={(e) => {
                                        setNewAccountData(prev => ({...prev, contact_person: e.target.value}));
                                        persistAccountDataRef.current.accountData.contact_person = e.target.value;
                                      }}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Email</Label>
                                    <Input
                                      type="email"
                                      value={newAccountData.email}
                                      onChange={(e) => {
                                        setNewAccountData(prev => ({...prev, email: e.target.value}));
                                        persistAccountDataRef.current.accountData.email = e.target.value;
                                      }}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Phone</Label>
                                    <Input
                                      value={newAccountData.phone}
                                      onChange={(e) => {
                                        setNewAccountData(prev => ({...prev, phone: e.target.value}));
                                        persistAccountDataRef.current.accountData.phone = e.target.value;
                                      }}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  
                                  <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      type="button"
                                      onClick={resetCreateAccountForm}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      type="button"
                                      onClick={handleAddAccount}
                                    >
                                      Create Account
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium">Accounts</span>
                                  {!isViewMode && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      type="button"
                                      onClick={() => {
                                        setShowCreateAccountForm(true);
                                        persistAccountDataRef.current.showCreateForm = true;
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  )}
                                </div>

                                <Input
                                  placeholder="Search account..."
                                  value={accountSearch}
                                  onChange={(e) => {
                                    setAccountSearch(e.target.value);
                                    persistAccountDataRef.current.search = e.target.value;
                                  }}
                                  autoFocus
                                />

                                <div className="max-h-48 overflow-y-auto">
                                  {filteredAccounts.map((account) => (
                                    <div
                                      key={account.id}
                                      className="px-3 py-2 text-sm hover:bg-muted rounded cursor-pointer"
                                      onClick={() => handleAccountSelect(String(account.id))}
                                    >
                                      {account.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />

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
                            placeholder="Add notes about this job..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
            </SheetBody>

            <SheetFooter className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsSheetOpen(false);
                  // Reset persisted data when sheet closes completely
                  persistAccountDataRef.current = {
                    search: "",
                    showCreateForm: false,
                    newAccountName: "",
                    accountData: {
                      account_number: "",
                      contact_person: "",
                      email: "",
                      phone: "",
                    }
                  };
                }}
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>

              {!isViewMode && (
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !form.formState.isValid}
                >
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