import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/hooks/use-file-upload';
import {
  FileArchiveIcon,
  FileTextIcon,
  HeadphonesIcon,
  VideoIcon,
  X,
} from 'lucide-react';
import { Drafting } from '@/store/api/job';
import { Can } from '@/components/permission';
import { getFileStage, getStageBadge, WORKFLOW_STAGES } from '@/utils/file-labeling';

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  stage?: any; // FileLabel from file-labeling utils
  uploadedBy?: string;
  uploadedAt?: Date;
}

interface UploadBoxProps {
  onFileClick?: (file: FileMetadata) => void;
  draftingData?: Drafting;
  onDeleteFile?: (fileId: string) => void;
  draftingId?: number;
  uploadedFileMetas?: any[];
  currentStage?: string; // Current workflow stage for context
}

// Helper function to compare if two objects have the same files data
const areFilesEqual = (files1: any[], files2: any[]) => {
  if (files1.length !== files2.length) return false;
  return files1.every((file, index) => 
    file.id === files2[index]?.id && 
    file.name === files2[index]?.name
  );
};

export function Documents({ 
  onFileClick, 
  draftingData, 
  onDeleteFile, 
  draftingId, 
  uploadedFileMetas = []
}: UploadBoxProps) {
  // Use useMemo to compute files instead of useState/useEffect
  const files = useMemo(() => {
    const allFiles: FileMetadata[] = [];
    
    // Extract files from draftingData
    if (draftingData) {
      if (draftingData.files && Array.isArray(draftingData.files) && draftingData.files.length > 0) {
        try {
          const actualFiles = draftingData.files.map((file: any) => ({
            id: String(file.id),
            name: file.name || `File_${file.id}`,
            size: parseInt(file.file_size) || 0,
            type: file.file_type || 'application/octet-stream',
            url: file.file_url || '/images/app/upload-file.svg',
            stage: getFileStage(file.name, { isDrafting: true }),
            uploadedBy: '',
            uploadedAt: file.created_at ? new Date(file.created_at) : new Date()
          }));
          allFiles.push(...actualFiles);
        } catch (error) {
          console.error('Error processing files array:', error);
        }
      }
      // Fallback to file_ids string
      else if (draftingData.file_ids) {
        try {
          const fileIdsArray = draftingData.file_ids.split(',').filter(id => id.trim() !== '');
          const mockFiles = fileIdsArray.map((id, index) => ({
            id: id.trim(),
            name: `Drafting_File_${index + 1}.pdf`,
            size: 1024000 + index * 512000,
            type: 'application/pdf',
            url: '/images/app/upload-file.svg',
            stage: WORKFLOW_STAGES.drafting,
            uploadedBy: '',
            uploadedAt: new Date()
          }));
          allFiles.push(...mockFiles);
        } catch (error) {
          console.error('Error parsing file_ids:', error);
        }
      }
    }
    
    // Add newly uploaded files
    if (uploadedFileMetas && uploadedFileMetas.length > 0) {
      const newFiles = uploadedFileMetas.map((meta: any) => ({
        id: String(meta.id),
        name: meta.name || `File_${meta.id}`,
        size: meta.size || 0,
        type: meta.type || 'application/octet-stream',
        url: meta.url || (meta.file ? URL.createObjectURL(meta.file) : '/images/app/upload-file.svg'),
        stage: meta.stage || getFileStage(meta.name, { isDrafting: true }),
        uploadedBy: meta.uploadedBy || 'Current User',
        uploadedAt: meta.uploadedAt || new Date()
      }));
      allFiles.push(...newFiles);
    }
    
    return allFiles;
  }, [draftingData, uploadedFileMetas]); // Only recompute when these change

  const getFileIcon = useCallback((file: FileMetadata) => {
    const { type } = file;
    if (type.startsWith('image/')) return <img src="/images/app/img.svg" alt="Image" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <img src="/images/app/pdf.svg" alt="PDF" />;
    if (type.includes('word') || type.includes('doc')) return <img src="/images/app/doc.svg" alt="Document" />;
    if (type.includes('excel') || type.includes('sheet')) return <img src="/images/app/doc.svg" alt="Spreadsheet" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  }, []);

  const handleViewFile = useCallback((file: FileMetadata) => {
    if (onFileClick) onFileClick(file);
  }, [onFileClick]);

  // If no files, show a message
  if (files.length === 0) {
    return (
      <div className="border-none">
        <p className="text-muted-foreground text-sm py-4">No files uploaded by the drafter</p>
      </div>
    );
  }

  return (
    <div className="border-none">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'relative rounded-lg border p-4 transition-colors border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 flex items-center justify-center rounded">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-black font-bold truncate">{file.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                      {(() => {
                        const stage = file.stage || getFileStage(file.name, { isDrafting: true });
                        const badge = getStageBadge(stage);
                        return (
                          <span className={badge.className}>
                            {badge.label}
                          </span>
                        );
                      })()}
                                             
                      {/* Additional file metadata if available */}
                      {file.uploadedBy && (
                        <span className="text-xs text-gray-500">
                          by {file.uploadedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDeleteFile && draftingId) {
                      onDeleteFile(file.id);
                    }
                  }}
                  disabled={!onDeleteFile || !draftingId}
                >
                  {onDeleteFile && draftingId ? (
                    <Can action="delete" on="Drafting">
                      <X className="size-3" />
                    </Can>
                  ) : (
                    <X className="size-3 opacity-30" />
                  )}
                </Button>
              </div>

              <div>
                <Button
                  onClick={() => handleViewFile(file)}
                  variant="inverse"
                  size="sm"
                  className="text-sm font-semibold text-center text-primary underline absolute bottom-3 right-3"
                >
                  View File
                </Button>
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}