import React, { useState } from 'react';
import { UniversalUploadModal } from '@/components/universal-upload';
import { FileList, UploadedFileMeta } from '@/components/file-list';
import { 
  useAddFilesToDraftingMutation, 
  useDeleteFileFromDraftingMutation 
} from '@/store/api/job';

interface JobDetails {
  fabId: string;
  customer: string;
  jobNumber: string;
  area: string;
  fabType: string;
  slabSmithUsed: boolean;
}

interface SchedulingNote {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface FileUploadComponentProps {
  draftingId?: number;
  jobDetails?: JobDetails;
  schedulingNotes?: SchedulingNote[];
  onOpenFile?: (file: UploadedFileMeta) => void;
  onFilesChange?: (files: File[]) => void;
  existingFiles?: UploadedFileMeta[];
}

/**
 * Drafting File Upload Component
 * Uses UniversalUploadModal with "+" button and file list display
 */
export const FileUploadComponent = ({
  draftingId,
  jobDetails,
  schedulingNotes,
  onOpenFile,
  onFilesChange,
  existingFiles = [],
}: FileUploadComponentProps) => {
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();
  const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
  const [localFiles, setLocalFiles] = useState<UploadedFileMeta[]>(existingFiles);

  const stages = [
    { value: 'drafting' },
    { value: 'pre_draft_review' },
    { value: 'revision' },
  ];

  const fileTypes = [
    { value: 'block_drawing' },
    { value: 'layout' },
    { value: 'ss_layout' },
    { value: 'shop_drawing' },
  ];

  // Handle file deletion
  const handleDeleteFile = async (fileId: string | number) => {
    if (!draftingId) {
      throw new Error('Drafting ID is required');
    }
    
    await deleteFileFromDrafting({
      drafting_id: draftingId,
      file_id: String(fileId),
    }).unwrap();
    
    // Remove from local state
    setLocalFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Handle file viewing
  const handleViewFile = (file: UploadedFileMeta) => {
    if (onOpenFile) {
      onOpenFile(file);
    } else if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    // Trigger parent callback if provided
    onFilesChange?.([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Button + Modal */}
      <UniversalUploadModal
        title="Upload Drafting Files"
        entityId={draftingId}
        uploadMutation={addFilesToDrafting}
        stages={stages}
        fileTypes={fileTypes}
        additionalParams={{
          drafting_id: draftingId,
          stage_name: 'drafting',
        }}
        onUploadComplete={handleUploadComplete}
        showExistingFiles={false}
        existingFiles={localFiles}
        onDeleteFile={handleDeleteFile}
        onViewFile={handleViewFile}
      />
      
      {/* File List Display */}
      {localFiles.length > 0 && (
        <FileList
          files={localFiles}
          onViewFile={handleViewFile}
          onDeleteFile={handleDeleteFile}
        />
      )}
    </div>
  );
};
