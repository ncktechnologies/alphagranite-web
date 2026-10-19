import { useMemo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drafting, useDeleteFileMutation } from '@/store/api/job';
import { getFileStage } from '@/utils/file-labeling';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import Popup from '@/components/ui/popup'; // 👈 new import
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import { FileGallery } from '@/pages/jobs/components/FileGallery';

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
  fab?: any;
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
  fab,
}: UploadBoxProps) {
  const { t } = useTranslation();

  // ─── Delete confirmation state ─────────────────────────────────────────────
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  // useMemo to compute files
  const files = useMemo(() => {
    const allFiles: FileMetadata[] = [];

    if (fab) {
      // Helper to convert any file array into FileMetadata[]
      const processFiles = (fileArray: any[], source: string) => {
        if (!fileArray) return [];
        return fileArray.map((file: any) => ({
          id: String(file.id),
          name: file.name || file.filename || `File_${file.id}`,
          size: parseInt(file.file_size) || file.size || 0,
          type: file.file_type || file.mime_type || 'application/octet-stream',
          url: file.file_url || file.url || '/images/app/upload-file.svg',
          stage: getFileStage(file.name || file.filename, { currentStage: source }),
          stage_name: file.stage_name ?? file.stage ?? source,
          file_design: file.file_design ?? undefined,
          uploaded_by_name: file.uploaded_by_name ?? file.uploader_name ?? undefined,
          uploadedBy: file.uploaded_by_name ?? file.uploader_name ?? undefined,
          uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
        }));
      };

      // 1. Drafting files
      if (fab.draft_data?.files) allFiles.push(...processFiles(fab.draft_data.files, 'drafting'));
      // 2. SlabSmith
      if (fab.slabsmith_data?.files) allFiles.push(...processFiles(fab.slabsmith_data.files, 'slab_smith'));
      // 3. SCT
      if (fab.sales_ct_data?.files) allFiles.push(...processFiles(fab.sales_ct_data.files, 'sct'));
      // 4. CNC
      if (fab.cnc_data?.files) allFiles.push(...processFiles(fab.cnc_data.files, 'cnc'));
      // 5. Top-level files
      if (fab.files) allFiles.push(...processFiles(fab.files, 'general'));
      // 6. Operator files
      if (fab.operator_files) allFiles.push(...processFiles(fab.operator_files, 'operator'));
      // 7. Shop revision files (nested)
      if (fab.shop_revisions) {
        fab.shop_revisions.forEach((rev: any) => {
          if (rev.files) allFiles.push(...processFiles(rev.files, 'shop_revision'));
        });
      }
      return allFiles;
    }

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

  const [activeFile, setActiveFile] = useState<FileMetadata | null>(null);

  // Replace the existing handleViewFile (or add it)
  const handleViewFile = useCallback((file: FileMetadata) => {
    setActiveFile(file);
  }, []);
  const handleCloseViewer = useCallback(() => {
    setActiveFile(null);
  }, [])

  // const handleViewFile = useCallback((file: FileMetadata) => {
  //   if (onFileClick) onFileClick(file);
  // }, [onFileClick]);

  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

  // ─── Delete handlers with confirmation ─────────────────────────────────────
  const handleDeleteClick = (fileId: string, fileName: string) => {
    setFileToDelete({ id: fileId, name: fileName });
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFile({ file_id: fileToDelete.id }).unwrap();
      toast.success('File deleted successfully');
      if (onDeleteFile) {
        onDeleteFile(fileToDelete.id);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeleteConfirmationOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
    setFileToDelete(null);
  };

  if (files.length === 0) {
    return (
      <div className="border-none">
        <p className="text-muted-foreground text-sm py-4">{t('FILES.NO_FILES')}</p>
      </div>
    );
  }

  return (
    <div className="border-none">
      <FileGallery
        sources={[{ kind: 'raw', data: files }]}
        showToolbar={false}
        lockLayout
        onFileClick={handleViewFile}
        onDeleteFile={showDeleteButton
          ? (file) => handleDeleteClick(String(file.id), file.name)
          : undefined}
        emptyMessage={t('FILES.NO_FILES')}
      />

      {/* ─── Delete Confirmation Popup ───────────────────────────────────────── */}
      <Popup
        isOpen={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        centered
        className="h-auto"
      >
        <div className="flex justify-end space-x-3 my-3">
          <Button variant="outline" onClick={handleDeleteCancel} className="w-[200px]">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="w-[140px]"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Popup>
      {activeFile && (
        <div className="fixed inset-0 z-50 bg-background overflow-auto">
          <FileViewer file={activeFile} onClose={handleCloseViewer} />
        </div>
      )}
    </div>

  );
}