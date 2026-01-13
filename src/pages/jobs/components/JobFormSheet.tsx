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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircleIcon } from "lucide-react";
import type { Job } from "@/store/api/job";
import { useCreateJobMutation, useUpdateJobMutation, useGetAccountsQuery } from "@/store/api/job";
import { useGetSalesPersonsQuery } from "@/store/api/employee";
import { toast } from "sonner";

// Schema for validation
const jobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  job_number: z.string().min(1, "Job number is required"),
  project_value: z.string().optional(),
  account_id: z.string().optional(),
  description: z.string().optional(),
  sales_person_id: z.string().optional(),
});

type JobFormType = z.infer<typeof jobSchema>;

interface JobFormSheetProps {
  trigger: ReactNode;
  job?: Job;
  mode?: 'create' | 'edit' | 'view';
  onSubmitSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const JobFormSheet = ({ 
  trigger, 
  job, 
  mode = 'create',
  onSubmitSuccess, 
  open: controlledOpen, 
  onOpenChange 
}: JobFormSheetProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isSheetOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsSheetOpen = onOpenChange || setInternalOpen;
  
  const [createJob, { isLoading: isCreating }] = useCreateJobMutation();
  const [updateJob, { isLoading: isUpdating }] = useUpdateJobMutation();
  const { data: accountsData, isLoading: accountsLoading } = useGetAccountsQuery();
  const { data: salesPersonsData, isLoading: salesPersonsLoading } = useGetSalesPersonsQuery();
  
  // Extract sales persons from the response
  const salesPersons = useMemo(() => {
    if (!salesPersonsData) return [];
    
    // Handle both possible response formats
    let rawData: any[] = [];
    if (Array.isArray(salesPersonsData)) {
      rawData = salesPersonsData;
    } else if (typeof salesPersonsData === 'object' && 'data' in salesPersonsData) {
      rawData = (salesPersonsData as any).data || [];
    }
    
    // Extract names and IDs from sales person objects
    return rawData.map((item: any) => ({
      id: item.id || item.user_id,
      name: typeof item === 'string' ? item : (item.name || item.first_name + ' ' + item.last_name)
    }));
  }, [salesPersonsData]);
  
  const isSubmitting = isCreating || isUpdating;
  const isEditMode = mode === 'edit';
  const isViewMode = mode === 'view';

  const form = useForm<JobFormType>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      name: "",
      job_number: "",
      project_value: "",
      account_id: "",
      description: "",
      sales_person_id: "",
    },
  });

  // Prefill form when editing or viewing
  useEffect(() => {
    if (isSheetOpen && job) {
      const resetData = {
        name: job.name || "",
        job_number: job.job_number || "",
        project_value: job.project_value || "",
        account_id: job.account_id ? String(job.account_id) : "",
        description: (job as any).description || "",
        sales_person_id: (job as any).sales_person_id ? String((job as any).sales_person_id) : "",
      };
      
      form.reset(resetData);
    } else if (isSheetOpen && !job) {
      // Reset to empty for create mode
      form.reset({
        name: "",
        job_number: "",
        project_value: "",
        account_id: "",
        description: "",
        sales_person_id: "",
      });
    }
  }, [job, form, isSheetOpen]);

  async function onSubmit(values: JobFormType) {
    if (isViewMode) return;

    try {
      const jobData: any = {
        name: values.name,
        job_number: values.job_number,
        project_value: values.project_value || undefined,
        account_id: values.account_id ? parseInt(values.account_id) : undefined,
        description: values.description || undefined,
      };

      // Add sales person for create mode
      if (!isEditMode && values.sales_person_id) {
        jobData.sales_person_id = parseInt(values.sales_person_id);
      }

      // Set status to completed (3) when updating existing job
      if (isEditMode && job) {
        jobData.status_id = 3; // completed status
        await updateJob({ 
          id: job.id, 
          data: jobData 
        }).unwrap();
        toast.success("Job updated successfully and marked as completed");
      } else {
        await createJob(jobData).unwrap();
        toast.success("Job created successfully");
      }

      form.reset();
      setIsSheetOpen(false);
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error: any) {
      const errorMessage = error?.data?.detail || error?.data?.message || 
        `Failed to ${isEditMode ? 'update' : 'create'} job`;
      toast.error(errorMessage);
    }
  }

  const handleCancel = () => {
    form.reset();
    setIsSheetOpen(false);
  };

  const getTitle = () => {
    if (isViewMode) return "View job";
    if (isEditMode) return "Edit job";
    return "Add new job";
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="gap-0 sm:w-[500px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <SheetHeader className="mb-3 border-border pb-3.5 border-b">
                <SheetTitle>{getTitle()}</SheetTitle>
              </SheetHeader>

              <SheetBody className="flex-1">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter job name" 
                                {...field} 
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="job_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Number *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter job number" 
                                {...field} 
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="project_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Value</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter project value" 
                                {...field} 
                                disabled={isViewMode}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="account_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account</FormLabel>
                            <Select 
                              value={field.value} 
                              onValueChange={field.onChange}
                              disabled={isViewMode || accountsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    accountsLoading ? "Loading accounts..." : "Select Account"
                                  }>
                                    {accountsLoading ? "Loading..." : field.value ? 
                                      accountsData?.find(acc => String(acc.id) === field.value)?.name : 
                                      "Select Account"
                                    }
                                  </SelectValue>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accountsData?.map((account) => (
                                  <SelectItem key={account.id} value={String(account.id)}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                                {(!accountsData || accountsData.length === 0) && !accountsLoading && (
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                    No accounts available
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Description Field */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter job notes" 
                                {...field} 
                                disabled={isViewMode}
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Sales Person Field - Only show for create mode */}
                      {!isEditMode && (
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
                                    <SelectValue placeholder={
                                      salesPersonsLoading ? "Loading sales persons..." : "Select Sales Person"
                                    }>
                                      {salesPersonsLoading ? "Loading..." : field.value ? 
                                        salesPersons.find(sp => String(sp.id) === field.value)?.name : 
                                        "Select Sales Person"
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {salesPersons.map((salesPerson) => (
                                    <SelectItem key={salesPerson.id} value={String(salesPerson.id)}>
                                      {salesPerson.name}
                                    </SelectItem>
                                  ))}
                                  {(!salesPersons || salesPersons.length === 0) && !salesPersonsLoading && (
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
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </SheetBody>

              <SheetFooter className="py-3.5 px-5 border-border flex justify-end gap-3 mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting && !isViewMode}
                >
                  {isViewMode ? 'Close' : 'Cancel'}
                </Button>
                {!isViewMode && (
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="justify-center"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                        {isEditMode ? "Updating..." : "Saving..."}
                      </span>
                    ) : (
                      isEditMode ? "Save changes" : "Save job"
                    )}
                  </Button>
                )}
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default JobFormSheet;