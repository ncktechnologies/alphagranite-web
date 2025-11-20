// components/JobsSection.tsx
import { Fragment, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '@/pages/settings/page-menu';
import { ViewMode } from '@/config/types';
import { JobForm, JobFormData } from './components/Form';
import { useGetJobsQuery, useCreateJobMutation, useUpdateJobMutation, useDeleteJobMutation, Job, useGetJobByIdQuery, JobListParams } from '@/store/api/job';
import { EmptyState } from '@/pages/settings/role/component/EmptyState';
import { JobsList } from './components/List';
import { JobDetailsView } from './components/Details';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/date-time-picker';

export const JobsSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  
  // Pagination and filter states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | undefined>(undefined);
  const [scheduleDueDate, setScheduleDueDate] = useState<Date | undefined>(undefined);

  // Build query params
  const queryParams: JobListParams = {
    skip: page * pageSize,
    limit: pageSize,
    ...(searchQuery && { search: searchQuery }),
    ...(scheduleStartDate && { schedule_start_date: scheduleStartDate.toISOString() }),
    ...(scheduleDueDate && { schedule_due_date: scheduleDueDate.toISOString() }),
  };

  // API hooks
  const { data: jobsData, isLoading, refetch } = useGetJobsQuery(queryParams);
  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();

  // Fetch detailed job data when a job is selected
  const { data: selectedJobDetails, isLoading: isLoadingDetails } = useGetJobByIdQuery(
    selectedJobId!,
    { skip: !selectedJobId }
  );

  const jobs = jobsData || [];

  // Set first job as active when component mounts or when jobs load
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId && viewMode === 'details') {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId, viewMode]);


  const handleJobSelect = (job: Job) => {
    setSelectedJobId(job.id);
    setViewMode('details');
  };

  const handleNewJob = () => {
    setViewMode('new');
    setSelectedJobId(null);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJobId(job.id);
    setViewMode('edit');
  };

  const handleCloseForm = () => {
    if (viewMode === 'new') {
      // When closing new mode, go to details of first job
      if (jobs.length > 0) {
        setSelectedJobId(jobs[0].id);
        setViewMode('details');
      } else {
        setViewMode('list');
      }
    } else if (viewMode === 'edit') {
      // When closing edit mode, go to details of the job being edited
      setViewMode('details');
    }
  };

  const handleSaveJob = async (data: JobFormData) => {
    try {
      const jobPayload = {
        name: data.name,
        job_number: data.job_number,
        project_value: data.project_value,
      };

      if (viewMode === 'new') {
        await createJob(jobPayload).unwrap();
      } else if (selectedJobId) {
        await updateJob({ id: selectedJobId, data: jobPayload }).unwrap();
      }

      refetch();
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedJobId) return;
    
    try {
      await deleteJob(selectedJobId).unwrap();
      refetch();
      
      // After deletion, set first job as active if available
      if (jobs.length > 1) {
        const remainingJobs = jobs.filter(r => r.id !== selectedJobId);
        setSelectedJobId(remainingJobs[0].id);
        setViewMode('details');
      } else {
        setViewMode('list');
        setSelectedJobId(null);
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const renderRightContent = () => {
    // Show empty state when no jobs exist
    if (jobs.length === 0 && viewMode !== 'new') {
      return <EmptyState onNewRole={handleNewJob} />;
    }

    if (viewMode === 'details' && selectedJobDetails) {
      return (
        <JobDetailsView 
          job={selectedJobDetails} 
          onEdit={handleEditJob} 
        />
      );
    }

    if (viewMode === 'new' || viewMode === 'edit') {
      return (
        <JobForm
          mode={viewMode}
          job={selectedJobDetails}
          onBack={handleCloseForm}
          onSave={handleSaveJob}
        />
      );
    }

    return null;
  };

  return (
    <Fragment>
      {/* <PageMenu /> */}
      <Container>
        {/* Search and Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Search Jobs</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by job name, number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Schedule Start Date</label>
            <DateTimePicker
              value={scheduleStartDate}
              onChange={setScheduleStartDate}
              placeholder="Select start date"
            />
          </div>
          
          <div className="min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Schedule Due Date</label>
            <DateTimePicker
              value={scheduleDueDate}
              onChange={setScheduleDueDate}
              placeholder="Select due date"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setScheduleStartDate(undefined);
              setScheduleDueDate(undefined);
              setPage(0);
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="flex h-full gap-6">
          <JobsList
            jobs={jobs}
            selectedJobId={selectedJobId}
            onJobSelect={handleJobSelect}
            onNewJob={handleNewJob}
            isLoading={isLoading}
          />

          {/* Right Content Area */}
          <div className="flex-1 pl-6">
            {renderRightContent()}
          </div>
        </div>
        
        {/* Pagination */}
        {jobs.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, jobs.length)} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={jobs.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Container>
    </Fragment>
  );
};