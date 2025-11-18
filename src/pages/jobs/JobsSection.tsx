// components/JobsSection.tsx
import { Fragment, useState, useEffect } from 'react';
import { Container } from '@/components/common/container';
import { PageMenu } from '@/pages/settings/page-menu';
import { ViewMode } from '@/config/types';
import { JobForm, JobFormData } from './components/Form';
import { useGetJobsQuery, useCreateJobMutation, useUpdateJobMutation, useDeleteJobMutation, Job, useGetJobByIdQuery } from '@/store/api/job';
import { EmptyState } from '@/pages/settings/role/component/EmptyState';
import { JobsList } from './components/List';
import { JobDetailsView } from './components/Details';

export const JobsSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // API hooks
  const { data: jobsData, isLoading, refetch } = useGetJobsQuery({ limit: 100 });
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
        account_id: data.account_id,
        description: data.description,
        priority: data.priority,
        start_date: data.start_date,
        due_date: data.due_date,
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
          onDelete={handleDelete}
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
      </Container>
    </Fragment>
  );
};