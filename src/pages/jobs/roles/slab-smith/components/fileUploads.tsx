import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAddFilesToSlabSmithMutation } from '@/store/api/job';

interface FileUploadItem extends FileWithPreview {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadDocumentsProps {
  maxSize?: number;
  accept?: string;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  onFileClick?: (file: FileMetadata) => void;
  slabSmithId?: number;
  simulateUpload?: boolean;
  disabled?: boolean;
  refetchFiles?: () => void; // Add refetch function
}

export function UploadDocuments({
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  onFilesChange,
  onFileClick,
  slabSmithId,
  simulateUpload = true,
  disabled = false,
  refetchFiles,
}: UploadDocumentsProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [uploadBoxes, setUploadBoxes] = useState([{ id: 1 }]);
  const [addFilesToSlabSmith, { isLoading: isUploading }] = useAddFilesToSlabSmithMutation();
  
  // Track files that are being processed to prevent duplicates
  const processingFilesRef = useRef<Set<string>>(new Set());

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
    // Don't use onFilesChange here - handle files directly
    onFilesChange: undefined,
  });

  // Real file upload function
  const handleRealUpload = async (fileItem: FileUploadItem) => {
    console.log('Starting real upload for file:', fileItem.file.name);
    console.log('SlabSmith ID available:', slabSmithId);
    
    if (!slabSmithId) {
      console.log('No SlabSmith ID - setting error state');
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error' as const, error: 'SlabSmith session not found' } 
            : f
        )
      );
      processingFilesRef.current.delete(fileItem.id);
      return;
    }

    try {
      console.log('Updating progress to 30%');
      // Update progress
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, progress: 30 } 
            : f
        )
      );

      console.log('Calling addFilesToSlabSmith API');
      // Upload file
      const response = await addFilesToSlabSmith({
        slabsmith_id: slabSmithId,
        files: [fileItem.file as File],
      }).unwrap();
      
      console.log('Upload successful, response:', response);

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
        setUploadFiles(prev => {
          const filtered = prev.filter(f => f.id !== fileItem.id);
          console.log('Removed completed file, remaining:', filtered.length);
          return filtered;
        });
        processingFilesRef.current.delete(fileItem.id);
        console.log('Processing files after cleanup:', processingFilesRef.current.size);
        
        if (refetchFiles) {
          console.log('Calling refetchFiles');
          refetchFiles();
        }
      }, 1500);
      
      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      
      setUploadFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error' as const, error: error?.data?.message || 'Upload failed' } 
            : f
        )
      );
      processingFilesRef.current.delete(fileItem.id);
    }
  };

  // Create a custom handler for file selection
  const handleFileSelection = (newFiles: FileWithPreview[]) => {
    console.log('=== HANDLE FILE SELECTION CALLED ===');
    console.log('Received files:', newFiles.length);
    console.log('File IDs:', newFiles.map(f => f.id));
    console.log('Current uploadFiles state length:', uploadFiles.length);
    console.log('Current processing files:', processingFilesRef.current.size);
    
    // Filter out files already being processed
    const uniqueFiles = newFiles.filter(file => !processingFilesRef.current.has(file.id));
    console.log('Unique files to process:', uniqueFiles.length);
    
    if (uniqueFiles.length === 0) {
      console.log('❌ No unique files to process');
      return;
    }
    
    // Mark files as being processed
    uniqueFiles.forEach(file => processingFilesRef.current.add(file.id));
    console.log('✅ Added to processing set, now has:', processingFilesRef.current.size, 'files');
    
    // Create upload items
    const newUploadFiles: FileUploadItem[] = uniqueFiles.map((file) => ({
      ...file,
      progress: 0,
      status: 'uploading' as const,
    }));
    
    console.log('Creating upload items:', newUploadFiles.length);
    
    // Add to upload files
    setUploadFiles(prev => {
      const updated = [...prev, ...newUploadFiles];
      console.log('✅ Upload files state updated');
      console.log('Previous length:', prev.length);
      console.log('New items added:', newUploadFiles.length);
      console.log('Total now:', updated.length);
      return updated;
    });
    
    // Start uploading each file
    newUploadFiles.forEach(fileItem => {
      handleRealUpload(fileItem);
    });
    
  };

  // Handle drop directly to avoid duplicate events
  const handleCustomDrop = useCallback(async (e: React.DragEvent<HTMLElement>) => {
    console.log('Drop event triggered');
    e.preventDefault();
    e.stopPropagation();
    
    if (!e.dataTransfer?.files?.length || disabled) {
      console.log('No files in drop or component disabled');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files.map(f => f.name));
    
    const fileWithPreview: FileWithPreview[] = files.map(file => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
    }));
    
    handleFileSelection(fileWithPreview);
  }, [disabled, handleFileSelection]);
  const handleCustomFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== FILE INPUT CHANGE STARTED ===');
    console.log('Files selected:', e.target.files?.length);
    console.log('Files details:', e.target.files ? Array.from(e.target.files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type
    })) : 'No files');
    
    if (!e.target.files?.length) {
      return;
    }
    
    if (disabled) {
      return;
    }
    
    const files = Array.from(e.target.files);
    
    const fileWithPreview: FileWithPreview[] = files.map(file => ({
      file,
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      preview: URL.createObjectURL(file),
    }));
    
    console.log('Generated file previews:', fileWithPreview.map(f => f.id));
    handleFileSelection(fileWithPreview);
    
    // Reset input
    e.target.value = '';
    console.log('=== FILE INPUT CHANGE ENDED ===');
  }, [disabled, handleFileSelection]);

  // Simulate upload progress
  useEffect(() => {
    if (!simulateUpload) return;

    const interval = setInterval(() => {
      setUploadFiles((prev) =>
        prev.map((file) => {
          if (file.status !== 'uploading') return file;

          const increment = Math.random() * 15 + 5;
          const newProgress = Math.min(file.progress + increment, 100);

          if (newProgress >= 100) {
            const shouldFail = Math.random() < 0.1;
            return {
              ...file,
              progress: 100,
              status: shouldFail ? ('error' as const) : ('completed' as const),
              error: shouldFail ? 'Upload failed. Please try again.' : undefined,
            };
          }

          return { ...file, progress: newProgress };
        }),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [simulateUpload]);

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
  };

  const retryUpload = (fileId: string) => {
    setUploadFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, progress: 0, status: 'uploading' as const, error: undefined } : file,
      ),
    );
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

  const handleViewFile = (fileItem: FileUploadItem) => {
    if (fileItem.status === 'completed' && fileItem.preview && onFileClick) {
      const fileForViewer: FileMetadata = {
        id: fileItem.id,
        name: fileItem.file.name,
        size: fileItem.file.size,
        type: fileItem.file.type,
        url: fileItem.preview,
      };
      onFileClick(fileForViewer);
    }
  };

  const getFileIcon = (file: File | FileMetadata) => {
    const type = file instanceof File ? file.type : file.type;
    if (type.startsWith('image/')) return <img src='/images/app/img.svg' />;
    if (type.startsWith('video/')) return <VideoIcon className="" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <img src='/images/app/pdf.svg' className="size-4" />;
    if (type.includes('word') || type.includes('doc')) return <img src='/images/app/doc.svg' />;
    if (type.includes('excel') || type.includes('sheet')) return <img src='/images/app/doc.svg' />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  };

  const getFileTypeLabel = (file: File | FileMetadata) => {
    const type = file instanceof File ? file.type : file.type;
    if (type.startsWith('image/')) return 'Image';
    if (type.startsWith('video/')) return 'Video';
    if (type.startsWith('audio/')) return 'Audio';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('doc')) return 'Word';
    if (type.includes('excel') || type.includes('sheet')) return 'Excel';
    if (type.includes('zip') || type.includes('rar')) return 'Archive';
    if (type.includes('json')) return 'JSON';
    if (type.includes('text')) return 'Text';
    return 'File';
  };

  return (
    <Card className='border-none'>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
      </CardHeader>
      <CardContent className="">
        {/* <div className="mb-4">
          {uploadFiles.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-medium text-yellow-800">Current Upload Files:</p>
              {uploadFiles.map((file, index) => (
                <p key={index} className="text-xs text-yellow-700 ml-2">
                  • {file.file.name} - {file.status} ({file.progress}%)
                </p>
              ))}
            </div>
          )}
        </div> */}
        {/* Upload Boxes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Uploaded Files */}
          {uploadFiles.map((fileItem) => (
            <div
              key={fileItem.id}
              className={cn(
                'relative rounded-lg border p-4 transition-colors',
                fileItem.status === 'error'
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    'size-8 shrink-0 relative flex items-center justify-center rounded',
                    fileItem.status === 'uploading' ? 'text-primary' : 'text-muted-foreground/80'
                  )}>
                    {fileItem.status === 'uploading' ? (
                      <div className="relative">
                        <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
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
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - fileItem.progress / 100)}`}
                            className="text-primary transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {getFileIcon(fileItem.file)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        {getFileIcon(fileItem.file)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-black font-bold truncate">{fileItem.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                       {formatBytes(fileItem.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {fileItem.status === 'error' ? (
                    <Button
                      onClick={() => retryUpload(fileItem.id)}
                      variant="ghost"
                      size="icon"
                      className="size-6 text-destructive/80 hover:text-destructive"
                    >
                      <RefreshCwIcon className="size-3" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => removeUploadFile(fileItem.id)}
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* View File Button - Only show for completed files */}
              {fileItem.status === 'completed' && (
                <div className="">
                  <Button
                    onClick={() => handleViewFile(fileItem)}
                    variant="inverse"
                    size="sm"
                    className="text-sm font-semibold text-center text-primary underline  absolute bottom-3 right-3 "
                  >
                    
                    View File
                  </Button>
                </div>
              )}

              {fileItem.status === 'error' && (
                <p className="text-destructive mt-2">{fileItem.error}</p>
              )}
            </div>
          ))}

          {/* Upload Boxes */}
          {uploadBoxes.map((box) => (
            <div
              key={box.id}
              className={cn(
                'relative rounded-lg border border-dashed px-3 py-5 min-w-fit text-center transition-colors cursor-pointer group',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleCustomDrop}
              onClick={() => {
                console.log('🔍 UPLOAD BOX CLICKED');
                openFileDialog();
              }}
            >
              <input 
                {...getInputProps()} 
                onChange={handleCustomFileChange}
                disabled={disabled || isUploading}
                className="sr-only" 
              />

              <div className="flex flex-col items-center gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-muted-foreground/10',
                    isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25',
                  )}
                >
                  <img src='/images/app/upload.svg' />
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-text font-semibold ">
                    Drop files here or click to{' '}
                    <button
                      type="button"
                      className="cursor-pointer text-primary underline-offset-4 hover:underline"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-sm font-semibold text-center text-primary underline pt-3">
                    upload file
                  </p>
                </div>
              </div>

              {/* Remove box button (only show if multiple boxes exist) */}
              {uploadBoxes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 size-6 bg-background border rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadBox(box.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}

          {/* Add More Boxes Button - Always show since there's no limit */}
          <Button
            variant="outline"
            className="h-auto min-h-[120px] w-[209px] border-dashed flex flex-col items-center gap-2"
            onClick={addUploadBox}
          >
            <Plus className="size-6 text-muted-foreground" />
          </Button>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <Alert variant="destructive" appearance="light">
            <AlertIcon>
              <TriangleAlert />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>File upload error(s)</AlertTitle>
              <AlertDescription>
                {errors.map((error, index) => (
                  <p key={index} className="last:mb-0">
                    {error}
                  </p>
                ))}
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}