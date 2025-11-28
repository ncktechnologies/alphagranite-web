// DrafterDetailsPageRefactor.tsx - FIXED VERSION
import React, { useCallback, useState } from 'react';
import { Container } from '@/components/common/container';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useGetFabByIdQuery, useGetDraftingByFabIdQuery, useAddFilesToDraftingMutation } from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';

export function DrafterDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // load fab & drafting (we assume drafting already exists)
  const { data: fabData, isLoading: isFabLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();

  // local UI state
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);

  // start/end timestamps captured from child component
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  // Simplified file state - track files that need to be uploaded
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadedFileMetas, setUploadedFileMetas] = useState<UploadedFileMeta[]>([]);
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Fixed handleFilesChange - REPLACES files instead of accumulating
  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files || files.length === 0) {
      setPendingFiles([]);
      return;
    }

    console.log('New files selected:', files);

    // Filter to only actual File objects
    const validFiles = files.filter((fileItem) => fileItem.file instanceof File);
    
    if (validFiles.length === 0) {
      console.log('No valid files to process');
      setPendingFiles([]);
      return;
    }

    // Extract the File objects
    const fileObjects = validFiles.map(f => f.file as File);
    
    // REPLACE the pending files (don't accumulate)
    setPendingFiles(fileObjects);

    // Create file metas for display
    const newFileMetas: UploadedFileMeta[] = fileObjects.map((file, index) => ({
      id: `pending-${Date.now()}-${index}`, // Temporary ID
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setUploadedFileMetas(newFileMetas);
    
    console.log('Set pending files:', fileObjects.length);
    console.log('File names:', fileObjects.map(f => f.name));

  }, []); // Removed dependencies since we're replacing, not accumulating

  // Upload files when needed (like when opening submission modal)
  const uploadPendingFiles = useCallback(async () => {
    if (pendingFiles.length === 0 || !draftingData?.id) {
      return [];
    }

    try {
      setIsUploadingDocuments(true);
      console.log('Uploading pending files:', pendingFiles);

      const response = await addFilesToDrafting({
        drafting_id: draftingData.id,
        files: pendingFiles
      }).unwrap();

      console.log('File upload response:', response);

      let uploadedIds: number[] = [];
      if (response?.data && Array.isArray(response.data)) {
        uploadedIds = response.data.map((file: any) => file.id);
        
        // Update file metas with real IDs
        const updatedMetas = response.data.map((fileData: any, index: number) => ({
          id: fileData.id,
          name: fileData.name || pendingFiles[index].name,
          size: fileData.size || pendingFiles[index].size,
          type: fileData.type || pendingFiles[index].type,
        }));
        
        setUploadedFileMetas(updatedMetas);
      }

      // Clear pending files after successful upload
      setPendingFiles([]);
      return uploadedIds;

    } catch (error) {
      console.error('Failed to upload files:', error);
      toast.error('Failed to upload files');
      throw error;
    } finally {
      setIsUploadingDocuments(false);
    }
  }, [pendingFiles, draftingData, addFilesToDrafting]);

  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Time tracking handlers
  const handleStart = (startDate: Date) => {
    setIsDrafting(true);
    setIsPaused(false);
    setHasEnded(false);
    setDraftStart(startDate);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleEnd = (endDate: Date) => {
    setIsDrafting(false);
    setIsPaused(false);
    setHasEnded(true);
    setDraftEnd(endDate);
  };

  const canOpenSubmit = !isDrafting && totalTime > 0 && (pendingFiles.length > 0 || uploadedFileMetas.length > 0);

  // Modified to handle file upload before showing modal
  const handleOpenSubmissionModal = async () => {
    try {
      // Upload any pending files first
      if (pendingFiles.length > 0) {
        await uploadPendingFiles();
      }
      setShowSubmissionModal(true);
    } catch (error) {
      console.error('Failed to prepare files for submission:', error);
      // Don't open modal if file upload fails
    }
  };

  const onSubmitModal = async (payload: any) => {
    try {
      await refetchDrafting();
      setShowSubmissionModal(false);
      setPendingFiles([]);
      setUploadedFileMetas([]);
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      navigate('/job/draft');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  if (isFabLoading || isDraftingLoading) return <div>Loading...</div>;
  
  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
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
        author: "",
        timestamp: "",
      })) || [],
    },
  ];

  // Prepare files for SubmissionModal
  const filesForSubmission = uploadedFileMetas.map(meta => {
    const file = pendingFiles.find(f => f.name === meta.name);
    return {
      id: meta.id,
      name: meta.name,
      url: meta.url,
      file: file || undefined
    };
  });

  return (
    <>
      <Container className='lg:mx-0'>
        <div className='py-4'>
          <h2 className='text-lg font-semibold'>FAB ID: {fabData?.id || 'Loading...'}</h2>
          <p className='text-sm text-muted-foreground'>Update drafting activity</p>
        </div>
      </Container>

      <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        <div className="lg:col-span-3 w-full lg:w-[200px]  2xl:w-[286px]  ultra:w-[500px]" >
          <GraySidebar sections={sidebarSections as any} />
        </div>
        <Container className="lg:col-span-9 px-0 mx-0">
          {viewMode === 'file' && activeFile ? (
            <div>
              <div className="flex justify-end">
                <Button variant="inverse" size="sm" onClick={() => { setViewMode('activity'); setActiveFile(null); }}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <FileViewer file={activeFile} onClose={() => { setActiveFile(null); setViewMode('activity'); }} />
            </div>
          ) : (
            <>
              <Card className='my-4'>
                <CardHeader className='flex flex-col items-start py-4'>
                  <CardTitle>Drafting activity</CardTitle>
                  <p className="text-sm text-[#4B5563]">Update your drafting activity here</p>
                </CardHeader>
              </Card>

              <Card>
                <CardContent>
                  <TimeTrackingComponent
                    isDrafting={isDrafting}
                    isPaused={isPaused}
                    totalTime={totalTime}
                    onStart={handleStart}
                    onPause={handlePause}
                    onResume={handleResume}
                    onEnd={handleEnd}
                    onTimeUpdate={setTotalTime}
                    hasEnded={hasEnded}
                  />

                  <Separator className="my-3" />

                  <UploadDocuments
                    onFileClick={handleFileClick}
                    onFilesChange={handleFilesChange}
                    simulateUpload={false}
                  />

                 

                  {/* Submit Button */}
                  {viewMode === 'activity' && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleOpenSubmissionModal}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isDrafting || totalTime === 0 || (pendingFiles.length === 0 && uploadedFileMetas.length === 0)}
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

        {showSubmissionModal && (
          <SubmissionModal
            open={showSubmissionModal}
            onClose={(success?: boolean) => {
              setShowSubmissionModal(false);
              if (success) onSubmitModal({});
            }}
            drafting={draftingData}
            uploadedFiles={filesForSubmission}
            draftStart={draftStart}
            draftEnd={draftEnd}
            fabId={fabId}
            userId={currentEmployeeId}
            fabData={fabData}
          />
        )}
      </div>
    </>
  );
}

export default DrafterDetailsPage;