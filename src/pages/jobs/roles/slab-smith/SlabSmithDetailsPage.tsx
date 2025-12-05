// DrafterDetailsPageRefactor.tsx - FIXED VERSION
import React, { useCallback, useState } from 'react';
import { Container } from '@/components/common/container';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { 
  useGetFabByIdQuery, 
  useGetDraftingByFabIdQuery, 
  useGetSlabSmithByFabIdQuery,
  useCreateSlabSmithMutation,
  useAddFilesToSlabSmithMutation
} from '@/store/api/job';
import { TimeTrackingComponent } from './components/TimeTrackingComponent';
import { UploadDocuments } from './components/fileUploads';
import { FileViewer } from './components/FileViewer';
import { SubmissionModal } from './components/SubmissionModal';
import { useSelector } from 'react-redux';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { UploadedFileMeta } from '@/types/uploads';
import { X } from 'lucide-react';

export function SlabSmithDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentEmployeeId = currentUser?.employee_id || currentUser?.id;

  // load fab & drafting (we assume drafting already exists)
  const { data: fabData, isLoading: isFabLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });
  const { data: draftingData, isLoading: isDraftingLoading, refetch: refetchDrafting } = useGetDraftingByFabIdQuery(fabId, { skip: !fabId });
  const { data: slabSmithData, isLoading: isSlabSmithLoading } = useGetSlabSmithByFabIdQuery(fabId, { skip: !fabId });
  const [createSlabSmith] = useCreateSlabSmithMutation();
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();

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
    if (pendingFiles.length === 0) {
      return [];
    }

    // Ensure slab smith entry exists
    let slabSmithId = slabSmithData?.id;
    if (!slabSmithId) {
      try {
        const result = await createSlabSmith({
          fab_id: fabId,
          slab_smith_type: 'standard',
          drafter_id: currentEmployeeId,
          start_date: new Date().toISOString()
        }).unwrap();
        slabSmithId = result.data?.id;
      } catch (error) {
        console.error('Failed to create slab smith entry:', error);
        toast.error('Failed to initialize slab smith work');
        throw error;
      }
    }

    if (!slabSmithId) {
      throw new Error('No slab smith ID available');
    }

    try {
      setIsUploadingDocuments(true);
      console.log('Uploading pending files:', pendingFiles);

      const response = await addFilesToSlabSmith({
        slabsmith_id: slabSmithId,
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
  }, [pendingFiles, slabSmithData, fabId, currentEmployeeId, createSlabSmith, addFilesToSlabSmith]);

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
      navigate('/job/slab-smith');
    } catch (err) {
      console.error(err);
      toast.error('Failed to finalize submission flow');
    }
  };

  if (isFabLoading || isDraftingLoading || isSlabSmithLoading) return <div>Loading...</div>;
  
  const sidebarSections = [
    {
      title: "Job Details",
      type: "details",
      items: [
        { label: "FAB ID", value: fabData?.id ? `FAB-${fabData.id}` : "N/A" },
        { label: "FAB Type", value: fabData?.fab_type || "N/A" },
        { label: "Account ID", value: fabData?.job_details?.account_id?.toString() || "N/A" },
        { label: "Job name", value: fabData?.job_details?.name || "N/A" },
        { label: "Job #", value: fabData?.job_details?.job_number || "N/A" },
        { label: "Area (s)", value: fabData?.input_area || "N/A" },
        { label: "Stone type", value: fabData?.stone_type_name || "N/A" },
        { label: "Stone colour", value: fabData?.stone_color_name || "N/A" },
        { label: "Stone thickness", value: fabData?.stone_thickness_value || "N/A" },
        { label: "Edge", value: fabData?.edge_name || "N/A" },
        { label: "Total square ft", value: fabData?.total_sqft || "N/A" },
      ],
    },
    {
      title: "",
      sectionTitle: "Slab Smith notes",
      type: "notes",
      notes: [
        {
          id: 1,
          avatar: "MR",
          content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
          author: "Mike Rodriguez",
          timestamp: "Oct 3, 2025",
        },
      ],
    },
  ];

  if (viewMode === 'file' && activeFile) {
    return (
      <Container className="lg:mx-0">
        <div className="flex justify-end mb-4">
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
      </Container>
    );
  }

  return (
    <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
      <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
        <GraySidebar sections={sidebarSections as any} className='' />
      </div>
      
      <Container className="lg:col-span-9">
        <div className="pt-6">
          <div className="flex justify-between items-start">
            <div className="text-black">
              <p className="font-bold text-base">FAB-{fabData?.id || 'N/A'}</p>
              <p className="text-sm">{fabData?.job_details?.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

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
          </CardContent>
        </Card>

        <Separator className="my-6" />

        <UploadDocuments
          onFilesChange={handleFilesChange}
          onFileClick={handleFileClick}
          slabSmithId={slabSmithData?.id}
        />

        <Separator className="my-6" />

        <div className="flex justify-end mb-10">
          <Button
            onClick={handleOpenSubmissionModal}
            disabled={!canOpenSubmit}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            Submit Slab Smith Work
          </Button>
        </div>

        <SubmissionModal
          open={showSubmissionModal}
          onClose={(success?: boolean) => {
            setShowSubmissionModal(false);
            if (success) {
              onSubmitModal({});
            }
          }}
          drafting={slabSmithData}
          uploadedFiles={uploadedFileMetas.map(meta => ({ ...meta, file: pendingFiles.find(f => f.name === meta.name) }))}
          draftStart={draftStart}
          draftEnd={draftEnd}
          fabId={fabId}
          userId={currentEmployeeId}
          fabData={fabData}
          slabSmithId={slabSmithData?.id}
        />
      </Container>
    </div>
  );
}