import { useEffect, useState, useRef, useCallback } from 'react';
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
  FileArchiveIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  Plus,
  TriangleAlert,
  VideoIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  enhancedFiles?: any[];
  draftingId?: number;
  refetchFiles?: () => void;
}

export function UploadDocuments({
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  onFileClick,
  disabled = false,
  enhancedFiles = [],
  draftingId,
  refetchFiles,
}: UploadBoxProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [uploadBoxes, setUploadBoxes] = useState([{ id: 1 }]);
  const [deleteFileFromDrafting] = useDeleteFileFromDraftingMutation();
  const [addFilesToDrafting, { isLoading: isUploading }] = useAddFilesToDraftingMutation();
  
  // Track files that are being processed to prevent duplicates
  const processingFilesRef = useRef<Set<string>>(new Set());

  const [
    { isDragging, errors },
    {
      removeFile,
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
    // Don't use onFilesChange here - handle files directly
    onFilesChange: undefined,
  });

  // Create a custom handler for file selection
  const handleFileSelection = useCallback((newFiles: FileWithPreview[]) => {
    // Filter out files already being processed
    const uniqueFiles = newFiles.filter(file => !processingFilesRef.current.has(file.id));
    
    if (uniqueFiles.length === 0) return;
    
    // Mark files as being processed
    uniqueFiles.forEach(file => processingFilesRef.current.add(file.id));
    
    // Create upload items
    const newUploadFiles: FileUploadItem[] = uniqueFiles.map((file) => ({
      ...file,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    // Add to upload files
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    
    // Start uploading each file
    newUploadFiles.forEach(fileItem => {
      handleRealUpload(fileItem);
    });
  }, []);

  // Handle drop directly to avoid duplicate events
  const handleCustomDrop = useCallback(async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer?.files?.length || disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    const fileWithPreview: FileWithPreview[] = files.map(file => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
    }));
    
    handleFileSelection(fileWithPreview);
  }, [disabled, handleFileSelection]);

  // Handle input change directly
  const handleCustomFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || disabled) return;
    
    const files = Array.from(e.target.files);
    const fileWithPreview: FileWithPreview[] = files.map(file => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
    }));
    
    handleFileSelection(fileWithPreview);
    
    // Reset input
    e.target.value = '';
  }, [disabled, handleFileSelection]);

  // Real file upload function
  const handleRealUpload = async (fileItem: FileUploadItem) => {
    if (!draftingId) {
      toast.error('Drafting session not found');
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error' as const, error: 'Drafting session not found' } 
            : f
        )
      );
      processingFilesRef.current.delete(fileItem.id);
      return;
    }

    try {
      // Update progress
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: 30 } 
            : f
        )
      );

      // Upload file
      const response = await addFilesToDrafting({
        drafting_id: draftingId,
        files: [fileItem.file as File],
      }).unwrap();

      if (response.success || response.data) {
        // Mark as completed
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, progress: 100, status: 'completed' as const } 
              : f
          )
        );
        
        // Clean up and refetch after delay
        setTimeout(() => {
          setUploadFiles(prev => prev.filter(f => f.id !== fileItem.id));
          processingFilesRef.current.delete(fileItem.id);
          
          if (refetchFiles) {
            refetchFiles();
          }
        }, 1500);
        
        toast.success('File uploaded successfully');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { 
                ...f, 
                status: 'error' as const, 
                error: error?.data?.message || 'Upload failed' 
              } 
            : f
        )
      );
      
      processingFilesRef.current.delete(fileItem.id);
      toast.error(error?.data?.message || 'Failed to upload file');
    }
  };

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
    processingFilesRef.current.delete(fileId);
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
      
      if (refetchFiles) {
        refetchFiles();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
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
    
    return <FileTextIcon className="size-4" />;
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      uploadFiles.forEach(file => {
        if (file.preview && file.file instanceof File) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [uploadFiles]);

  return (
    <div className='border-none'>
      <div>
        {/* Files Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Upload Boxes */}
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
                  onDragEnter={disabled ? undefined : handleDragEnter}
                  onDragLeave={disabled ? undefined : handleDragLeave}
                  onDragOver={disabled ? undefined : handleDragOver}
                  onDrop={disabled ? undefined : handleCustomDrop}
                >
                  {/* Custom file input for this box */}
                  <input
                    type="file"
                    multiple
                    accept={accept}
                    className="sr-only"
                    id={`file-input-${box.id}`}
                    onChange={handleCustomFileChange}
                    disabled={disabled}
                  />

                  {isUploading ? (
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
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <Check className="size-6 text-green-600" />
                      </div>
                      <div className="space-y-1 w-full">
                        <p className="text-sm font-medium truncate">{fileForThisBox?.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(fileForThisBox?.file.size || 0)}</p>
                        <p className="text-xs text-green-600">Uploaded successfully!</p>
                      </div>
                    </div>
                  ) : isError ? (
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
                          // Retry upload
                          if (draftingId) {
                            handleRealUpload(fileForThisBox);
                          }
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex flex-col items-center gap-3 cursor-pointer"
                      onClick={() => {
                        if (!disabled) {
                          document.getElementById(`file-input-${box.id}`)?.click();
                        }
                      }}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors',
                          isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
                        )}
                      >
                        <img src='/images/app/upload.svg' alt="upload icon" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-text font-semibold">
                          Drop files here or click to{' '}
                          <span className="text-primary underline-offset-4 hover:underline">
                            browse files
                          </span>
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
              disabled={disabled || isUploading}
            >
              <Plus className="size-6 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Existing / Server Files Section */}
        {enhancedFiles && enhancedFiles.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enhancedFiles.map((enhancedFile: any) => (
                <div
                  key={enhancedFile.id}
                  className="relative rounded-lg border border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50 cursor-pointer"
                  onClick={() => {
                    if (onFileClick) {
                      onFileClick({
                        id: enhancedFile.id,
                        name: enhancedFile.name,
                        size: enhancedFile.size || 0,
                        type: enhancedFile.type || '',
                        url: enhancedFile.url || enhancedFile.file_url,
                      });
                    }
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFileClick) {
                          onFileClick({
                            id: enhancedFile.id,
                            name: enhancedFile.name,
                            size: enhancedFile.size || 0,
                            type: enhancedFile.type || '',
                            url: enhancedFile.url || enhancedFile.file_url,
                          });
                        }
                      }}
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