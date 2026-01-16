import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Plus, AlertCircle, Check, LoaderCircleIcon, Search, ChevronDown } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RiInformationFill } from '@remixicon/react';
import { toast } from 'sonner';
import {
    useGetFabTypesQuery,
    useGetAccountsQuery,
    useGetStoneTypesQuery,
    useGetStoneColorsQuery,
    useGetStoneThicknessesQuery,
    useGetEdgesQuery,
    useCreateAccountMutation,
    useCreateStoneThicknessMutation,
    useCreateStoneTypeMutation,
    useCreateStoneColorMutation,
    useCreateEdgeMutation,
    useGetJobsQuery,
    useGetFabByIdQuery,
    useUpdateFabMutation,
    useGetJobsByAccountQuery
} from '@/store/api/job';
import { useGetSalesPersonsQuery } from '@/store/api/employee';

// Custom Currency Input Component
interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const CurrencyInput = ({ value, onChange, placeholder, ...props }: CurrencyInputProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Format number with commas and dollar sign
  const formatCurrency = useCallback((val: string): string => {
    if (!val || val === '0') return '$0';
    
    // Remove any non-numeric characters except decimal point
    const numericString = val.replace(/[^0-9.]/g, '');
    
    // Parse as float
    const num = parseFloat(numericString);
    
    if (isNaN(num)) return '$0';
    
    // Format with commas
    return '$' + num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (value && value !== '0') {
      const num = parseFloat(value);
      return isNaN(num) ? '$0' : formatCurrency(value);
    }
    return '$0';
  });

  const [isFocused, setIsFocused] = useState(false);

  // Update display value when value prop changes
  useEffect(() => {
    if (!isFocused) {
      if (value && value !== '0') {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          setDisplayValue(formatCurrency(value));
        } else {
          setDisplayValue('$0');
        }
      } else {
        setDisplayValue('$0');
      }
    }
  }, [value, isFocused, formatCurrency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow only numbers and decimal point
    const sanitized = input.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = sanitized.split('.');
    let finalValue = parts[0];
    if (parts.length > 1) {
      finalValue = parts[0] + '.' + parts.slice(1).join('').substring(0, 2);
    }
    
    // Update form value (raw number without formatting)
    onChange(finalValue || '');
    
    // Update display value with formatting
    if (finalValue) {
      const num = parseFloat(finalValue);
      if (!isNaN(num)) {
        setDisplayValue(formatCurrency(finalValue));
      } else {
        setDisplayValue('$0');
      }
    } else {
      setDisplayValue('$0');
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // When focused, show raw number without formatting for editing
    if (value && value !== '0') {
      setDisplayValue(value);
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // When blurred, format with dollar sign and commas
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        setDisplayValue(formatCurrency(value));
      } else {
        setDisplayValue('$0');
        onChange('0');
      }
    } else {
      setDisplayValue('$0');
      onChange('0');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, numbers
    if (
      [46, 8, 9, 27, 13, 110, 190].includes(e.keyCode) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && (e.ctrlKey || e.metaKey)) ||
      (e.keyCode === 67 && (e.ctrlKey || e.metaKey)) ||
      (e.keyCode === 86 && (e.ctrlKey || e.metaKey)) ||
      (e.keyCode === 88 && (e.ctrlKey || e.metaKey)) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39) ||
      // Allow: numbers on keypad
      (e.keyCode >= 96 && e.keyCode <= 105)
    ) {
      return;
    }
    
    // Ensure it's a number
    if ((e.keyCode < 48 || e.keyCode > 57) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="font-mono"
      placeholder={placeholder}
    />
  );
};

// Update the Zod schema
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
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, { message: 'Revenue must be a valid number' }),
    cost_of_stone: z.string().min(1, 'Cost of Stone is required')
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, { message: 'Cost of Stone must be a valid number' }),
    selectedSalesPerson: z.string().min(1, 'Sales Person is required'),
    notes: z.string().optional(),
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

const EditFabIdForm = () => {
    const { id } = useParams<{ id: string }>();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [isLoadingFormData, setIsLoadingFormData] = useState(false);

    // API hooks for dropdown data
    const {
        data: fabTypesData = [],
        isLoading: isLoadingFabTypes,
    } = useGetFabTypesQuery();

    const {
        data: accountsData = [],
        isLoading: isLoadingAccounts,
    } = useGetAccountsQuery({ limit: 1000 });

    const {
        data: stoneTypesData = [],
        isLoading: isLoadingStoneTypes,
    } = useGetStoneTypesQuery({ limit: 1000 });

    const {
        data: stoneColorsData = [],
        isLoading: isLoadingStoneColors,
    } = useGetStoneColorsQuery({ limit: 1000 });

    const {
        data: stoneThicknessesData = [],
        isLoading: isLoadingStoneThicknesses,
    } = useGetStoneThicknessesQuery({ limit: 1000 });

    const {
        data: edgesData = [],
        isLoading: isLoadingEdges,
    } = useGetEdgesQuery({ limit: 1000 });

    // Fetch jobs for linked dropdowns
    const {
        data: jobsData = [],
        isLoading: isLoadingJobs,
    } = useGetJobsQuery({ limit: 1000 });

    // Fetch existing FAB data
    const {
        data: existingFab,
        isLoading: isLoadingFab,
        isError: isFabError,
        error: fabError
    } = useGetFabByIdQuery(Number(id));

    // Fetch jobs by account
    const {
        data: accountJobsData = [],
        isLoading: isAccountJobsLoading,
    } = useGetJobsByAccountQuery(
        { account_id: selectedAccountId!, params: { limit: 1000 } },
        { skip: !selectedAccountId }
    );

    // Get sales persons
    const {
        data: salesPersonsData = [],
        isLoading: isLoadingSalesPersons,
    } = useGetSalesPersonsQuery();

    // Mutations
    const [updateFab] = useUpdateFabMutation();
    const [createAccount] = useCreateAccountMutation();
    const [createStoneThickness] = useCreateStoneThicknessMutation();
    const [createStoneType] = useCreateStoneTypeMutation();
    const [createStoneColor] = useCreateStoneColorMutation();
    const [createEdge] = useCreateEdgeMutation();

    // Search states
    const [fabTypeSearch, setFabTypeSearch] = useState('');
    const [accountSearch, setAccountSearch] = useState('');
    const [thicknessSearch, setThicknessSearch] = useState('');
    const [edgeSearch, setEdgeSearch] = useState('');

    // Popover states
    const [fabTypePopoverOpen, setFabTypePopoverOpen] = useState(false);
    const [accountPopoverOpen, setAccountPopoverOpen] = useState(false);
    const [thicknessPopoverOpen, setThicknessPopoverOpen] = useState(false);
    const [edgePopoverOpen, setEdgePopoverOpen] = useState(false);

    // Add item states
    const [showAddThickness, setShowAddThickness] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showAddEdge, setShowAddEdge] = useState(false);
    const [newThickness, setNewThickness] = useState('');
    const [newAccount, setNewAccount] = useState('');
    const [newEdge, setNewEdge] = useState('');
    const hasAttemptedLoadRef = useRef(false);

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
            revenue: '0',
            cost_of_stone: '0',
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

    // Watch for account changes
    const accountValue = form.watch('account');

    // Update selected account ID when account changes
    useEffect(() => {
        if (accountValue && accountsData.length > 0) {
            const account = accountsData.find((acc: any) => acc.name === accountValue);
            if (account) {
                setSelectedAccountId(account.id);
            }
        }
    }, [accountValue, accountsData]);

    // Watch for job name and number changes
    const jobNameValue = form.watch('jobName');
    const jobNumberValue = form.watch('jobNumber');

    // Use account-specific jobs if account is selected, otherwise all jobs
    const effectiveJobsData = selectedAccountId ? accountJobsData : jobsData;
    const isEffectiveJobsLoading = selectedAccountId ? isAccountJobsLoading : isLoadingJobs;

    // Extract unique sales persons to avoid duplicate key error
    const salesPersons = Array.isArray(salesPersonsData) 
        ? salesPersonsData.filter((person: any, index: number, self: any[]) =>
            index === self.findIndex((p: any) => 
                p.name === person.name // Filter by unique name to avoid duplicates
            )
          )
        : [];

    // Filter functions
    const filteredFabTypes = (Array.isArray(fabTypesData) ? fabTypesData.map((type: any) => type.name) : []).filter((type: string) =>
        type.toLowerCase().includes(fabTypeSearch.toLowerCase())
    );

    const filteredAccounts = (Array.isArray(accountsData) ? accountsData.map((account: any) => account.name) : []).filter((account: string) =>
        account.toLowerCase().includes(accountSearch.toLowerCase())
    );

    const filteredThicknessOptions = (Array.isArray(stoneThicknessesData) ? stoneThicknessesData.map((thickness: any) => thickness.thickness) : []).filter((thickness: string) =>
        thickness.toLowerCase().includes(thicknessSearch.toLowerCase())
    );

    const filteredEdgeOptions = (Array.isArray(edgesData) ? edgesData.map((edge: any) => edge.name) : []).filter((edge: string) =>
        edge.toLowerCase().includes(edgeSearch.toLowerCase())
    );

    // Extract options
    const stoneTypes = Array.isArray(stoneTypesData) ? stoneTypesData.map((type: any) => type.name) : [];
    const stoneColors = Array.isArray(stoneColorsData) ? stoneColorsData.map((color: any) => color.name) : [];
    const edgeOptions = Array.isArray(edgesData) ? edgesData.map((edge: any) => edge.name) : [];

    // Job names and numbers
    const jobNames = Array.isArray(effectiveJobsData) ? effectiveJobsData.map((job: any) => job.name) : [];
    const jobNumbers = Array.isArray(effectiveJobsData) ? effectiveJobsData.map((job: any) => job.job_number) : [];

    // Auto-population effects - only run after initial data is loaded
    useEffect(() => {
        if (hasInitialDataLoaded && jobNameValue && effectiveJobsData.length > 0 && salesPersons.length > 0) {
            const selectedJob = effectiveJobsData.find((job: any) => job.name === jobNameValue);
            if (selectedJob) {
                if (selectedJob.job_number !== jobNumberValue) {
                    form.setValue('jobNumber', selectedJob.job_number);
                }
                
                // Safely access sales_person_id - check if property exists
                if (selectedJob && 'sales_person_id' in selectedJob && selectedJob.sales_person_id) {
                    const salesPersonForJob = salesPersons.find((person: any) => 
                        person.id === selectedJob.sales_person_id
                    );
                    
                    if (salesPersonForJob && salesPersonForJob.name !== form.getValues('selectedSalesPerson')) {
                        form.setValue('selectedSalesPerson', salesPersonForJob.name);
                    }
                }
            }
        }
    }, [jobNameValue, effectiveJobsData, form, jobNumberValue, salesPersons, hasInitialDataLoaded]);

    useEffect(() => {
        if (hasInitialDataLoaded && jobNumberValue && effectiveJobsData.length > 0 && salesPersons.length > 0) {
            const selectedJob = effectiveJobsData.find((job: any) => job.job_number === jobNumberValue);
            if (selectedJob) {
                if (selectedJob.name !== jobNameValue) {
                    form.setValue('jobName', selectedJob.name);
                }
                
                // Safely access sales_person_id - check if property exists
                if (selectedJob && 'sales_person_id' in selectedJob && selectedJob.sales_person_id) {
                    const salesPersonForJob = salesPersons.find((person: any) => 
                        person.id === selectedJob.sales_person_id
                    );
                    
                    if (salesPersonForJob && salesPersonForJob.name !== form.getValues('selectedSalesPerson')) {
                        form.setValue('selectedSalesPerson', salesPersonForJob.name);
                    }
                }
            }
        }
    }, [jobNumberValue, effectiveJobsData, form, jobNameValue, salesPersons, hasInitialDataLoaded]);

    // Load form data from existing FAB
    useEffect(() => {
        const loadFormData = async () => {
            console.log('Checking if should load form data...');
            
            // Only attempt to load once using ref to prevent multiple attempts
            if (existingFab && !isLoadingFab && !hasInitialDataLoaded && !hasAttemptedLoadRef.current) {
                hasAttemptedLoadRef.current = true;
                setIsLoadingFormData(true);
                
                console.log('Using timer approach to populate ALL form fields...');
                
                setTimeout(async () => {
                    try {
                        console.log('Loading form data from existing FAB:', existingFab);
                        
                        // Type assertion to bypass strict typing
                        const fabData: any = existingFab;
                        
                        // Prepare form data
                        const formData = {
                            fabType: fabData.fab_type || '',
                            account: fabData.account_name || '',
                            jobName: fabData.job_details?.name || '',
                            jobNumber: fabData.job_details?.job_number || '',
                            area: fabData.input_area || '',
                            stoneType: fabData.stone_type_name || '',
                            stoneColor: fabData.stone_color_name || '',
                            stoneThickness: fabData.stone_thickness_value || '',
                            edge: fabData.edge_name || '',
                            totalSqFt: String(fabData.total_sqft || ''),
                            revenue: String(fabData.revenue || '0'),
                            cost_of_stone: String(fabData.cost_of_stone || '0'),
                            selectedSalesPerson: fabData.sales_person_name || '',
                            notes: '',
                            templateNotNeeded: !fabData.template_needed,
                            draftNotNeeded: !fabData.drafting_needed,
                            slabSmithCustNotNeeded: !fabData.slab_smith_cust_needed,
                            sctNotNeeded: !fabData.sct_needed,
                            slabSmithAGNotNeeded: !fabData.slab_smith_ag_needed,
                            finalProgrammingNotNeeded: !fabData.final_programming_needed,
                        };

                        // Handle notes
                        if (fabData.notes && Array.isArray(fabData.notes) && fabData.notes.length > 0) {
                            formData.notes = fabData.notes[0];
                        } else if (typeof fabData.notes === 'string') {
                            formData.notes = fabData.notes;
                        }

                        console.log('Prepared form data:', formData);
                        
                        // Reset form with data
                        form.reset(formData);
                        
                        // Set selected account ID
                        if (formData.account && accountsData.length > 0) {
                            const account = accountsData.find((acc: any) => acc.name === formData.account);
                            if (account) {
                                setSelectedAccountId(account.id);
                            }
                        }
                        
                        setHasInitialDataLoaded(true);
                    } catch (error) {
                        console.error('Error loading form data:', error);
                    } finally {
                        setIsLoadingFormData(false);
                    }
                }, 300);
            }
        };

        loadFormData();
    }, [existingFab, isLoadingFab, hasInitialDataLoaded, form, accountsData]);

    // Functions to add new items
    const handleAddThickness = async () => {
        if (newThickness.trim()) {
            try {
                await createStoneThickness({ thickness: newThickness.trim() }).unwrap();
                setNewThickness('');
                setShowAddThickness(false);
                setThicknessPopoverOpen(false);
                toast.success('Thickness added successfully');
            } catch (error: any) {
                console.error('Failed to add thickness:', error);
                toast.error('Failed to add thickness');
            }
        }
    };

    const handleAddAccount = async () => {
        if (newAccount.trim()) {
            try {
                await createAccount({ name: newAccount.trim() }).unwrap();
                setNewAccount('');
                setShowAddAccount(false);
                setAccountPopoverOpen(false);
                toast.success('Account added successfully');
            } catch (error: any) {
                console.error('Failed to add account:', error);
                toast.error('Failed to add account');
            }
        }
    };

    const handleAddEdge = async () => {
        if (newEdge.trim()) {
            try {
                await createEdge({ name: newEdge.trim(), edge_type: 'standard' }).unwrap();
                setNewEdge('');
                setShowAddEdge(false);
                setEdgePopoverOpen(false);
                toast.success('Edge added successfully');
            } catch (error: any) {
                console.error('Failed to add edge:', error);
                toast.error('Failed to add edge');
            }
        }
    };

    const onSubmit = async (values: FabIdFormData) => {
        try {
            setIsSubmitting(true);
            setError(null);

            console.log('Form values:', values);

            // Find IDs for selected values
            const selectedFabType = fabTypesData.find((type: any) => type.name === values.fabType);
            const selectedAccount = accountsData.find((account: any) => account.name === values.account);
            const selectedStoneType = stoneTypesData.find((type: any) => type.name === values.stoneType);
            const selectedStoneColor = stoneColorsData.find((color: any) => color.name === values.stoneColor);
            const selectedStoneThickness = stoneThicknessesData.find((thickness: any) => thickness.thickness === values.stoneThickness);
            const selectedEdge = edgesData.find((edge: any) => edge.name === values.edge);
            const selectedSalesPerson = salesPersons.find((person: any) => person.name === values.selectedSalesPerson);

            // Find the selected job
            let selectedJob;
            if (values.jobName) {
                selectedJob = effectiveJobsData.find((job: any) => job.name === values.jobName);
            } else if (values.jobNumber) {
                selectedJob = effectiveJobsData.find((job: any) => job.job_number === values.jobNumber);
            }

            // If still no job, use the existing job ID
            if (!selectedJob && existingFab) {
                selectedJob = { id: existingFab.job_id };
            }

            // Validate all required data
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

            // Prepare notes - send as string as expected by API
            let notesValue: string | undefined = undefined;
            if (values.notes && values.notes.trim()) {
                notesValue = values.notes.trim();
            }

            // Prepare update payload
            const updatePayload: any = {
                job_id: selectedJob.id,
                fab_type: selectedFabType.name,
                sales_person_id: selectedSalesPerson.id,
                stone_type_id: selectedStoneType.id,
                stone_color_id: selectedStoneColor.id,
                stone_thickness_id: selectedStoneThickness.id,
                edge_id: selectedEdge.id,
                input_area: values.area,
                total_sqft: parseFloat(values.totalSqFt) || 0,
                revenue: parseFloat(values.revenue) || 0,
                cost_of_stone: parseFloat(values.cost_of_stone) || 0,
                notes: notesValue,
                template_needed: !values.templateNotNeeded,
                drafting_needed: !values.draftNotNeeded,
                slab_smith_cust_needed: !values.slabSmithCustNotNeeded,
                slab_smith_ag_needed: !values.slabSmithAGNotNeeded,
                sct_needed: !values.sctNotNeeded,
                final_programming_needed: !values.finalProgrammingNotNeeded,
            };

            console.log('Update payload:', updatePayload);

            // Update FAB
            await updateFab({
                id: Number(id),
                data: updatePayload
            }).unwrap();

            toast.success('FAB ID updated successfully!');
            navigate('/job/sales');

        } catch (err: any) {
            console.error('Submission error:', err);
            
            let errorMessage = 'An unexpected error occurred. Please try again.';
            
            if (err?.status === 'FETCH_ERROR') {
                errorMessage = 'Network error: Unable to connect to the server.';
            } else if (err?.data?.message) {
                errorMessage = err.data.message;
            } else if (err?.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            toast.error('Failed to update FAB ID. ' + errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingFab || isLoadingFormData) {
        return (
            <Container className="border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold">Edit FAB ID</h1>
                        <p className="text-sm text-muted-foreground">
                            Loading FAB details...
                        </p>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto">
                    <Card className="animate-pulse">
                        <CardHeader>
                            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-10 bg-gray-200 rounded"></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        );
    }

    if (isFabError) {
        return (
            <Container className="border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold">Edit FAB ID</h1>
                        <p className="text-sm text-muted-foreground">
                            Error loading FAB details
                        </p>
                    </div>
                </div>
                <div className="max-w-4xl mx-auto">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            Failed to load FAB data. Please try again.
                        </AlertDescription>
                    </Alert>
                </div>
            </Container>
        );
    }

    return (
        <div className="">
            <Container>
                <div className="py-6">
                    <Card className="max-w-4xl mx-auto mb-4 py-6">
                        <CardHeader className='flex flex-col justify-start items-start'>
                            <CardTitle className='text-2xl font-bold text-[#111827]'>
                                Edit FAB ID
                            </CardTitle>
                            <CardDescription className='text-sm text-[#4B5563]'>
                                Edit the Standard Fabrication Form with project specifications.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <div className="max-w-4xl mx-auto">
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
                                        {error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        )}

                                        <div className="space-y-4 grid grid-cols-2 gap-x-4">
                                            {/* FAB Type */}
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
                                                                        {filteredFabTypes.length === 0 && (
                                                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                                No FAB types found
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

                                            {/* Account */}
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
                                                                        <span className="text-sm font-medium">Accounts</span>
                                                                        <Popover open={showAddAccount} onOpenChange={setShowAddAccount}>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                                                                    <Plus className="w-3 h-3 mr-1" />
                                                                                    Add
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-80" align="end">
                                                                                <div className="space-y-3">
                                                                                    <div>
                                                                                        <Label htmlFor="newAccount">Account Name</Label>
                                                                                        <Input
                                                                                            id="newAccount"
                                                                                            placeholder="Enter account name"
                                                                                            value={newAccount}
                                                                                            onChange={(e) => setNewAccount(e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <Button variant="outline" size="sm" onClick={() => setShowAddAccount(false)}>
                                                                                            Cancel
                                                                                        </Button>
                                                                                        <Button size="sm" onClick={handleAddAccount}>
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
                                                                            placeholder="Search account"
                                                                            className="pl-8"
                                                                            value={accountSearch}
                                                                            onChange={(e) => setAccountSearch(e.target.value)}
                                                                        />
                                                                    </div>
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
                                                                        {filteredAccounts.length === 0 && (
                                                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                                No accounts found
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

                                            {/* Job Name */}
                                            <FormField
                                                control={form.control}
                                                name="jobName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Job Name</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            disabled={isEffectiveJobsLoading}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={
                                                                        isEffectiveJobsLoading ? 'Loading...' : 'Select job name'
                                                                    } />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {jobNames.map((jobName: string) => (
                                                                    <SelectItem key={jobName} value={jobName}>
                                                                        {jobName}
                                                                    </SelectItem>
                                                                ))}
                                                                {jobNames.length === 0 && (
                                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                        No jobs found
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Job Number */}
                                            <FormField
                                                control={form.control}
                                                name="jobNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Job Number</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                            disabled={isEffectiveJobsLoading}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={
                                                                        isEffectiveJobsLoading ? 'Loading...' : 'Select job number'
                                                                    } />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {jobNumbers.map((jobNumber: string) => (
                                                                    <SelectItem key={jobNumber} value={jobNumber}>
                                                                        {jobNumber}
                                                                    </SelectItem>
                                                                ))}
                                                                {jobNumbers.length === 0 && (
                                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                        No jobs found
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Area */}
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

                                            {/* Stone Type */}
                                            <FormField
                                                control={form.control}
                                                name="stoneType"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Stone Type *</FormLabel>
                                                        <Select 
                                                            onValueChange={field.onChange} 
                                                            value={field.value} 
                                                            disabled={isLoadingStoneTypes}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={isLoadingStoneTypes ? 'Loading...' : 'Select stone type'} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {stoneTypes.map((type: string) => (
                                                                    <SelectItem key={type} value={type}>
                                                                        {type}
                                                                    </SelectItem>
                                                                ))}
                                                                {stoneTypes.length === 0 && (
                                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                        No stone types found
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Stone Color */}
                                            <FormField
                                                control={form.control}
                                                name="stoneColor"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Stone Color *</FormLabel>
                                                        <Select 
                                                            onValueChange={field.onChange} 
                                                            value={field.value} 
                                                            disabled={isLoadingStoneColors}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={isLoadingStoneColors ? 'Loading...' : 'Select stone color'} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {stoneColors.map((color: string) => (
                                                                    <SelectItem key={color} value={color}>
                                                                        {color}
                                                                    </SelectItem>
                                                                ))}
                                                                {stoneColors.length === 0 && (
                                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                        No stone colors found
                                                                    </div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Stone Thickness */}
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
                                                                        {filteredThicknessOptions.length === 0 && (
                                                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                                No thickness options found
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

                                            {/* Edge */}
                                            <FormField
                                                control={form.control}
                                                name="edge"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Edge *</FormLabel>
                                                        <Popover open={edgePopoverOpen} onOpenChange={setEdgePopoverOpen}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                                                        disabled={isLoadingEdges}
                                                                    >
                                                                        <span className={!field.value ? "text-muted-foreground" : ""}>
                                                                            {isLoadingEdges ? 'Loading...' : (field.value || "Select edge")}
                                                                        </span>
                                                                        <ChevronDown className="h-4 w-4 opacity-60" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                                                <div className="p-2">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-medium">Edges</span>
                                                                        <Popover open={showAddEdge} onOpenChange={setShowAddEdge}>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                                                                    <Plus className="w-3 h-3 mr-1" />
                                                                                    Add
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-80" align="end">
                                                                                <div className="space-y-3">
                                                                                    <div>
                                                                                        <Label htmlFor="newEdge">Edge Name</Label>
                                                                                        <Input
                                                                                            id="newEdge"
                                                                                            placeholder="Enter edge name"
                                                                                            value={newEdge}
                                                                                            onChange={(e) => setNewEdge(e.target.value)}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <Button variant="outline" size="sm" onClick={() => setShowAddEdge(false)}>
                                                                                            Cancel
                                                                                        </Button>
                                                                                        <Button size="sm" onClick={handleAddEdge}>
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
                                                                            placeholder="Search edge"
                                                                            className="pl-8"
                                                                            value={edgeSearch}
                                                                            onChange={(e) => setEdgeSearch(e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                                                        {filteredEdgeOptions.map((edge: string) => (
                                                                            <div
                                                                                key={edge}
                                                                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                                                                onClick={() => {
                                                                                    field.onChange(edge);
                                                                                    setEdgeSearch('');
                                                                                    setEdgePopoverOpen(false);
                                                                                }}
                                                                            >
                                                                                {edge}
                                                                            </div>
                                                                        ))}
                                                                        {filteredEdgeOptions.length === 0 && (
                                                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                                No edge options found
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

                                            {/* Total Sq Ft */}
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

                                             {/* Revenue */}
                                            <FormField
                                                control={form.control}
                                                name="revenue"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Revenue ($) *</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter revenue amount"
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Cost of Stone */}
                                            <FormField
                                                control={form.control}
                                                name="cost_of_stone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cost of Stone ($) *</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter cost of stone"
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Sales Person - FIXED: Use id as key to avoid duplicate error */}
                                            <FormField
                                                control={form.control}
                                                name="selectedSalesPerson"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Select Sales Person *</FormLabel>
                                                        <Select 
                                                            onValueChange={field.onChange} 
                                                            value={field.value} 
                                                            disabled={isLoadingSalesPersons}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={
                                                                        isLoadingSalesPersons ? 'Loading sales persons...' : 'Select salesperson'
                                                                    } />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {salesPersons.map((person: any) => (
                                                                    <SelectItem
                                                                        key={person.id}  // Use ID as key to avoid duplicate error
                                                                        value={person.name}
                                                                    >
                                                                        {person.name}
                                                                    </SelectItem>
                                                                ))}
                                                                {salesPersons.length === 0 && (
                                                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                        No sales persons found
                                                                    </div>
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
                                                        <FormLabel className="font-normal">Final programming not needed</FormLabel>
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
                                                    <FormLabel>Notes</FormLabel>
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
                                        <div className="flex items-center justify-end gap-3">
                                            <Link to="/job/sales">
                                                <Button variant="outline" type="button">Cancel</Button>
                                            </Link>
                                            <Button type="submit" disabled={isSubmitting || isLoadingFormData || !hasInitialDataLoaded}>
                                                {isSubmitting ? (
                                                    <>
                                                        <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                                        Updating...
                                                    </>
                                                ) : (
                                                    'Update FAB'
                                                )}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            </form>
                        </Form>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export { EditFabIdForm };