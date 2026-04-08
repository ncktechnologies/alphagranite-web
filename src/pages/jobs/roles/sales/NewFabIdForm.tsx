"use client"

import { useState, useEffect, useRef } from 'react';
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
  useGetStoneColorsByStoneTypeQuery,
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
import Popup from '@/components/ui/popup';

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

// Checkbox validation logic
const CHECKBOX_FIELD_MAP: Record<string, keyof FabIdFormData> = {
  'Draft not needed': 'draftNotNeeded',
  'SS Cust not needed': 'slabSmithCustNotNeeded',
  'SS AG not needed': 'slabSmithAGNotNeeded',
  'SCT not needed': 'sctNotNeeded',
  'Final Prog not needed': 'finalProgrammingNotNeeded',
  'Template not needed': 'templateNotNeeded',
};

const IMPOSSIBLE_SCENARIOS: string[][] = [
  ["Draft not needed"],
  ["Draft not needed", "SS Cust not needed"],
  ["Draft not needed", "SS Cust not needed", "SS AG not needed"],
  ["Draft not needed", "SS Cust not needed", "SS AG not needed", "SCT not needed"],
  ["Draft not needed", "SS Cust not needed", "SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["Template not needed", "SCT not needed"],
  ["Template not needed", "SCT not needed", "Final Prog not needed"],
  ["Template not needed", "SS Cust not needed", "SCT not needed", "Final Prog not needed"],
  ["Template not needed", "SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["Template not needed", "SS Cust not needed", "SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["SCT not needed"],
  ["SCT not needed", "Final Prog not needed"],
  ["SS Cust not needed", "SCT not needed", "Final Prog not needed"],
  ["SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["SS Cust not needed", "SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["SS Cust not needed", "SCT not needed"],
  ["SS AG not needed", "SCT not needed"],
  ["SS Cust not needed", "SS AG not needed", "SCT not needed"],
  ["SS Cust not needed", "SS AG not needed", "SCT not needed", "Final Prog not needed"],
  ["SS Cust not needed", "Final Prog not needed"],
  ["SS AG not needed", "Final Prog not needed"],
  ["Template not needed", "Draft not needed", "SS Cust not needed", "SS AG not needed", "Final Prog not needed"],
  ["Template not needed", "Draft not needed", "SS Cust not needed", "SCT not needed", "Final Prog not needed"],
  ["Template not needed", "Draft not needed"],
  ["Template not needed", "Draft not needed", "SS Cust not needed"],
  ["Template not needed", "Draft not needed", "SS Cust not needed", "SS AG not needed"],
  ["Template not needed", "Draft not needed", "SS AG not needed"],
  ["Template not needed", "Draft not needed", "SS AG not needed", "Final Prog not needed"],
  ["Template not needed", "Draft not needed", "SS Cust not needed", "Final Prog not needed"],
  ["Template not needed", "Draft not needed", "Final Prog not needed"]
];

const getSelectedCheckboxLabels = (formData: Partial<FabIdFormData>): string[] => {
  const selected: string[] = [];
  const labels = Object.entries(CHECKBOX_FIELD_MAP);
  
  for (const [label, field] of labels) {
    if (formData[field]) {
      selected.push(label);
    }
  }
  
  return selected;
};

const isScenarioImpossible = (scenario: string[]): boolean => {
  return IMPOSSIBLE_SCENARIOS.some(impossible => 
    impossible.length === scenario.length && 
    impossible.every(item => scenario.includes(item))
  );
};

const getDisabledCheckboxes = (formData: Partial<FabIdFormData>): Set<string> => {
  const currentSelected = getSelectedCheckboxLabels(formData);
  const disabled = new Set<string>();
  
  // Check each field to see if enabling it would create an impossible scenario
  Object.entries(CHECKBOX_FIELD_MAP).forEach(([label, field]) => {
    // If already selected, it can't be disabled
    if (formData[field]) return;
    
    // Test what would happen if we selected this checkbox
    const testScenario = [...currentSelected, label].sort();
    
    if (isScenarioImpossible(testScenario)) {
      disabled.add(label);
    }
  });
  
  return disabled;
};

const isCurrentStateImpossible = (formData: Partial<FabIdFormData>): boolean => {
  const currentSelected = getSelectedCheckboxLabels(formData);
  return currentSelected.length > 0 && isScenarioImpossible(currentSelected);
};

const NewFabIdForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fabId, setFabId] = useState<number | null>(null);
  const navigate = useNavigate();
  const firstFieldRef = useRef<HTMLButtonElement>(null);
  const lastProcessedJobRef = useRef<{ name: string; number: string } | null>(null);

  // Focus first field when form opens
  useEffect(() => {
    if (firstFieldRef.current) {
      setTimeout(() => {
        firstFieldRef.current?.focus();
      }, 100);
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
  const [jobNamePopoverOpen, setJobNamePopoverOpen] = useState(false);
  const [jobNumberPopoverOpen, setJobNumberPopoverOpen] = useState(false);
  const [thicknessPopoverOpen, setThicknessPopoverOpen] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  // Nested popover states for adding new items
  const [showAddThickness, setShowAddThickness] = useState(false);
  const [showAddStoneType, setShowAddStoneType] = useState(false);
  const [newStoneType, setNewStoneType] = useState('');
  const [stoneTypePopoverOpen, setStoneTypePopoverOpen] = useState(false);
  const [stoneTypeSearch, setStoneTypeSearch] = useState('');
  const [newThickness, setNewThickness] = useState('');

  const [stoneColorPopoverOpen, setStoneColorPopoverOpen] = useState(false);
  const [stoneColorSearch, setStoneColorSearch] = useState('');
  const [showAddStoneColor, setShowAddStoneColor] = useState(false);
  const [newStoneColor, setNewStoneColor] = useState('');

  const [edgePopoverOpen, setEdgePopoverOpen] = useState(false);
  const [edgeSearch, setEdgeSearch] = useState('');
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [newEdge, setNewEdge] = useState('');

  const handlePopupClose = () => {
    setShowPopover(false);
    navigate('/job');
  };

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
      cost_of_stone: '',
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

  // Watch for stone type changes and fetch filtered colors
  // FIX: Only one declaration - removed duplicate later
  const stoneTypeValue = form.watch('stoneType');
  const selectedStoneType = stoneTypesData?.find((type: any) => type.name === stoneTypeValue);
  const selectedStoneTypeId = selectedStoneType?.id;

  // Fetch stone colors filtered by selected stone type
  const {
    data: filteredStoneColorsData,
    isLoading: isLoadingFilteredStoneColors,
    isError: isFilteredStoneColorsError,
    error: filteredStoneColorsError
  } = useGetStoneColorsByStoneTypeQuery(
    { stone_type_id: selectedStoneTypeId!, limit: 1000 },
    { skip: !selectedStoneTypeId }
  );

  // Use filtered colors when stone type is selected, otherwise use all colors
  const effectiveStoneColorsData = selectedStoneTypeId ? filteredStoneColorsData : stoneColorsData;
  const isEffectiveStoneColorsLoading = selectedStoneTypeId ? isLoadingFilteredStoneColors : isLoadingStoneColors;
  const isEffectiveStoneColorsError = selectedStoneTypeId ? isFilteredStoneColorsError : isStoneColorsError;

  // Auto-check all checkboxes when FAB type is resurfacing or punchout
  const fabTypeValue = form.watch('fabType');

  useEffect(() => {
    const fabTypeLower = fabTypeValue?.toLowerCase();
    if (fabTypeLower === 'resurface' || fabTypeLower === 'punchout-ag' || fabTypeLower === 'punchout-billable') {
      form.setValue('templateNotNeeded', true);
      form.setValue('draftNotNeeded', true);
      form.setValue('slabSmithCustNotNeeded', true);
      form.setValue('sctNotNeeded', true);
      form.setValue('slabSmithAGNotNeeded', true);
      form.setValue('finalProgrammingNotNeeded', true);
    } else {
      form.setValue('templateNotNeeded', false);
      form.setValue('draftNotNeeded', false);
      form.setValue('slabSmithCustNotNeeded', false);
      form.setValue('sctNotNeeded', false);
      form.setValue('slabSmithAGNotNeeded', false);
      form.setValue('finalProgrammingNotNeeded', false);
    }
  }, [fabTypeValue, form]);

  // Watch for account changes
  const accountValue = form.watch('account');

  // Get the selected account ID
  const selectedAccount = accountsData?.find((account: any) => account.name === accountValue);
  const selectedAccountId = selectedAccount?.id;

  // Reset stone color search when stone type changes
  useEffect(() => {
    setStoneColorSearch('');
    // Also reset the selected stone color value when stone type changes
    form.setValue('stoneColor', '', { shouldValidate: false });
  }, [selectedStoneTypeId, form]);

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

  // Filter jobs for job dropdowns
  const jobNames = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).map((job: any) => job.name);
  const jobNumbers = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).map((job: any) => job.job_number);

  const filteredJobs = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).filter((job: any) =>
    job.name?.toLowerCase().includes(jobNameSearch.toLowerCase())
  );

  const filteredJobsByNumber = (!isEffectiveJobsError && Array.isArray(effectiveJobsData) ? effectiveJobsData : []).filter((job: any) =>
    job.job_number?.toLowerCase().includes(jobNumberSearch.toLowerCase())
  );

  // Auto-population logic
  useEffect(() => {
    if (!effectiveJobsData || !Array.isArray(effectiveJobsData) || salesPersons.length === 0) return;

    if (!jobNameValue && !jobNumberValue) {
      lastProcessedJobRef.current = null;
      return;
    }

    let selectedJob = null;

    if (jobNameValue || jobNumberValue) {
      selectedJob = effectiveJobsData.find((job: any) => {
        const nameMatches = jobNameValue ? job.name === jobNameValue : true;
        const numberMatches = jobNumberValue ? job.job_number === jobNumberValue : true;
        return nameMatches && numberMatches;
      });
    }

    if (!selectedJob && jobNameValue) {
      selectedJob = effectiveJobsData.find((job: any) => job.name === jobNameValue);
    }

    if (!selectedJob && jobNumberValue) {
      selectedJob = effectiveJobsData.find((job: any) => job.job_number === jobNumberValue);
    }

    if (selectedJob) {
      const isSameJob = lastProcessedJobRef.current?.name === selectedJob.name &&
        lastProcessedJobRef.current?.number === selectedJob.job_number;

      if (isSameJob) return;

      const updates = [];

      if (selectedJob.name && selectedJob.name !== jobNameValue) {
        updates.push({ field: 'jobName', value: selectedJob.name });
      }
      if (selectedJob.job_number && selectedJob.job_number !== jobNumberValue) {
        updates.push({ field: 'jobNumber', value: selectedJob.job_number });
      }
      if (selectedJob.account_name && selectedJob.account_name !== form.getValues('account')) {
        updates.push({ field: 'account', value: selectedJob.account_name });
      }
      if (selectedJob.sales_person_id) {
        const salesPersonForJob = salesPersons.find((person: any) => person.id === selectedJob.sales_person_id);
        if (salesPersonForJob) {
          updates.push({ field: 'selectedSalesPerson', value: salesPersonForJob.name });
        }
      }

      if (updates.length > 0) {
        updates.forEach(({ field, value }) => {
          form.setValue(field, value, { shouldValidate: false, shouldDirty: true });
        });
        lastProcessedJobRef.current = { name: selectedJob.name, number: selectedJob.job_number };
      }
    } else {
      lastProcessedJobRef.current = null;
      if (jobNameValue && !jobNumberValue) {
        form.setValue('jobNumber', '', { shouldValidate: false });
      } else if (jobNumberValue && !jobNameValue) {
        form.setValue('jobName', '', { shouldValidate: false });
      }
    }
  }, [jobNameValue, jobNumberValue, effectiveJobsData, salesPersons, form]);

  useEffect(() => {
    if (accountValue && lastProcessedJobRef.current) {
      const currentAccount = accountsData?.find((account: any) => account.name === accountValue);
      if (currentAccount && !isEffectiveJobsLoading) {
        const jobForCurrentAccount = effectiveJobsData?.find((job: any) =>
          (job.name === lastProcessedJobRef.current?.name || job.job_number === lastProcessedJobRef.current?.number) &&
          job.account_id === currentAccount.id
        );
        if (!jobForCurrentAccount) {
          form.setValue('jobName', '');
          form.setValue('jobNumber', '');
          lastProcessedJobRef.current = null;
        }
      }
    }
  }, [accountValue, accountsData, effectiveJobsData, form, isEffectiveJobsLoading]);

  useEffect(() => {
    return () => {
      lastProcessedJobRef.current = null;
    };
  }, []);

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
  // FIX: Ensure stoneColors is always an array
  const stoneColors = !isEffectiveStoneColorsError && Array.isArray(effectiveStoneColorsData)
    ? effectiveStoneColorsData.map((color: any) => color.name)
    : [];

  const edgeOptions = !isEdgesError && Array.isArray(edgesData) ? (edgesData?.map((edge: any) => edge.name) || []) : [];

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

  const handleAddStoneType = async () => {
    if (newStoneType.trim()) {
      try {
        await createStoneType({ name: newStoneType.trim() }).unwrap();
        setNewStoneType('');
        setShowAddStoneType(false);
        setStoneTypePopoverOpen(false);
        toast.success('Stone type added successfully');
      } catch (error: any) {
        console.error('Failed to add stone type:', error);
        toast.error('Failed to add stone type');
      }
    }
  };

  const handleAddStoneColor = async () => {
    if (newStoneColor.trim()) {
      try {
        await createStoneColor({ name: newStoneColor.trim() }).unwrap();
        setNewStoneColor('');
        setShowAddStoneColor(false);
        setStoneColorPopoverOpen(false);
        toast.success('Stone color added successfully');
      } catch (error: any) {
        console.error('Failed to add stone color:', error);
        toast.error('Failed to add stone color');
      }
    }
  };

  const handleAddEdge = async () => {
    if (newEdge.trim()) {
      try {
        await createEdge({ name: newEdge.trim() }).unwrap();
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

  const filteredEdges = edgeOptions.filter(edge =>
    edge.toLowerCase().includes(edgeSearch.toLowerCase())
  );

  const onSubmit = async (values: FabIdFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const selectedFabType = Array.isArray(fabTypesData) ? fabTypesData?.find((type: any) => type.name === values.fabType) : undefined;
      const selectedAccount = Array.isArray(accountsData) ? accountsData?.find((account: any) => account.name === values.account) : undefined;
      const selectedStoneType = Array.isArray(stoneTypesData) ? stoneTypesData?.find((type: any) => type.name === values.stoneType) : undefined;
      const selectedStoneColor = Array.isArray(stoneColorsData) ? stoneColorsData?.find((color: any) => color.name === values.stoneColor) : undefined;
      const selectedStoneThickness = Array.isArray(stoneThicknessesData) ? stoneThicknessesData?.find((thickness: any) => thickness.thickness === values.stoneThickness) : undefined;
      const selectedEdge = Array.isArray(edgesData) ? edgesData?.find((edge: any) => edge.name === values.edge) : undefined;
      const selectedSalesPerson = salesPersons.find((person: any) => person.name === values.selectedSalesPerson);

      let selectedJob;
      if (effectiveJobsData && Array.isArray(effectiveJobsData)) {
        if (values.jobName) selectedJob = effectiveJobsData.find((job: any) => job.name === values.jobName);
        if (!selectedJob && values.jobNumber) selectedJob = effectiveJobsData.find((job: any) => job.job_number === values.jobNumber);
      }

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

      const response = await createFab({
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
        notes: values.notes,
        template_needed: !values.templateNotNeeded,
        drafting_needed: !values.draftNotNeeded,
        slab_smith_cust_needed: !values.slabSmithCustNotNeeded,
        slab_smith_ag_needed: !values.slabSmithAGNotNeeded,
        sct_needed: !values.sctNotNeeded,
        final_programming_needed: !values.finalProgrammingNotNeeded,
      }).unwrap();

      const newFabId = response.data?.id;
      setFabId(newFabId);
      setShowPopover(true);
      form.reset();
    } catch (err: any) {
      console.error('Submission error:', err);
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
                                      ref={firstFieldRef}
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isLoadingFabTypes}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : "uppercase"}>
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
                                        Failed to load FAB types
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {filteredFabTypes.map((type: string) => (
                                        <div
                                          key={type}
                                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm uppercase"
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
                                        Failed to load accounts
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

                        {/* Job Name */}
                        <FormField
                          control={form.control}
                          name="jobName"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-start ">
                                <FormLabel>Job Name</FormLabel>
                              </div>
                              <Popover
                                open={jobNamePopoverOpen}
                                onOpenChange={(open) => {
                                  setJobNamePopoverOpen(open);
                                  if (!open) setJobNameSearch('');
                                }}
                                key={`jobName-${accountValue}`}
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isEffectiveJobsLoading || (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0)}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isEffectiveJobsLoading ? 'Loading...' :
                                          (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0) ? 'No jobs available' :
                                            (field.value || "Select job name")}
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
                                        placeholder="Search job name"
                                        className="pl-8"
                                        value={jobNameSearch}
                                        onChange={(e) => setJobNameSearch(e.target.value)}
                                      />
                                    </div>
                                    {isEffectiveJobsError ? (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load jobs
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
                                    ) : (
                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {filteredJobs.map((job: any) => (
                                          <div
                                            key={job.id}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                            onClick={() => {
                                              field.onChange(job.name);
                                              form.setValue('jobNumber', job.job_number, { shouldValidate: false });
                                              setJobNameSearch('');
                                              setJobNamePopoverOpen(false);
                                            }}
                                          >
                                            {job.name}
                                          </div>
                                        ))}
                                        {filteredJobs.length === 0 && !isEffectiveJobsError && (
                                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                            {isEffectiveJobsLoading ? 'Loading jobs...' : 'No job names found'}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
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
                              <Popover
                                open={jobNumberPopoverOpen}
                                onOpenChange={(open) => {
                                  setJobNumberPopoverOpen(open);
                                  if (!open) setJobNumberSearch('');
                                }}
                                key={`jobNumber-${accountValue}`}
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isEffectiveJobsLoading || (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0)}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isEffectiveJobsLoading ? 'Loading...' :
                                          (selectedAccountId && effectiveJobsData && effectiveJobsData.length === 0) ? 'No jobs available' :
                                            (field.value || "Select job number")}
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
                                        placeholder="Search job number"
                                        className="pl-8"
                                        value={jobNumberSearch}
                                        onChange={(e) => setJobNumberSearch(e.target.value)}
                                      />
                                    </div>
                                    {isEffectiveJobsError ? (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load jobs
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
                                    ) : (
                                      <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {filteredJobsByNumber.map((job: any) => (
                                          <div
                                            key={job.id}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                            onClick={() => {
                                              field.onChange(job.job_number);
                                              form.setValue('jobName', job.name, { shouldValidate: false });
                                              setJobNumberSearch('');
                                              setJobNumberPopoverOpen(false);
                                            }}
                                          >
                                            {job.job_number}
                                          </div>
                                        ))}
                                        {filteredJobsByNumber.length === 0 && !isEffectiveJobsError && (
                                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                            {isEffectiveJobsLoading ? 'Loading jobs...' : 'No job numbers found'}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
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
                              <Popover open={stoneTypePopoverOpen} onOpenChange={setStoneTypePopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isLoadingStoneTypes}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isLoadingStoneTypes ? 'Loading...' : (field.value || "Select stone type")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <div className="p-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Stone Types</span>
                                      <Popover open={showAddStoneType} onOpenChange={setShowAddStoneType}>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 px-2">
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="end">
                                          <div className="space-y-3">
                                            <div>
                                              <Label htmlFor="newStoneType">Stone Type Name</Label>
                                              <Input
                                                id="newStoneType"
                                                placeholder="Enter stone type"
                                                value={newStoneType}
                                                onChange={(e) => setNewStoneType(e.target.value)}
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button variant="outline" size="sm" onClick={() => setShowAddStoneType(false)}>
                                                Cancel
                                              </Button>
                                              <Button size="sm" onClick={handleAddStoneType}>
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
                                        placeholder="Search stone type"
                                        className="pl-8"
                                        value={stoneTypeSearch}
                                        onChange={(e) => setStoneTypeSearch(e.target.value)}
                                      />
                                    </div>
                                    {isStoneTypesError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load stone types
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {stoneTypes
                                        .filter((type: string) => type.toLowerCase().includes(stoneTypeSearch.toLowerCase()))
                                        .map((type: string) => (
                                          <div
                                            key={type}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                            onClick={() => {
                                              field.onChange(type);
                                              setStoneTypeSearch('');
                                              setStoneTypePopoverOpen(false);
                                            }}
                                          >
                                            {type}
                                          </div>
                                        ))}
                                      {stoneTypes.filter((type: string) => type.toLowerCase().includes(stoneTypeSearch.toLowerCase())).length === 0 && !isStoneTypesError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isLoadingStoneTypes ? 'Loading stone types...' : 'No stone types found'}
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

                        {/* Stone Color - FIX: Disabled until stone type selected */}
                        <FormField
                          control={form.control}
                          name="stoneColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stone Color *</FormLabel>
                              <Popover open={stoneColorPopoverOpen} onOpenChange={setStoneColorPopoverOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-between h-[48px] px-4 text-sm border-input shadow-xs shadow-black/5"
                                      disabled={isEffectiveStoneColorsLoading || !selectedStoneTypeId}
                                    >
                                      <span className={!field.value ? "text-muted-foreground" : ""}>
                                        {isEffectiveStoneColorsLoading ? 'Loading...' : (field.value || "Select stone color")}
                                      </span>
                                      <ChevronDown className="h-4 w-4 opacity-60" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                  <div className="p-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium">Stone Colors</span>
                                      <Popover open={showAddStoneColor} onOpenChange={setShowAddStoneColor}>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7 px-2">
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="end">
                                          <div className="space-y-3">
                                            <div>
                                              <Label htmlFor="newStoneColor">Stone Color Name</Label>
                                              <Input
                                                id="newStoneColor"
                                                placeholder="Enter stone color"
                                                value={newStoneColor}
                                                onChange={(e) => setNewStoneColor(e.target.value)}
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button variant="outline" type='button' size="sm" onClick={() => setShowAddStoneColor(false)}>
                                                Cancel
                                              </Button>
                                              <Button size="sm" type='button' onClick={handleAddStoneColor}>
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
                                        placeholder="Search stone color"
                                        className="pl-8"
                                        value={stoneColorSearch}
                                        onChange={(e) => setStoneColorSearch(e.target.value)}
                                      />
                                    </div>
                                    {isEffectiveStoneColorsError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load stone colors
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {stoneColors
                                        .filter((color: string) => color.toLowerCase().includes(stoneColorSearch.toLowerCase()))
                                        .map((color: string) => (
                                          <div
                                            key={color}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded text-sm"
                                            onClick={() => {
                                              field.onChange(color);
                                              setStoneColorSearch('');
                                              setStoneColorPopoverOpen(false);
                                            }}
                                          >
                                            {color}
                                          </div>
                                        ))}
                                      {stoneColors.filter((color: string) => color.toLowerCase().includes(stoneColorSearch.toLowerCase())).length === 0 && !isEffectiveStoneColorsError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isEffectiveStoneColorsLoading ? 'Loading stone colors...' : 'No stone colors found'}
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
                                    {isStoneThicknessesError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load thicknesses
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
                                    {isEdgesError && (
                                      <div className="px-3 py-2 text-sm text-red-500 text-center">
                                        Failed to load edges
                                      </div>
                                    )}
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {filteredEdges.map((edge) => (
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
                                      {filteredEdges.length === 0 && !isEdgesError && (
                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                          {isLoadingEdges ? 'Loading edges...' : 'No edges found'}
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
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onWheel={(e) => e.currentTarget.blur()}
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
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onWheel={(e) => e.currentTarget.blur()}
                                />
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
                                      <SelectItem key={person.id} value={person.name}>
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
                      <div>
                        {isCurrentStateImpossible(form.getValues()) && (
                          <Alert className="mb-4 border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <AlertTitle className="text-red-800">Invalid checkbox combination detected</AlertTitle>
                          </Alert>
                        )}
                        <div className="gap-3 flex flex-wrap">
                          <FormField
                            control={form.control}
                            name="templateNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('Template not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Template not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="draftNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('Draft not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Draft not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="slabSmithCustNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('SS Cust not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    SlabSmith (Cust) not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                         
                          <FormField
                            control={form.control}
                            name="slabSmithAGNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('SS AG not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Slab smith (AG) not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                           <FormField
                            control={form.control}
                            name="sctNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('SCT not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    SCT not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                          <FormField
                            control={form.control}
                            name="finalProgrammingNotNeeded"
                            render={({ field }) => {
                              const disabledCheckboxes = getDisabledCheckboxes(form.getValues());
                              const isDisabled = disabledCheckboxes.has('Final Prog not needed');
                              return (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                                  </FormControl>
                                  <FormLabel className={`font-normal ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    Final programing not needed
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
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
                            </div>
                            <FormControl>
                              <Textarea placeholder="Type here..." {...field} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className='flex justify-between items-center'>
                      <Link to="/sales" className="flex flex-nowrap items-center gap-2 text-sm text-primary underline">
                        <ArrowLeft className="w-4 h-4" />
                        Back to All Fabs
                      </Link>
                      <div className="flex items-center justify-end gap-3 ">
                        <Link to="/sales">
                          <Button variant="outline" type="button">Cancel</Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            'Submit'
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
      <Popup isOpen={showPopover}
        title={`${fabId} created successfully `}
        description={'Your fab ID has been created successfully'}
      >
        <div className="flex gap-x-3 items-center mt-4">
          <Link to={`/sales/edit/${fabId}`}>
            <Button className="px-8">Edit Fab Details</Button>
          </Link>
          <Button className="px-8" onClick={handlePopupClose}>Confirm</Button>
        </div>
      </Popup>
    </div>
  );
};

export { NewFabIdForm };