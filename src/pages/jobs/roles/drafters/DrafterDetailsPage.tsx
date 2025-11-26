import { useCallback, useState, useMemo } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { FileUploadComponent } from './components/FileUploadComponent';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { jobDetails, schedulingNotes } from '../../components/job';
import { ImageInput } from '@/components/image-input';
import { UploadDocuments } from './components/fileUploads';
import { X } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { useUploadImageMutation } from '@/store/api/auth';
import type { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { toast } from 'sonner';
// Import the new drafting API hooks
import { 
  useGetFabByIdQuery, 
  useGetDraftingByFabIdQuery, 
  useSubmitDraftingForReviewMutation,
  useAddFilesToDraftingMutation,
  useGetJobByIdQuery,
  useCreateDraftingMutation
} from '@/store/api/job';
import { SubmitDraftModal } from './components';
import { useSelector } from 'react-redux';
import { useGetEmployeesQuery } from '@/store/api/employee';
import { useGetProfileQuery } from '@/store/api/auth';

const DrafterDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? parseInt(id) : 0;
  
  // Get current user from Redux store
  const currentUser = useSelector((state: any) => state.user.user);
  
  // Use the employee ID directly from the current user if available
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;
  
  // Fetch FAB and job data
  const { data: fabData, isLoading: isFabLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: jobData } = useGetJobByIdQuery(fabData?.job_id || 0, { skip: !fabData?.job_id });
  const { data: draftingData } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  
  // Drafting mutations
  const [submitDraftingForReview] = useSubmitDraftingForReviewMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [createDrafting] = useCreateDraftingMutation();

  type ViewMode = 'activity' | 'file';
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [uploadedFileMap, setUploadedFileMap] = useState<Record<string, UploadedFileMeta>>({});
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [hasEnded, setHasEnded] = useState(false);
  const [resetTimeTracking, setResetTimeTracking] = useState(0);
  const navigate = useNavigate()

  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files) return;

    const retainedEntries: Record<string, UploadedFileMeta> = {};
    files.forEach((fileItem) => {
      if (uploadedFileMap[fileItem.id]) {
        retainedEntries[fileItem.id] = uploadedFileMap[fileItem.id];
      }
    });

    const pendingFiles = files.filter(
      (fileItem) => fileItem.file instanceof File && !retainedEntries[fileItem.id],
    );

    if (pendingFiles.length === 0) {
      setUploadedFileMap(retainedEntries);
      setUploadedFiles(Object.values(retainedEntries));
      return;
    }

    try {
      setIsUploadingDocuments(true);
      const newEntries: Record<string, UploadedFileMeta> = { ...retainedEntries };

      // Only upload files to drafting endpoint, not to general file upload
      // If we have drafting data, add files to drafting
      let currentDraftingData = draftingData;
      
      // If no drafting data exists, create a drafting assignment
      if (!currentDraftingData) {
        try {
          // Make sure we have the current employee ID
          if (!currentEmployeeId) {
            toast.error('Unable to identify drafter. Please refresh the page and try again.');
            setIsUploadingDocuments(false);
            return;
          }
          
          // Use the templating schedule dates for drafting, or default dates if not available
          const startDate = fabData?.templating_schedule_start_date || new Date().toISOString();
          const endDate = fabData?.templating_schedule_due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          const newDrafting = await createDrafting({
            fab_id: fabId,
            drafter_id: currentEmployeeId,
            scheduled_start_date: startDate,
            scheduled_end_date: endDate,
            total_sqft_required_to_draft: fabData?.total_sqft?.toString() || "0"
          }).unwrap();
          
          currentDraftingData = newDrafting;
          toast.success('Drafting assignment created successfully');
        } catch (createError) {
          console.error('Error creating drafting assignment:', createError);
          toast.error('Failed to create drafting assignment. Please try again.');
          setIsUploadingDocuments(false);
          return;
        }
      }

      if (currentDraftingData && currentDraftingData.id) {
        // Extract the actual File objects from file items
        const filesToAdd = pendingFiles.map(f => f.file as File);
        const response = await addFilesToDrafting({
          drafting_id: currentDraftingData.id,
          files: filesToAdd
        }).unwrap();
      
        // Create entries with the file objects themselves since we don't get IDs back
        // We'll use a combination of timestamp and index as temporary IDs
        filesToAdd.forEach((file, index) => {
          const tempId = `draft-${currentDraftingData.id}-${Date.now()}-${index}`;
          newEntries[tempId] = {
            id: tempId,
            name: file.name,
            size: file.size,
            type: file.type,
          };
        });
      }

      setUploadedFileMap(newEntries);
      setUploadedFiles(Object.values(newEntries));
    } catch (error) {
      console.error('Unable to upload files', error);
      toast.error('Failed to upload one or more files. Please try again.');
    } finally {
      setIsUploadingDocuments(false);
    }
  }, [uploadedFileMap, draftingData, addFilesToDrafting, createDrafting, fabId, currentEmployeeId, fabData]);

  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  const handleStartDrafting = () => {
    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
  };

  const handlePauseDrafting = () => {
    setIsPaused(true);
  };

  const handleResumeDrafting = () => {
    setIsPaused(false);
  };

  const handleEndDrafting = () => {
    setIsDrafting(false);
    setIsPaused(false);
    setHasEnded(true);
  };

  const handleSubmitDraft = async (submissionData: any) => {
    try {
      let currentDraftingData = draftingData;
      
      // If no drafting data exists, create a drafting assignment
      if (!currentDraftingData) {
        try {
          // Make sure we have the current employee ID
          if (!currentEmployeeId) {
            toast.error('Unable to identify drafter. Please refresh the page and try again.');
            return;
          }
          
          // Use the templating schedule dates for drafting, or default dates if not available
          const startDate = fabData?.templating_schedule_start_date || new Date().toISOString();
          const endDate = fabData?.templating_schedule_due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          
          const newDrafting = await createDrafting({
            fab_id: fabId,
            drafter_id: currentEmployeeId, // Use the actual current employee ID
            scheduled_start_date: startDate,
            scheduled_end_date: endDate,
            total_sqft_required_to_draft: fabData?.total_sqft?.toString() || "0"
          }).unwrap();
          
          currentDraftingData = newDrafting;
          toast.success('Drafting assignment created successfully');
        } catch (createError) {
          console.error('Error creating drafting assignment:', createError);
          toast.error('Failed to create drafting assignment. Please try again.');
          return;
        }
      }
      
      if (currentDraftingData && currentDraftingData.id) {
        // Submit drafting for review
        await submitDraftingForReview({
          drafting_id: currentDraftingData.id,
          data: {
            // Use actual file IDs from uploaded files
            file_ids: uploadedFiles.map(f => f.id).join(','),
            no_of_piece_drafted: parseInt(submissionData.numberOfPieces) || 0,
            total_sqft_drafted: submissionData.totalSqFt || '0',
            draft_note: submissionData.draftNotes || '',
            mentions: submissionData.assignToSales || '',
            is_completed: true
          }
        }).unwrap();
      
        toast.success('Draft submitted successfully');
      }
      
      setShowSubmissionModal(false);
      setIsDrafting(false);
      setIsPaused(false);
      setTotalTime(0);
      setUploadedFiles([]);
      setHasEnded(false)
      setResetTimeTracking(prev => prev + 1);
      navigate('/job/draft-review')
    } catch (error) {
      console.error('Error submitting draft:', error);
      toast.error('Failed to submit draft. Please try again.');
    }
  };

  // Update sidebar sections with actual FAB data if available
  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "Customer", value: jobData?.name || "Loading..." },
        { label: "Area", value: fabData?.input_area || "Loading..." },
        { label: "Material", value: `${fabData?.stone_type_name || ''} ${fabData?.stone_color_name || ''} - ${fabData?.stone_thickness_value || ''}` },
        { label: "FAB Type", value: fabData?.fab_type || "Loading..." },
        { label: "Assigned to", value: draftingData?.drafter_name || (currentEmployeeId ? "You (Self-assigned)" : "Loading...") },
      ],
    },
    {
      title: "Notes",
      type: "notes",
      notes: fabData?.notes?.map((note: string, index: number) => ({
        id: index,
        avatar: "N",
        content: note,
        author: "System",
        timestamp: "Recent",
      })) || [],
    },
  ];

  // Transform UploadedFileMeta to UploadedFile for the SubmissionModal
  const transformedUploadedFiles = useMemo(() => {
    return uploadedFiles.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type || '', // Provide default empty string if type is undefined
      url: file.url
    }));
  }, [uploadedFiles]);

  if (isFabLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Container className='lg:mx-0'>
        <Toolbar className=' '>
          <ToolbarHeading title={`FAB ID: ${fabData?.id || 'Loading...'}`} description="Update drafting activity" />
        </Toolbar>
      </Container>
      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 ultra:gap-0  items-start lg:flex-shrink-0">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
          <GraySidebar sections={sidebarSections as any} />
        </div>
        <Container className="lg:col-span-9 px-0 mx-0">
          {viewMode === 'file' && activeFile ? (
            <div className="">
              <div className="flex justify-end">
                <Button
                  variant="inverse"
                  size="sm"
                  onClick={() => {
                    setViewMode('activity');
                    setActiveFile(null);
                  }}
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <FileViewer
                file={activeFile}
                onClose={() => {
                  setViewMode('activity');
                  setActiveFile(null);
                }}
              />
            </div>
          ) : (
            <>
              <Card className='my-4'>
                <CardHeader className='flex flex-col items-start py-4'>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-[#4B5563]">
                    Update your drafting activity here
                  </p>
                </CardHeader>
              </Card>

              <Card>
                <CardContent className="">
                  {/* Time Tracking Component */}
                  <TimeTrackingComponent
                    key={resetTimeTracking}
                    isDrafting={isDrafting}
                    isPaused={isPaused}
                    totalTime={totalTime}
                    onStart={handleStartDrafting}
                    onPause={handlePauseDrafting}
                    onResume={handleResumeDrafting}
                    onEnd={handleEndDrafting}
                    onTimeUpdate={setTotalTime}
                    hasEnded={hasEnded}
                  />
                  <Separator className='my-3' />
                  {/* Upload Documents with file viewing support */}
                  <UploadDocuments
                    onFileClick={handleFileClick}
                    onFilesChange={handleFilesChange}
                    simulateUpload={false}
                  />
                  {isUploadingDocuments && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Uploading files, please wait...
                    </p>
                  )}

                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => setShowSubmissionModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isDrafting || totalTime === 0}
                      >
                        Submit draft
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Container>

        {/* Submission Modal */}
        {showSubmissionModal && (
          <SubmissionModal
            jobDetails={jobDetails}
            totalTime={totalTime}
            uploadedFiles={transformedUploadedFiles} // Use transformed files
            onClose={() => setShowSubmissionModal(false)}
            onSubmit={handleSubmitDraft}
          />
        )}
        
      </div>
    </>
  );
};

export { DrafterDetailsPage };