"use client"

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/common/container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Plus, AlertCircle, Check, LoaderCircleIcon, Search, ChevronDown, InfoIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { RiInformationFill } from '@remixicon/react';
import { toast } from 'sonner';
import {
  useGetFabTypesQuery,
  useGetAccountsQuery,
  useGetStoneTypesQuery,
  useGetStoneColorsQuery,
  useGetStoneThicknessesQuery,
  useGetEdgesQuery,
  useCreateFabMutation,
  useCreateAccountMutation,
  useCreateStoneThicknessMutation,
  useCreateStoneTypeMutation,
  useCreateStoneColorMutation,
  useCreateEdgeMutation,
  useGetJobsQuery,
  useGetJobsByAccountQuery
} from '@/store/api/job';
import { useAuth } from '@/auth/context/auth-context';
import { useGetSalesPersonsQuery } from '@/store/api/employee';

// Update the Zod schema - remove jobName and jobNumber as required fields since they'll be selected
// Added cost_of_stone field
const fabIdFormSchema = z.object({
  fabType: z.string().min(1, 'FAB Type is required'),
  account: z.string().min(1, 'Account is required'),
  jobName: z.string().optional(),
  jobNumber: z.string().optional(),
  area: z.string().min(1, 'Area is required'),
  stoneType: z.string().min(1, 'Stone Type is required'),
  stoneColor: z.string().min(1, 'Stone Color is required'),
  stoneThickness: z.string().min(1, 'Stone Thickness is required'),
  edge: z.string().min(1, 'Edge is required'),
  totalSqFt: z.string().min(1, 'Total Sq Ft is required'),
  revenue: z.string().min(1, 'Revenue is required')
    .refine((val) => !isNaN(parseFloat(val)), { message: 'Revenue must be a number' }),
  cost_of_stone: z.string().optional()
    .refine((val) => val === '' || !isNaN(parseFloat(val)), { message: 'Cost of Stone must be a number' }),
  selectedSalesPerson: z.string().min(1, 'Sales Person is required'),
  notes: z.string().optional(), // Keep as string
  templateNotNeeded: z.boolean(),
  draftNotNeeded: z.boolean(),
  slabSmithCustNotNeeded: z.boolean(),
  sctNotNeeded: z.boolean(),
  slabSmithAGNotNeeded: z.boolean(),
  finalProgrammingNotNeeded: z.boolean(),
}).refine((data) => data.jobName || data.jobNumber, {
  message: "Please select either job name or job number",
  path: ["jobName"],
});

type FabIdFormData = z.infer<typeof fabIdFormSchema>;

const NewFabIdForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const firstFieldRef = useRef<HTMLButtonElement>(null);

  // Focus first field when form opens
  useEffect(() => {
    if (firstFieldRef.current) {
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100); // Small delay to ensure DOM is ready
    }
  }, []);

  // API hooks for dropdown data with error handling
  const {
    data: fabTypesData,
    isLoading: isLoadingFabTypes,
    isError: isFabTypesError,
    error: fabTypesError
  } = useGetFabTypesQuery();

  const {
    data: accountsData,
    isLoading: isLoadingAccounts,
    isError: isAccountsError,
    error: accountsError
  } = useGetAccountsQuery({ limit: 1000 });

  const {
    data: stoneTypesData,
    isLoading: isLoadingStoneTypes,
    isError: isStoneTypesError,
    error: stoneTypesError
  } = useGetStoneTypesQuery({ limit: 1000 });

  const {
    data: stoneColorsData,
    isLoading: isLoadingStoneColors,
    isError: isStoneColorsError,
    error: stoneColorsError
  } = useGetStoneColorsQuery({ limit: 1000 });

  const {
    data: stoneThicknessesData,
    isLoading: isLoadingStoneThicknesses,
    isError: isStoneThicknessesError,
    error: stoneThicknessesError
  } = useGetStoneThicknessesQuery({ limit: 1000 });

  const {
    data: edgesData,
    isLoading: isLoadingEdges,
    isError: isEdgesError,
    error: edgesError
  } = useGetEdgesQuery({ limit: 1000 });

  // Fetch jobs for linked dropdowns
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    isError: isJobsError,
    error: jobsError
  } = useGetJobsQuery({ limit: 1000 });

  // Mutations
  const [createFab] = useCreateFabMutation();
  const [createStoneThickness] = useCreateStoneThicknessMutation();
  const [createStoneType] = useCreateStoneTypeMutation();
  const [createStoneColor] = useCreateStoneColorMutation();
  const [createEdge] = useCreateEdgeMutation();

  // Search states for dropdowns
  const [fabTypeSearch, setFabTypeSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [thicknessSearch, setThicknessSearch] = useState('');
  const [jobNameSearch, setJobNameSearch] = useState('');
  const [jobNumberSearch, setJobNumberSearch] = useState('');

  // Main popover states
  const [fabTypePopoverOpen, setFabTypePopoverOpen] = useState(false);
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [thicknessPopoverOpen, setThicknessPopoverOpen] = useState(false);

  // Nested popover states for adding new items
  const [showAddThickness, setShowAddThickness] = useState(false);

  // New item states
  const [newThickness, setNewThickness] = useState('');

  const form = useForm<FabIdFormData>({
    resolver: zodResolver(fabIdFormSchema),
    defaultValues: {
      fabType: '',
      account: '',
      jobName: '',
      jobNumber: '',
      area: '',
      stoneType: '',
      stoneColor: '',
      stoneThickness: '',
      edge: '',
      totalSqFt: '',
      revenue: '',
      cost_of_stone: '', // Added default value for new field
      selectedSalesPerson: '',
      notes: '',
      templateNotNeeded: false,
      draftNotNeeded: false,
      slabSmithCustNotNeeded: false,
      sctNotNeeded: false,
      slabSmithAGNotNeeded: false,
      finalProgrammingNotNeeded: false,
    },
  });

  // Watch for account changes
  const accountValue = form.watch('account');

  // Get the selected account ID
  const selectedAccount = accountsData?.find((account: any) => account.name === accountValue);
  const selectedAccountId = selectedAccount?.id;

  // Watch for job name and number changes
  const jobNameValue = form.watch('jobName');
  const jobNumberValue = form.watch('jobNumber');

  // Fetch jobs filtered by selected account using the new endpoint
  const {
    data: accountJobsData,
    isLoading: isAccountJobsLoading,
    isError: isAccountJobsError,
    error: accountJobsError
  } = useGetJobsByAccountQuery(
    { account_id: selectedAccountId!, params: { limit: 1000 } },
    { skip: !selectedAccountId }
  );

  // Override the existing jobsData with account-specific jobs when an account is selected
  const effectiveJobsData = selectedAccountId ? accountJobsData : jobsData;
  const isEffectiveJobsLoading = selectedAccountId ? isAccountJobsLoading : isLoadingJobs;
  const isEffectiveJobsError = selectedAccountId ? isAccountJobsError : isJobsError;

  // Get sales persons
  const {
    data: salesPersonsData,
    isLoading: isLoadingSalesPersons,
    isError: isSalesPersonsError
  } = useGetSalesPersonsQuery();

  const salesPersons = Array.isArray(salesPersonsData) ? salesPersonsData : [];

  // Filter jobs for job dropdowns - use account-specific jobs when available
  const jobNames = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).map((job: any) => job.name);
  const jobNumbers = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).map((job: any) => job.job_number);

  // ========== AUTO-POPULATION LOGIC ==========
  
  // Effect 1: Auto-populate job number and sales person when job name is selected
  useEffect(() => {
    if (jobNameValue && effectiveJobsData && Array.isArray(effectiveJobsData) && salesPersons.length > 0) {
      const selectedJob = effectiveJobsData.find((job: any) => job.name === jobNameValue);
      if (selectedJob) {
        // Auto-populate job number
        if (selectedJob.job_number !== jobNumberValue) {
          form.setValue('jobNumber', selectedJob.job_number);
        }
        
        // Auto-populate sales person using sales_person_id
        if (selectedJob.sales_person_id) {
          const salesPersonForJob = salesPersons.find((person: any) => 
            person.id === selectedJob.sales_person_id
          );
          
          if (salesPersonForJob && salesPersonForJob.name !== form.getValues('selectedSalesPerson')) {
            form.setValue('selectedSalesPerson', salesPersonForJob.name);
          }
        }
      }
    }
  }, [jobNameValue, effectiveJobsData, form, jobNumberValue, salesPersons]);

  // Effect 2: Auto-populate job name and sales person when job number is selected
  useEffect(() => {
    if (jobNumberValue && effectiveJobsData && Array.isArray(effectiveJobsData) && salesPersons.length > 0) {
      const selectedJob = effectiveJobsData.find((job: any) => job.job_number === jobNumberValue);
      if (selectedJob) {
        // Auto-populate job name
        if (selectedJob.name !== jobNameValue) {
          form.setValue('jobName', selectedJob.name);
        }
        
        // Auto-populate sales person using sales_person_id
        if (selectedJob.sales_person_id) {
          const salesPersonForJob = salesPersons.find((person: any) => 
            person.id === selectedJob.sales_person_id
          );
          
          if (salesPersonForJob && salesPersonForJob.name !== form.getValues('selectedSalesPerson')) {
            form.setValue('selectedSalesPerson', salesPersonForJob.name);
          }
        }
      }
    }
  }, [jobNumberValue, effectiveJobsData, form, jobNameValue, salesPersons]);

  // Filter functions for search with error handling
  const filteredFabTypes = (!isFabTypesError && Array.isArray(fabTypesData) && fabTypesData?.map((type: any) => type.name) || []).filter((type: string) =>
    type.toLowerCase().includes(fabTypeSearch.toLowerCase())
  );

  const filteredAccounts = (!isAccountsError && Array.isArray(accountsData) && accountsData?.map((account: any) => account.name) || []).filter((account: string) =>
    account.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const filteredThicknessOptions = (!isStoneThicknessesError && Array.isArray(stoneThicknessesData) && stoneThicknessesData?.map((thickness: any) => thickness.thickness) || []).filter((thickness: string) =>
    thickness.toLowerCase().includes(thicknessSearch.toLowerCase())
  );

  // Extract stone types, colors, and edges from the response
  const stoneTypes = !isStoneTypesError && Array.isArray(stoneTypesData) ? (stoneTypesData?.map((type: any) => type.name) || []) : [];
  const stoneColors = !isStoneColorsError && Array.isArray(stoneColorsData) ? (stoneColorsData?.map((color: any) => color.name) || []) : [];
  const edgeOptions = !isEdgesError && Array.isArray(edgesData) ? (edgesData?.map((edge: any) => edge.name) || []) : [];

  // Functions to add new items
  const handleAddThickness = async () => {
    if (newThickness.trim()) {
      try {
        await createStoneThickness({ thickness: newThickness.trim() }).unwrap();
        setNewThickness('');
        setShowAddThickness(false);
        setThicknessPopoverOpen(false); // Close the main popover
        toast.success('Thickness added successfully');
      } catch (error: any) {
        console.error('Failed to add thickness:', error);
        if (error?.status === 'FETCH_ERROR') {
          toast.error('Network error: Unable to add thickness. Please check your connection and try again.');
        } else if (error?.data?.message) {
          toast.error(`Failed to add thickness: ${error.data.message}`);
        } else {
          toast.error('Failed to add thickness');
        }
      }
    }
  };

  const onSubmit = async (values: FabIdFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Find IDs for selected values
      const selectedFabType = Array.isArray(fabTypesData) ? fabTypesData?.find((type: any) => type.name === values.fabType) : undefined;
      const selectedAccount = Array.isArray(accountsData) ? accountsData?.find((account: any) => account.name === values.account) : undefined;
      const selectedStoneType = Array.isArray(stoneTypesData) ? stoneTypesData?.find((type: any) => type.name === values.stoneType) : undefined;
      const selectedStoneColor = Array.isArray(stoneColorsData) ? stoneColorsData?.find((color: any) => color.name === values.stoneColor) : undefined;
      const selectedStoneThickness = Array.isArray(stoneThicknessesData) ? stoneThicknessesData?.find((thickness: any) => thickness.thickness === values.stoneThickness) : undefined;
      const selectedEdge = Array.isArray(edgesData) ? edgesData?.find((edge: any) => edge.name === values.edge) : undefined;

      // Find the selected sales person ID
      const selectedSalesPerson = salesPersons.find((person: any) =>
        person.name === values.selectedSalesPerson
      );

      // Find the selected job - match by either name or number
      let selectedJob;
      if (effectiveJobsData && Array.isArray(effectiveJobsData)) {
        // Try to match by name first
        if (values.jobName) {
          selectedJob = effectiveJobsData.find((job: any) => job.name === values.jobName);
        }

        // If that doesn't work, try to match by job number
        if (!selectedJob && values.jobNumber) {
          selectedJob = effectiveJobsData.find((job: any) => job.job_number === values.jobNumber);
        }
      }

      // Validate all required data is available
      if (!selectedFabType || !selectedAccount || !selectedStoneType || !selectedStoneColor || !selectedStoneThickness || !selectedEdge || !selectedSalesPerson || !selectedJob) {
        const missingFields = [];
        if (!selectedFabType) missingFields.push('FAB Type');
        if (!selectedAccount) missingFields.push('Account');
        if (!selectedStoneType) missingFields.push('Stone Type');
        if (!selectedStoneColor) missingFields.push('Stone Color');
        if (!selectedStoneThickness) missingFields.push('Stone Thickness');
        if (!selectedEdge) missingFields.push('Edge');
        if (!selectedSalesPerson) missingFields.push('Sales Person');
        if (!selectedJob) missingFields.push('Job');

        throw new Error('Please select valid options for all dropdown fields. Missing: ' + missingFields.join(', '));
      }

      // Process notes - keep as string
      let notesValue: string | undefined = undefined;
      if (values.notes) {
        notesValue = values.notes;
      }

      // Create fab using the existing job ID (no job creation)
      await createFab({
        job_id: selectedJob.id,
        fab_type: selectedFabType.name,
        sales_person_id: selectedSalesPerson.id, // Use the actual sales person ID
        stone_type_id: selectedStoneType.id,
        stone_color_id: selectedStoneColor.id,
        stone_thickness_id: selectedStoneThickness.id,
        edge_id: selectedEdge.id,
        input_area: values.area,
        total_sqft: parseFloat(values.totalSqFt) || 0,
        revenue: parseFloat(values.revenue) || 0,
        cost_of_stone: parseFloat(values.cost_of_stone) || 0, // Added cost_of_stone field
        notes: notesValue, // Send as array
        template_needed: !values.templateNotNeeded,
        drafting_needed: !values.draftNotNeeded,
        slab_smith_cust_needed: !values.slabSmithCustNotNeeded,
        slab_smith_ag_needed: !values.slabSmithAGNotNeeded,
        sct_needed: !values.sctNotNeeded,
        final_programming_needed: !values.finalProgrammingNotNeeded,
      }).unwrap();

      toast.custom(
        () => (
          <Alert variant="success" icon="success">
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>
              FAB ID submitted successfully!
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-right',
        },
      );
      form.reset();

      // Navigate based on user's department/role instead of always going to templating
      // For sales role, navigate back to sales jobs page
      navigate('/job');

    } catch (err: any) {
      console.error('Submission error:', err);
      // Handle different types of errors
      if (err?.status === 'FETCH_ERROR') {
        setError('Network error: Unable to connect to the server. Please check your connection and try again.');
      } else if (err?.data?.message) {
        setError(err.data.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="">
      <Container>
        <div className="py-6">
          <Card className="max-w-4xl mx-auto mb-4 py-6">
            <CardHeader className='flex flex-col justify-start items-start '>
              <CardTitle className='text-2xl font-bold text-[#111827]'>
                New Fab ID Submission
              </CardTitle>
              <CardDescription className='text-sm text-[#4B5563]'>Submit a new Standard Fabrication Form with project specifications for templating review.</CardDescription>
            </CardHeader>
          </Card>

          <div className="max-w-4xl mx-auto">
            <div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className='text-[#111827] flex items-center gap-2 font-semibold'>
                        <RiInformationFill className='text-primary' />
                        Job Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                      <div className="space-y-4 grid grid-cols-2 gap-x-4">

                        {/* FAB Type with Popover */}
                        <FormField
                          control={form.control}
                          name="fabType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>FAB Type *</FormLabel>
                              <Popover open={fabTypePopoverOpen} onOpenChange={setFabTypePopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      ref={firstFieldRef}
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isLoadingFabTypes}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isLoadingFabTypes ? 'Loading...' : (field.value || "Select type")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <div className="p-2">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-4 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Search FAB type"
                                        className="pl-8 mb-2"
                                        value={fabTypeSearch}
                                        onChange={(e) => setFabTypeSearch(e.target.value)}
                                      />
                                    </div>
                                    {isFabTypesError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load FAB types: {fabTypesError ? 'Server error occurred' : 'Unknown error'}
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {filteredFabTypes.map((type: string) => (
                                        <div
                                          key={type}
                                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                          onClick={() => {
                                            field.onChange(type);
                                            setFabTypeSearch('');
                                            setFabTypePopoverOpen(false);
                                          }}
                                        >
                                          {type}
                                        </div>
                                      ))}
                                      {filteredFabTypes.length === 0 && !isFabTypesError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isLoadingFabTypes ? 'Loading FAB types...' : 'No FAB types found'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Account with Popover - REMOVED ADD FUNCTIONALITY */}
                        <FormField
                          control={form.control}
                          name="account"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account *</FormLabel>
                              <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isLoadingAccounts}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isLoadingAccounts ? 'Loading...' : (field.value || "Select account")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <div className="p-2">
                                    <div className="relative mb-2">
                                      <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-text-foreground" />
                                      <Input
                                        placeholder="Search account"
                                        className="pl-8"
                                        value={accountSearch}
                                        onChange={(e) => setAccountSearch(e.target.value)}
                                      />
                                    </div>
                                    {isAccountsError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load accounts: {accountsError ? 'Server error occurred' : 'Unknown error'}
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {filteredAccounts.map((account: string) => (
                                        <div
                                          key={account}
                                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                          onClick={() => {
                                            field.onChange(account);
                                            setAccountSearch('');
                                            setAccountPopoverOpen(false);
                                          }}
                                        >
                                          {account}
                                        </div>
                                      ))}
                                      {filteredAccounts.length === 0 && !isAccountsError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isLoadingAccounts ? 'Loading accounts...' : 'No accounts found'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Job Name - Select Dropdown */}
                        <FormField
                          control={form.control}
                          name="jobName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-start ">
                                <FormLabel>Job Name</FormLabel>
                                <Link to="/create-jobs">
                                  <Button variant="ghost" className="text-primary -py-2 hover:bg-none text-xs !h-0 gap-0" size="xs" autoHeight={false}>
                                    <Plus />
                                    New Job
                                  </Button>
                                </Link>
                              </div>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-populate job number and sales person will happen in useEffect
                                }}
                                value={field.value}
                                disabled={isEffectiveJobsLoading || (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      isEffectiveJobsLoading ? 'Loading...' :
                                        (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0) ? 'No jobs available' :
                                          'Select job name'
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isEffectiveJobsError ? (
                                    <div className="px-3 py-2 text-sm text-red-500 text-center">
                                      Failed to load jobs: Server error occurred
                                    </div>
                                  ) : isEffectiveJobsLoading ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      Loading jobs...
                                    </div>
                                  ) : selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                                      <InfoIcon className="h-4 w-4 text-gray-400" />
                                      <span>No jobs found for this account</span>
                                      <Link to="/create-jobs">
                                        <Button variant="outline" size="sm" className="mt-2">
                                          <Plus className="w-3 h-3 mr-1" />
                                          Create New Job
                                        </Button>
                                      </Link>
                                    </div>
                                  ) : effectiveJobsData && effectiveJobsData.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      No jobs found
                                    </div>
                                  ) : (
                                    jobNames.map((jobName: string) => (
                                      <SelectItem key={jobName} value={jobName}>
                                        {jobName}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Job Number - Select Dropdown */}
                        <FormField
                          control={form.control}
                          name="jobNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Number</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Auto-populate job name and sales person will happen in useEffect
                                }}
                                value={field.value}
                                disabled={isEffectiveJobsLoading || (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0)}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      isEffectiveJobsLoading ? 'Loading...' :
                                        (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0) ? 'No jobs available' :
                                          'Select job number'
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isEffectiveJobsError ? (
                                    <div className="px-3 py-2 text-sm text-red-500 text-center">
                                      Failed to load jobs: Server error occurred
                                    </div>
                                  ) : isEffectiveJobsLoading ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      Loading jobs...
                                    </div>
                                  ) : selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center flex flex-col items-center gap-2">
                                      <InfoIcon className="h-4 w-4 text-gray-400" />
                                      <span>No jobs found for this account</span>
                                      <Link to="/create-jobs">
                                        <Button variant="outline" size="sm" className="mt-2">
                                          <Plus className="w-3 h-3 mr-1" />
                                          Create New Job
                                        </Button>
                                      </Link>
                                    </div>
                                  ) : effectiveJobsData && effectiveJobsData.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      No jobs found
                                    </div>
                                  ) : (
                                    jobNumbers.map((jobNumber: string) => (
                                      <SelectItem key={jobNumber} value={jobNumber}>
                                        {jobNumber}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Third Row */}
                        <FormField
                          control={form.control}
                          name="area"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area (s) *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter area" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stone Information */}
                        <FormField
                          control={form.control}
                          name="stoneType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stone Type *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingStoneTypes}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={isLoadingStoneTypes ? 'Loading...' : 'Select stone type'} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isStoneTypesError ? (
                                    <div className="px-3 py-2 text-sm text-red-500">
                                      Failed to load stone types: Server error occurred
                                    </div>
                                  ) : (
                                    stoneTypes.map((type: string) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="stoneColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stone Color *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingStoneColors}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={isLoadingStoneColors ? 'Loading...' : 'Select stone color'} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isStoneColorsError ? (
                                    <div className="px-3 py-2 text-sm text-red-500">
                                      Failed to load stone colors: Server error occurred
                                    </div>
                                  ) : (
                                    stoneColors.map((color: string) => (
                                      <SelectItem key={color} value={color}>
                                        {color}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Stone Thickness with Popover */}
                        <FormField
                          control={form.control}
                          name="stoneThickness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stone Thickness (cm) *</FormLabel>
                              <Popover open={thicknessPopoverOpen} onOpenChange={setThicknessPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isLoadingStoneThicknesses}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isLoadingStoneThicknesses ? 'Loading...' : (field.value || "Select thickness")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <div className="p-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Thickness</span>
                                      <Popover open={showAddThickness} onOpenChange={setShowAddThickness}>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 px-2">
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="end">
                                          <div className="space-y-3">
                                            <div>
                                              <Label htmlFor="newThickness">Thickness (cm)</Label>
                                              <Input
                                                id="newThickness"
                                                placeholder="Enter thickness (cm)"
                                                value={newThickness}
                                                onChange={(e) => setNewThickness(e.target.value)}
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button variant="outline" size="sm" onClick={() => setShowAddThickness(false)}>
                                                Cancel
                                              </Button>
                                              <Button size="sm" onClick={handleAddThickness}>
                                                Add
                                              </Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    </div>
                                    <div className="relative mb-2">
                                      <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-text-foreground" />
                                      <Input
                                        placeholder="Search thickness"
                                        className="pl-8"
                                        value={thicknessSearch}
                                        onChange={(e) => setThicknessSearch(e.target.value)}
                                      />
                                    </div>
                                    {isStoneThicknessesError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load thicknesses: Server error occurred
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {filteredThicknessOptions.map((thickness: string) => (
                                        <div
                                          key={thickness}
                                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                          onClick={() => {
                                            field.onChange(thickness);
                                            setThicknessSearch('');
                                            setThicknessPopoverOpen(false);
                                          }}
                                        >
                                          {thickness}
                                        </div>
                                      ))}
                                      {filteredThicknessOptions.length === 0 && !isStoneThicknessesError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isLoadingStoneThicknesses ? 'Loading thicknesses...' : 'No thickness options found'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Edge and Total Sq Ft */}
                        <FormField
                          control={form.control}
                          name="edge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Edge *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingEdges}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={isLoadingEdges ? 'Loading...' : 'Select edge'} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isEdgesError ? (
                                    <div className="px-3 py-2 text-sm text-red-500">
                                      Failed to load edges: Server error occurred
                                    </div>
                                  ) : (
                                    edgeOptions.map((edge: string) => (
                                      <SelectItem key={edge} value={edge}>
                                        {edge}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="totalSqFt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Sq Ft *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter total size" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Revenue Field */}
                        <FormField
                          control={form.control}
                          name="revenue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Revenue ($) *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter revenue amount" 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* NEW FIELD: Cost of Stone */}
                        <FormField
                          control={form.control}
                          name="cost_of_stone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost of Stone ($) *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter cost of stone" 
                                  {...field} 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Sales Person - Auto-populates when job is selected */}
                        <FormField
                          control={form.control}
                          name="selectedSalesPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Sales Person *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingSalesPersons}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      isLoadingSalesPersons ? 'Loading sales persons...' : 'Select salesperson'
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingSalesPersons ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      Loading sales persons...
                                    </div>
                                  ) : isSalesPersonsError ? (
                                    <div className="px-3 py-2 text-sm text-red-500 text-center">
                                      Failed to load sales persons
                                    </div>
                                  ) : salesPersons.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      No sales persons found
                                    </div>
                                  ) : (
                                    salesPersons.map((person: any) => (
                                      <SelectItem
                                        key={person.id}
                                        value={person.name}
                                      >
                                        {person.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Checkboxes */}
                      <div className="gap-3 flex flex-wrap">
                        <FormField
                          control={form.control}
                          name="templateNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Template not needed</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="draftNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Draft not needed</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="slabSmithCustNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">SlabSmith (Cust) not needed</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sctNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">SCT not needed</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="slabSmithAGNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Slab smith (AG) not needed</FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="finalProgrammingNotNeeded"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">Final programing not needed</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Notes */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Notes</FormLabel>
                            </div>
                            <FormControl>
                              <Textarea
                                placeholder="Type here..."
                                {...field}
                                rows={4}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className='flex justify-between items-center'>
                      <Link to="/job/sales" className="flex flex-nowrap items-center gap-2 text-sm text-primary underline">
                        <ArrowLeft className="w-4 h-4" />
                        Back to jobs
                      </Link>
                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-3 ">
                        <Link to="/job/sales">
                          <Button variant="outline" type="button">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit for Templating'
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export { NewFabIdForm };