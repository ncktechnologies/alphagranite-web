// DrafterDetailsPageRefactor.tsx
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

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadedFileObjects, setUploadedFileObjects] = useState<Record<string, File>>({}); // Store actual File objects as a map
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [uploadedFileMap, setUploadedFileMap] = useState<Record<string, UploadedFileMeta>>({});
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const handleFilesChange = useCallback(async (files: FileWithPreview[]) => {
    if (!files) return;

    console.log('Files received:', files);
    console.log('Current uploadedFileMap:', uploadedFileMap);

    // Filter to only actual File objects
    const validFiles = files.filter(
      (fileItem) => fileItem.file instanceof File,
    );
    console.log('Valid files:', validFiles);

    if (validFiles.length === 0) {
      console.log('No valid files to process');
      return;
    }

    try {
      setIsUploadingDocuments(true);

      // Start with existing entries
      const updatedEntries: Record<string, UploadedFileMeta> = { ...uploadedFileMap };
      const newFileObjects: File[] = []; // Collect new file objects
      const newFileMap: Record<string, File> = {}; // Map file IDs to File objects

      // Only upload files to drafting endpoint, not to general file upload
      // If we have drafting data, add files to drafting
      let currentDraftingData = draftingData;
      console.log('Current drafting data:', currentDraftingData);

      // Check if we have valid drafting data with an ID
      if (currentDraftingData && currentDraftingData.id) {
        // Extract the actual File objects from file items
        const filesToAdd = validFiles.map(f => f.file as File);

        // Store file objects for later use in submission
        newFileObjects.push(...filesToAdd);

        // Upload files to drafting with proper format
        const response = await addFilesToDrafting({
          drafting_id: currentDraftingData.id,
          files: filesToAdd
        }).unwrap();

        // Extract file IDs from the response and create entries
        if (response && response.data && Array.isArray(response.data)) {
          response.data.forEach((fileData: any, index: number) => {
            if (fileData.id) {
              const tempId = `draft-${currentDraftingData.id}-${fileData.id}`;
              updatedEntries[tempId] = {
                id: fileData.id, // Use actual file ID from server
                name: fileData.name || filesToAdd[index].name,
                size: fileData.size || filesToAdd[index].size,
                type: fileData.type || filesToAdd[index].type,
              };
              // Map the file ID to the File object
              newFileMap[fileData.id] = filesToAdd[index];
            }
          });
        }

        console.log('Updated entries after upload:', updatedEntries);
      } else {
        // If no drafting data, just track the files locally without uploading
        validFiles.forEach((fileItem, index) => {
          const file = fileItem.file as File;
          const tempId = `local-${Date.now()}-${index}`;
          updatedEntries[tempId] = {
            id: tempId,
            name: file.name,
            size: file.size,
            type: file.type,
          };
          // Store file objects for later use in submission
          newFileObjects.push(file);
          // Map the file ID to the File object
          newFileMap[tempId] = file;
        });
        console.log('Tracked files locally (no drafting data):', updatedEntries);
      }

      // Update state with all entries (both existing and new)
      setUploadedFileMap(updatedEntries);
      setUploadedFiles(Object.values(updatedEntries));
      // Update the file objects map with new entries
      setUploadedFileObjects(prev => ({ ...prev, ...newFileMap }));
      console.log('Final uploaded files count:', Object.values(updatedEntries).length);
    } catch (error) {
      console.error('Unable to upload files', error);
      toast.error('Failed to upload one or more files. Please try again.');
    } finally {
      setIsUploadingDocuments(false);
    }
  }, [uploadedFileMap, draftingData, addFilesToDrafting, fabId, fabData]);
  const handleFileClick = (file: any) => {
    setActiveFile(file);
    setViewMode('file');
  };

  // Time tracking handlers — these get Date objects from TimeTrackingComponent
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

  const canOpenSubmit = !isDrafting && totalTime > 0 && uploadedFiles.length > 0;

  const onSubmitModal = async (payload: any) => {
    // After SubmissionModal calls updateDrafting successfully it will call onClose(true)
    // We can refresh drafting and navigate to review page
    try {
      await refetchDrafting();
      setShowSubmissionModal(false);
      setUploadedFiles([]);
      setTotalTime(0);
      setDraftStart(null);
      setDraftEnd(null);
      // toast.success('Draft submitted — redirecting to draft review');
      navigate('/job/draft');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  if (isFabLoading || isDraftingLoading) return <div>Loading...</div>;
  const sidebarSections =
    [
      {
        title: "Job Details",
        type: "details",
        items: [
          // { label: "Customer", value: jobData?.name || "Loading..." },
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

        {showSubmissionModal && (
          <SubmissionModal
            open={showSubmissionModal}
            onClose={(success?: boolean) => {
              setShowSubmissionModal(false);
              if (success) onSubmitModal({});
            }}
            drafting={draftingData}
            uploadedFiles={uploadedFiles.map((file) => ({
              ...file,
              file: uploadedFileObjects[file.id]
            }))}
            draftStart={draftStart}
            draftEnd={draftEnd}
          />
        )}
      </div>
    </>
  );
}

export default DrafterDetailsPage;
