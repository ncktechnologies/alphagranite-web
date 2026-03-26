import React, { useState } from 'react';
import { UniversalUploadModal } from '@/components/universal-upload';
import { FileList, UploadedFileMeta } from '@/components/file-list';
import { 
  useAddFilesToDraftingMutation, 
  useDeleteFileFromDraftingMutation 
} from '@/store/api/job';

interface UploadBoxProps {
  maxSize?: number;
  accept?: string;
  className?: string;
  onFileClick?: (file: any) => void;
  disabled?: boolean;
  enhancedFiles?: any[];
  draftingId?: number;
  refetchFiles?: () => void;
  stage?: string;
  fileDesign?: string;
  onUploadComplete?: () => void;
  existingFiles?: UploadedFileMeta[];
}

/**
 * Drafting Upload Documents Component
 * Uses UniversalUploadModal with "+" button and file list display
 */
export function UploadDocuments({
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  onFileClick,
  disabled = false,
  enhancedFiles = [],
  draftingId,
  stage,
  fileDesign,
  refetchFiles,
  onUploadComplete,
  existingFiles = [],
}: UploadBoxProps) {
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
    if (onFileClick) {
      onFileClick(file);
    } else if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  // Handle upload complete
  const handleUploadComplete = () => {
    refetchFiles?.();
    onUploadComplete?.();
  };

  return (
    <div className="space-y-4">
      {/* Upload Button + Modal */}
      <UniversalUploadModal
        title="Upload Drafting Documents"
        entityId={draftingId}
        uploadMutation={addFilesToDrafting}
        stages={stages}
        fileTypes={fileTypes}
        additionalParams={{
          drafting_id: draftingId,
          stage_name: stage,
          file_design: fileDesign,
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
}
