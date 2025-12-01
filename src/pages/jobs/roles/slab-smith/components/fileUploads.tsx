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
}

export function UploadDocuments({
  maxSize = 50 * 1024 * 1024,
  accept = '*',
  onFilesChange,
  onFileClick,
  slabSmithId,
  simulateUpload = true,
}: UploadDocumentsProps) {
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [uploadBoxes, setUploadBoxes] = useState([{ id: 1 }]);
  const [addFilesToSlabSmith] = useAddFilesToSlabSmithMutation();

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
    onFilesChange: async (newFiles) => {
      const newUploadFiles = newFiles.map((file) => {
        const existingFile = uploadFiles.find((existing) => existing.id === file.id);
        if (existingFile) {
          return {
            ...existingFile,
            ...file,
          };
        } else {
          return {
            ...file,
            progress: 0,
            status: 'uploading' as const,
          };
        }
      });
      setUploadFiles(newUploadFiles);
      
      // If we have a slabSmithId, upload the files to the API
      if (slabSmithId && newFiles.length > 0) {
        try {
          const fileObjects = newFiles.map(f => f.file as File);
          await addFilesToSlabSmith({
            slabsmith_id: slabSmithId,
            files: fileObjects
          }).unwrap();
          console.log('Files uploaded to slab smith successfully');
        } catch (error) {
          console.error('Failed to upload files to slab smith:', error);
        }
      }
      
      onFilesChange?.(newFiles);
    },
  });

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
                <div className="flex-col items-center gap-2">
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
                      getFileIcon(fileItem.file)
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
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <input {...getInputProps()} className="sr-only" />

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