import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/hooks/use-file-upload';
import {
  FileArchiveIcon,
  FileTextIcon,
  HeadphonesIcon,
  VideoIcon,
  X,
  Eye,
} from 'lucide-react';
import { Drafting, useDeleteFileMutation } from '@/store/api/job';
import {
  getFileStage,
  getStageBadge,
  normalizeStageKey,
  WORKFLOW_STAGES,
} from '@/utils/file-labeling';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';

// Helper function to convert file_design value to label
const getFileDesignLabel = (value: string): string => {
  const designMap: Record<string, string> = {
    block_drawing: 'Block Drawing',
    layout: 'Layout',
    ss_layout: 'SS Layout',
    shop_drawing: 'Shop Drawing',
    photo_media: 'Photo / Media',
  };
  return designMap[value] || value;
};

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  stage?: any;
  stage_name?: string;
  file_design?: string;
  uploaded_by_name?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
}

interface UploadBoxProps {
  onFileClick?: (file: FileMetadata) => void;
  draftingData?: Drafting;
  onDeleteFile?: (fileId: string) => void;
  draftingId?: number;
  uploadedFileMetas?: any[];
  currentStage?: string;
  slabsmithData?: any;
  sctData?: any;
  cncData?: any;
  showDeleteButton?: boolean;
}

// ─── Resolve stage label + className (mirrors FileGallery) ───────────────────
function resolveStage(file: FileMetadata): { label: string; className: string } {
  // 1. Get raw stage from backend (stage_name > stage > fallback)
  const rawStage = file.stage_name || file.stage || 'general';

  // 2. Normalise to match WORKFLOW_STAGES keys (e.g. "CNC" → "cnc", "Cut List" → "cut_list")
  const normalisedKey = normalizeStageKey(rawStage);

  // 3. Try to find exact match in WORKFLOW_STAGES
  let stageObj = WORKFLOW_STAGES[normalisedKey];

  // 4. If not found, use filename-based detection (pass normalised key as currentStage hint)
  if (!stageObj) {
    stageObj = getFileStage(file.name, { currentStage: normalisedKey });
  }

  // 5. Get badge (safe against undefined)
  const badge = getStageBadge(stageObj);

  // 6. Return label (use rawStage for display if badge label is fallback)
  return {
    label: badge.label === 'Unknown' ? rawStage.replace(/_/g, ' ') : badge.label,
    className: badge.className,
  };
}

export function Documents({
  onFileClick,
  draftingData,
  onDeleteFile,
  draftingId,
  uploadedFileMetas = [],
  currentStage,
  slabsmithData,
  sctData,
  cncData,
  showDeleteButton = true,
}: UploadBoxProps) {
  const { t } = useTranslation();

  // useMemo to compute files
  const files = useMemo(() => {
    const allFiles: FileMetadata[] = [];

    // Drafting files
    if (draftingData) {
      if (draftingData.files && Array.isArray(draftingData.files) && draftingData.files.length > 0) {
        try {
          const actualFiles = draftingData.files.map((file: any) => ({
            id: String(file.id),
            name: file.filename || file.name || `File_${file.id}`,
            size: parseInt(file.file_size) || parseInt(file.size) || 0,
            type: file.file_type || file.mime_type || 'application/octet-stream',
            url: file.file_url || file.url || '/images/app/upload-file.svg',
            stage: getFileStage(file.filename || file.name, {
              isDrafting: true,
              currentStage: currentStage,
            }),
            stage_name: file.stage_name ?? file.stage ?? getFileStage(file.filename || file.name, {
              isDrafting: true,
              currentStage: currentStage,
            }).stage,
            file_design: file.file_design ?? undefined,
            uploaded_by_name: file.uploaded_by_name ?? file.uploader_name,
            uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? '',
            uploadedAt: file.created_at || file.uploaded_at ? new Date(file.created_at || file.uploaded_at) : new Date(),
          }));
          allFiles.push(...actualFiles);
        } catch (error) {
          console.error('Error processing files array:', error);
        }
      }
    }

    // Uploaded files
    if (uploadedFileMetas && uploadedFileMetas.length > 0) {
      const newFiles = uploadedFileMetas.map((meta: any) => ({
        id: String(meta.id),
        name: meta.name || `File_${meta.id}`,
        size: meta.size || 0,
        type: meta.type || 'application/octet-stream',
        url: meta.url || (meta.file ? URL.createObjectURL(meta.file) : '/images/app/upload-file.svg'),
        stage: meta.stage || getFileStage(meta.name, { isDrafting: true }),
        stage_name: meta.stage_name ?? currentStage ?? undefined,
        file_design: meta.file_design ?? undefined,
        uploaded_by_name: meta.uploaded_by_name ?? meta.uploadedBy ?? 'Current User',
        uploadedBy: meta.uploaded_by_name ?? meta.uploadedBy ?? 'Current User',
        uploadedAt: meta.uploadedAt || new Date(),
      }));
      allFiles.push(...newFiles);
    }

    // SlabSmith files
    if (slabsmithData) {
      if (slabsmithData.files && Array.isArray(slabsmithData.files) && slabsmithData.files.length > 0) {
        try {
          const slabSmithFiles = slabsmithData.files.map((file: any) => ({
            id: String(file.id),
            name: file.name || `SlabSmith_File_${file.id}`,
            size: parseInt(file.file_size) || 0,
            type: file.file_type || 'application/octet-stream',
            url: file.file_url || '/images/app/upload-file.svg',
            stage: getFileStage(file.name, {
              isDrafting: false,
              currentStage: 'slab_smith',
            }),
            stage_name: file.stage_name ?? file.stage ?? 'slab_smith',
            file_design: file.file_design ?? undefined,
            uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
          }));
          allFiles.push(...slabSmithFiles);
        } catch (error) {
          console.error('Error processing SlabSmith files array:', error);
        }
      }
    }

    // SCT files
    if (sctData) {
      if (sctData.files && Array.isArray(sctData.files) && sctData.files.length > 0) {
        try {
          const sctFiles = sctData.files.map((file: any) => ({
            id: String(file.id),
            name: file.name || `SCT_File_${file.id}`,
            size: parseInt(file.file_size) || 0,
            type: file.file_type || 'application/octet-stream',
            url: file.file_url || '/images/app/upload-file.svg',
            stage: getFileStage(file.name, {
              isDrafting: false,
              currentStage: 'sct',
            }),
            stage_name: file.stage_name ?? file.stage ?? 'sct',
            file_design: file.file_design ?? undefined,
            uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
          }));
          allFiles.push(...sctFiles);
        } catch (error) {
          console.error('Error processing SCT files array:', error);
        }
      }
    }

    // CNC files
    if (cncData) {
      if (cncData.files && Array.isArray(cncData.files) && cncData.files.length > 0) {
        try {
          const cncFiles = cncData.files.map((file: any) => ({
            id: String(file.id),
            name: file.name || `CNC_File_${file.id}`,
            size: parseInt(file.file_size) || 0,
            type: file.file_type || 'application/octet-stream',
            url: file.file_url || '/images/app/upload-file.svg',
            stage: getFileStage(file.name, {
              isDrafting: false,
              currentStage: 'cnc',
            }),
            stage_name: file.stage_name ?? file.stage ?? 'cnc',
            file_design: file.file_design ?? undefined,
            uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? '-',
            uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
          }));
          allFiles.push(...cncFiles);
        } catch (error) {
          console.error('Error processing CNC files array:', error);
        }
      }
    }

    return allFiles;
  }, [draftingData, uploadedFileMetas, currentStage, slabsmithData, sctData, cncData]);

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

  const [deleteFile] = useDeleteFileMutation();

  const handleDeleteInternal = useCallback(async (fileId: string) => {
    try {
      await deleteFile({ file_id: fileId }).unwrap();
      toast.success('File deleted successfully');
      if (onDeleteFile) {
        onDeleteFile(fileId);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }, [deleteFile, onDeleteFile]);

  if (files.length === 0) {
    return (
      <div className="border-none">
        <p className="text-muted-foreground text-sm py-4">{t('FILES.NO_FILES')}</p>
      </div>
    );
  }

  return (
    <div className="border-none">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => {
          const { label: stageLabel, className: stageCls } = resolveStage(file);
          return (
            <div
              key={file.id}
              className={cn(
                'relative rounded-lg border p-4 transition-colors border-muted-foreground/25 hover:border-muted-foreground/50 bg-white'
              )}
            >
              {/* Delete button - absolutely positioned top-right */}
              {showDeleteButton && (
                <button
                  className="absolute top-4 right-4 size-6 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-md hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteInternal(file.id);
                  }}
                  title="Delete file"
                >
                  <X className="size-3" />
                </button>
              )}

              {/* Content - no longer includes delete button in flow */}
              <div className="flex flex-col items-center gap-3 mb-3">
                <div className="size-8 flex items-center justify-center rounded">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0 w-full text-left">
                  <p className="text-[14px] text-black font-bold truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex flex-wrap justify-start items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                    <span className={cn('w-fit', stageCls)}>{stageLabel}</span>
                    {file.file_design && (
                      <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">
                        {getFileDesignLabel(file.file_design)}
                      </span>
                    )}
                    {file.uploaded_by_name && (
                      <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-0.5 rounded">
                        {file.uploaded_by_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View button at bottom */}
              <div className="flex justify-start">
                <Button
                  onClick={() => handleViewFile(file)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="View file"
                >
                  <Eye className="w-4 h-4 text-blue-500" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}