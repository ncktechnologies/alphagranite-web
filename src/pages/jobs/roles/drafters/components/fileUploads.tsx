import { useEffect, useState } from 'react';
import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAddFilesToDraftingMutation, useDeleteFileFromDraftingMutation } from '@/store/api/job';
import { toast } from 'sonner';
import {
  Check,
  CloudUpload,
  Download,
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  Plus,
  RefreshCwIcon,
  Trash2,
  TriangleAlert,
  Upload,
  VideoIcon,
  X,
  Eye,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Link } from 'react-router';
import { getFileStage, getStageBadge } from '@/utils/file-labeling';

interface FileUploadItem extends FileWithPreview {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadBoxProps {
  maxSize?: number;
  accept?: string;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  onFileClick?: (file: FileMetadata) => void;
  simulateUpload?: boolean;
  disabled?: boolean;
  enhancedFiles?: any[]; // Enhanced file metadata with stage info
  draftingId?: number; // For file deletion
}

export function UploadDocuments({
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  onFilesChange,
  onFileClick,
  simulateUpload = true,
  disabled = false,
  enhancedFiles = [],
  draftingId,
}: UploadBoxProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [uploadBoxes, setUploadBoxes] = useState([{ id: 1 }]);
  const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
  const [addFilesToDrafting] = useAddFilesToDraftingMutation();

  // State for tracking if file is currently being selected
  const [isSelectingFile, setIsSelectingFile] = useState(false);

  const [
    { isDragging, errors },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1000,
    maxSize,
    accept,
    multiple: true,
    onFilesChange: (newFiles) => {
      // Reset selection state and process files
      setIsSelectingFile(false);
      const newUploadFiles: FileUploadItem[] = newFiles.map((file) => ({
        ...file,
        progress: 0,
        status: 'uploading' as const,
      }));
      setUploadFiles(newUploadFiles);
      onFilesChange?.(newFiles);
    },
  });

  // Trigger real upload when files are added
  useEffect(() => {
    // Find files that are just added and start uploading
    uploadFiles.forEach((file) => {
      if (file.status === 'uploading' && file.progress === 0) {
        // Start real upload
        handleRealUpload(file);
      }
    });
  }, [uploadFiles]);

  // Remove completed files immediately (they appear in existing files from server)
  useEffect(() => {
    const completedFiles = uploadFiles.filter(file => file.status === 'completed');
    if (completedFiles.length > 0) {
      // Remove completed files immediately so they don't show in upload section
      setUploadFiles(prev => prev.filter(file => file.status !== 'completed'));
    }
  }, [uploadFiles]);

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
  };

  const addUploadBox = () => {
    const newId = uploadBoxes.length > 0 ? Math.max(...uploadBoxes.map(box => box.id)) + 1 : 1;
    setUploadBoxes(prev => [...prev, { id: newId }]);
  };

  const removeUploadBox = (id: number) => {
    if (uploadBoxes.length > 1) {
      setUploadBoxes(prev => prev.filter(box => box.id !== id));
    }
  };

  // Real file upload function
  const handleRealUpload = async (fileItem: FileUploadItem) => {
    if (!draftingId) {
      toast.error('Drafting session not found');
      return;
    }

    try {
      // Call the real API - API expects File[]
      const filesToUpload: File[] = fileItem.file instanceof File 
        ? [fileItem.file] 
        : [fileItem.file as unknown as File];
      
      const response = await addFilesToDrafting({
        drafting_id: draftingId,
        files: filesToUpload,
      }).unwrap();

      // File uploaded successfully
      if (response.success) {
        toast.success('File uploaded successfully');
        
        // Update file status to completed
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, progress: 100, status: 'completed' as const } 
              : f
          )
        );

        // Trigger callback if provided
        onFilesChange?.(uploadFiles.filter(f => f.id === fileItem.id) as unknown as FileWithPreview[]);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Update file status to error
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error' as const, error: error?.data?.message || 'Upload failed' } 
            : f
        )
      );
      
      toast.error(error?.data?.message || 'Failed to upload file');
    }
  };

  const handleDeleteExistingFile = async (fileId: string) => {
    if (!draftingId) {
      toast.error('Drafting session not found');
      return;
    }
    
    try {
      await deleteFileFromDrafting({
        drafting_id: draftingId,
        file_id: fileId
      }).unwrap();
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  // State for file viewer modal
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<FileUploadItem | null>(null);

  const handleViewFile = (file: FileUploadItem) => {
    setCurrentFile(file);
    setViewerOpen(true);
  };

  const getFileIcon = (file: File | FileMetadata) => {
    const type = file instanceof File ? file.type : file.type;
    
    if (type.startsWith('image/')) return <ImageIcon className="size-4" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <FileTextIcon className="size-4" />;
    if (type.includes('word') || type.includes('doc')) return <FileTextIcon className="size-4" />;
    if (type.includes('excel') || type.includes('sheet')) return <FileSpreadsheetIcon className="size-4" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    if (type.includes('json')) return <FileTextIcon className="size-4" />;
    if (type.includes('text')) return <FileTextIcon className="size-4" />;
    
    return <FileTextIcon className="size-4" />;
  };

  const getStageBadge = (stage: any) => {
    if (!stage) {
      return {
        label: 'Draft',
        className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
      };
    }
    
    return {
      label: stage.label || stage,
      className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stage.bgColor || 'bg-gray-100'} ${stage.color || 'text-gray-800'}`
    };
  };

  return (
    <div className='border-none'>
      <div>
        {/* Files Section - Upload boxes transform to uploaded files */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Upload Boxes that transform to Uploaded Files */}
            {uploadBoxes.map((box, index) => {
              const fileForThisBox = uploadFiles[index];
              const isUploading = fileForThisBox?.status === 'uploading';
              const isCompleted = fileForThisBox?.status === 'completed';
              const isError = fileForThisBox?.status === 'error';
              
              return (
                <div
                  key={box.id}
                  className={cn(
                    'relative rounded-lg border px-3 py-5 min-w-fit text-center transition-colors',
                    isUploading 
                      ? 'border-primary bg-primary/5' 
                      : isError
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onDragEnter={disabled || isUploading || isSelectingFile ? undefined : handleDragEnter}
                  onDragLeave={disabled || isUploading || isSelectingFile ? undefined : handleDragLeave}
                  onDragOver={disabled || isUploading || isSelectingFile ? undefined : handleDragOver}
                  onDrop={disabled || isUploading || isSelectingFile ? undefined : handleDrop}
                  onClick={() => {
                    if (!isSelectingFile && !isUploading && !isCompleted) {
                      setIsSelectingFile(true);
                      openFileDialog();
                    }
                  }}
                >
                  <input
                    {...getInputProps({
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                      }
                    })}
                    className="sr-only"
                  />

                  {isUploading ? (
                    // Uploading State - Show Progress
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <svg className="size-12 -rotate-90" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted-foreground/20"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${2 * Math.PI * 14}`}
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - fileForThisBox.progress / 100)}`}
                            className="text-primary transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {getFileIcon(fileForThisBox?.file || { name: 'file', type: '' })}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium truncate">
                          {fileForThisBox?.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(fileForThisBox?.progress || 0)}% complete
                        </p>
                      </div>
                    </div>
                  ) : isCompleted ? (
                    // Completed State - Show as Uploaded File Card
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <Check className="size-6 text-green-600" />
                      </div>
                      <div className="space-y-1 w-full">
                        <p className="text-sm font-medium truncate">{fileForThisBox?.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(fileForThisBox?.file.size || 0)}</p>
                      </div>
                    </div>
                  ) : isError ? (
                    // Error State
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <X className="size-6 text-destructive" />
                      </div>
                      <div className="space-y-1 w-full">
                        <p className="text-sm font-medium truncate">{fileForThisBox?.file.name}</p>
                        <p className="text-xs text-destructive">{fileForThisBox?.error}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFiles(prev => 
                            prev.map(f => 
                              f.id === fileForThisBox.id 
                                ? { ...f, progress: 0, status: 'uploading' as const, error: undefined } 
                                : f
                            )
                          );
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    // Empty Upload Box State
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-muted-foreground/10',
                          isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
                        )}
                      >
                        <img src='/images/app/upload.svg' alt="upload icon" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-text font-semibold ">
                          Drop files here or click to{' '}
                          <button
                            type="button"
                            className="cursor-pointer text-primary underline-offset-4 hover:underline"
                            onClick={openFileDialog}
                            disabled={disabled}
                          >
                            browse files
                          </button>
                        </p>
                        <p className="text-sm font-semibold text-center text-primary underline pt-3">
                          upload file
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Remove Box Button */}
                  {!isUploading && uploadBoxes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 size-6 bg-background border rounded-full opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUploadBox(box.id);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Add More Upload Boxes Button */}
            <Button
              variant="outline"
              className="h-auto min-h-[120px] w-[209px] border-dashed flex flex-col items-center gap-2"
              onClick={addUploadBox}
              disabled={disabled}
            >
              <Plus className="size-6 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Existing / Server Files Section */}
        {enhancedFiles && enhancedFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Existing Files ({enhancedFiles.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Existing / server files */}
              {enhancedFiles.map((enhancedFile: any) => (
                <div
                  key={enhancedFile.id}
                  className="relative rounded-lg border border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50 cursor-pointer"
                  onClick={() => {
                    const mockFileItem: FileUploadItem = {
                      id: enhancedFile.id,
                      file: {
                        name: enhancedFile.name,
                        size: enhancedFile.size || 0,
                        type: enhancedFile.type || '',
                      } as File,
                      status: 'completed',
                      progress: 100,
                      preview: enhancedFile.url,
                    };
                    handleViewFile(mockFileItem);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-col items-center gap-2">
                      <div className="size-8 shrink-0 relative flex items-center justify-center rounded text-muted-foreground/80">
                        {getFileIcon({
                          name: enhancedFile.name,
                          size: enhancedFile.size || 0,
                          type: enhancedFile.type || '',
                          url: enhancedFile.url || '',
                          id: enhancedFile.id
                        } as FileMetadata)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExistingFile(enhancedFile.id);
                      }}
                      disabled={disabled}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium truncate">{enhancedFile.name}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(enhancedFile.size || 0)}
                      </span>
                      {(() => {
                        const badge = getStageBadge(enhancedFile.stage);
                        return (
                          <span className={badge.className}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {enhancedFile.uploadedBy && <span>by {enhancedFile.uploadedBy}</span>}
                      {enhancedFile.uploadedAt && <span>{new Date(enhancedFile.uploadedAt).toLocaleDateString()}</span>}
                    </div>
                    <Button
                      variant="inverse"
                      size="sm"
                      className="text-sm font-semibold text-center text-primary underline w-full mt-2"
                      disabled={disabled}
                    >
                      View File
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <Alert variant="destructive" appearance="light">
            <AlertIcon>
              <TriangleAlert />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>
                {errors.map((error, i) => (
                  <p key={i}>{typeof error === 'string' ? error : String(error)}</p>
                ))}
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </div>
    </div>
  );
}