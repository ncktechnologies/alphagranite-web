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
import { ArrowLeft, Plus, AlertCircle, Check, LoaderCircleIcon, Search, ChevronDown, Info, InfoIcon } from 'lucide-react';
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
  useCreateJobMutation, 
  useCreateFabMutation,
  useCreateAccountMutation,
  useCreateStoneThicknessMutation,
  useCreateStoneTypeMutation,
  useCreateStoneColorMutation,
  useCreateEdgeMutation
} from '@/store/api/job';

// Zod schema for form validation
const fabIdFormSchema = z.object({
  fabType: z.string().min(1, 'FAB Type is required'),
  account: z.string().min(1, 'Account is required'),
  jobName: z.string().min(1, 'Job Name is required'),
  jobNumber: z.string().min(1, 'Job Number is required'),
  area: z.string().min(1, 'Area is required'),
  stoneType: z.string().min(1, 'Stone Type is required'),
  stoneColor: z.string().min(1, 'Stone Color is required'),
  stoneThickness: z.string().min(1, 'Stone Thickness is required'),
  edge: z.string().min(1, 'Edge is required'),
  totalSqFt: z.string().min(1, 'Total Sq Ft is required'),
  selectedSalesPerson: z.string().min(1, 'Sales Person is required'),
  notes: z.string().optional(),
  templateNotNeeded: z.boolean(),
  draftNotNeeded: z.boolean(),
  slabSmithCustNotNeeded: z.boolean(),
  sctNotNeeded: z.boolean(),
  slabSmithAGNotNeeded: z.boolean(),
  finalProgrammingNotNeeded: z.boolean(),
});

type FabIdFormData = z.infer<typeof fabIdFormSchema>;

const NewFabIdForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

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
  
  // Mutations
  const [createJob] = useCreateJobMutation();
  const [createFab] = useCreateFabMutation();
  const [createAccount] = useCreateAccountMutation();
  const [createStoneThickness] = useCreateStoneThicknessMutation();
  const [createStoneType] = useCreateStoneTypeMutation();
  const [createStoneColor] = useCreateStoneColorMutation();
  const [createEdge] = useCreateEdgeMutation();

  // Search states for dropdowns
  const [fabTypeSearch, setFabTypeSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [thicknessSearch, setThicknessSearch] = useState('');

  // Main popover states
  const [fabTypePopoverOpen, setFabTypePopoverOpen] = useState(false);
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
  const [thicknessPopoverOpen, setThicknessPopoverOpen] = useState(false);

  // Nested popover states for adding new items
  const [showAddThickness, setShowAddThickness] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  // New item states
  const [newThickness, setNewThickness] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newTemplate, setNewTemplate] = useState('');

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
      selectedSalesPerson: '',
      notes: '',
      templateNotNeeded: true,
      draftNotNeeded: false,
      slabSmithCustNotNeeded: false,
      sctNotNeeded: false,
      slabSmithAGNotNeeded: false,
      finalProgrammingNotNeeded: false,
    },
  });

  // Filter functions for search with error handling
  const filteredFabTypes = (!isFabTypesError && fabTypesData?.map(type => type.name) || []).filter(type =>
    type.toLowerCase().includes(fabTypeSearch.toLowerCase())
  );

  const filteredAccounts = (!isAccountsError && accountsData?.data?.map(account => account.name) || []).filter(account =>
    account.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const filteredThicknessOptions = (!isStoneThicknessesError && stoneThicknessesData?.data?.map(thickness => thickness.thickness) || []).filter(thickness =>
    thickness.toLowerCase().includes(thicknessSearch.toLowerCase())
  );

  const stoneTypes = !isStoneTypesError ? (stoneTypesData?.data?.map(type => type.name) || []) : [];
  const stoneColors = !isStoneColorsError ? (stoneColorsData?.data?.map(color => color.name) || []) : [];
  const edgeOptions = !isEdgesError ? (edgesData?.data?.map(edge => edge.name) || []) : [];
  const salesPersons = [
    'BRUNO PIRES',
    'Sarah Johnson',
    'Mike Rodriguez',
    'Maria Garcia'
  ];

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

  const handleAddAccount = async () => {
    if (newAccount.trim()) {
      try {
        await createAccount({ name: newAccount.trim() }).unwrap();
        setNewAccount('');
        setShowAddAccount(false);
        setAccountPopoverOpen(false); // Close the main popover
        toast.success('Account added successfully');
      } catch (error: any) {
        console.error('Failed to add account:', error);
        if (error?.status === 'FETCH_ERROR') {
          toast.error('Network error: Unable to add account. Please check your connection and try again.');
        } else if (error?.data?.message) {
          toast.error(`Failed to add account: ${error.data.message}`);
        } else {
          toast.error('Failed to add account');
        }
      }
    }
  };

  const handleAddTemplate = () => {
    if (newTemplate.trim()) {
      // Handle template addition logic here
      // This would likely call an API to schedule templating
      setNewTemplate('');
      setShowAddTemplate(false);
    }
  };

  const onSubmit = async (values: FabIdFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Find IDs for selected values
      const selectedFabType = fabTypesData?.find(type => type.name === values.fabType);
      const selectedAccount = accountsData?.find(account => account.name === values.account);
      const selectedStoneType = stoneTypesData?.find(type => type.name === values.stoneType);
      const selectedStoneColor = stoneColorsData?.find(color => color.name === values.stoneColor);
      const selectedStoneThickness = stoneThicknessesData?.find(thickness => thickness.thickness === values.stoneThickness);
      const selectedEdge = edgesData?.find(edge => edge.name === values.edge);

      // Validate all required data is available
      if (!selectedFabType || !selectedAccount || !selectedStoneType || !selectedStoneColor || !selectedStoneThickness || !selectedEdge) {
        throw new Error('Please select valid options for all dropdown fields');
      }

      // Create job first
      const jobResponse = await createJob({
        name: values.jobName,
        job_number: values.jobNumber,
        account_id: selectedAccount.id,
        description: values.notes || '',
      }).unwrap();

      // Then create fab
      await createFab({
        job_id: jobResponse.id,
        fab_type: selectedFabType.name,
        sales_person_id: 1, // This should be the actual sales person ID
        stone_type_id: selectedStoneType.id,
        stone_color_id: selectedStoneColor.id,
        stone_thickness_id: selectedStoneThickness.id,
        edge_id: selectedEdge.id,
        input_area: values.area,
        total_sqft: parseFloat(values.totalSqFt) || 0,
        notes: values.notes || '',
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
              FAB ID submitted successfully for templating review!
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-right',
        },
      );
      form.reset();
      navigate('/job/templating');

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
        {/* <Toolbar className='flex flex-col items-start '>
          <ToolbarBreadcrumbs />
        </Toolbar> */}
        <div className="py-6">
          {/* Header */}
          {/* <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Fab ID Submission</h1>
              <p className="text-sm text-gray-600 mt-1">
                Submit a new Standard Fabrication Form with project specifications for templating review.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Draft mode
            </Button>
          </div> */}
          <Card className="max-w-4xl mx-auto mb-4 py-6">
            <CardHeader className='flex flex-col justify-start items-start '>
              <CardTitle className='text-2xl font-bold text-[#111827]'>
                New Fab ID Submission
              </CardTitle>
              {/* <Button variant="outline" size="sm">
                Draft mode
              </Button> */}
              <CardDescription className='text-sm text-[#4B5563]'>Submit a new Standard Fabrication Form with project specifications for templating review.</CardDescription>
            </CardHeader>
          </Card>

          <div className="max-w-4xl mx-auto">
            {/* Main Form */}
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

                        {/* {error && (
                          <Alert variant="destructive">
                            <AlertIcon>
                              <AlertCircle className="h-4 w-4" />
                            </AlertIcon>
                            <AlertTitle>{error}</AlertTitle>
                          </Alert>
                        )} */}

                        {/* {success && (
                          <Alert>
                            <AlertIcon>
                              <Check className="h-4 w-4 text-green-500" />
                            </AlertIcon>
                            <AlertTitle>{success}</AlertTitle>
                          </Alert>
                        )} */}

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
                                      {filteredFabTypes.map((type) => (
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

                        {/* Account with Popover */}
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
                                    <div className="flex items-center justify-between mb-2">
                                      {/* <span className="text-sm font-medium">Account</span> */}
                                      <Popover open={showAddAccount} onOpenChange={setShowAddAccount}>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[#7A9705] text-lg">
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="end">
                                          <div className="space-y-3">
                                            <div className="">
                                              <Label htmlFor="newAccount">Account Name</Label>
                                              <Input
                                                id="newAccount"
                                                placeholder="Enter account name"
                                                value={newAccount}
                                                onChange={(e) => setNewAccount(e.target.value)}
                                                className='relative'
                                              />
                                              <Button size="sm" onClick={handleAddAccount} className='absolute right-8 top-12 px-6 py-3'>
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
                                        placeholder="Search accounts"
                                        className="ps-8"
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
                                      {filteredAccounts.map((account) => (
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

                        {/* Second Row */}
                        <FormField
                          control={form.control}
                          name="jobName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="jobNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Number *</FormLabel>
                              <FormControl>
                                <Input placeholder="Job number" {...field} />
                              </FormControl>
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
                                    stoneTypes.map((type) => (
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
                                    stoneColors.map((color) => (
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
                                        className="ps-8"
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
                                      {filteredThicknessOptions.map((thickness) => (
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
                                    edgeOptions.map((edge) => (
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

                        {/* Sales Person */}


                        <FormField
                          control={form.control}
                          name="selectedSalesPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Sales Person *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select salesperson" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {salesPersons.map((person) => (
                                    <SelectItem key={person} value={person}>
                                      {person}
                                    </SelectItem>
                                  ))}
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
                      <div>
                        <FormLabel>Sales Person</FormLabel>
                        <div className="mt-1 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm font-medium text-gray-900">BRUNO PIRES</p>
                        </div>
                      </div>
                      {/* Notes */}
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Notes</FormLabel>
                              {/* <Popover open={showAddTemplate} onOpenChange={setShowAddTemplate}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Schedule template
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="end">
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor="newTemplate">Template Details</Label>
                                      <Textarea
                                        id="newTemplate"
                                        placeholder="Enter template details"
                                        value={newTemplate}
                                        onChange={(e) => setNewTemplate(e.target.value)}
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" size="sm" onClick={() => setShowAddTemplate(false)}>
                                        Cancel
                                      </Button>
                                      <Button size="sm" onClick={handleAddTemplate}>
                                        Schedule
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover> */}
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
                        <Button
                          type="submit"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                              Submitting...
                            </span>
                          ) : (
                            'Submit for templating'
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