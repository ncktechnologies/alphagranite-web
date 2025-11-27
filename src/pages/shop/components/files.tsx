import { useState, useEffect } from 'react';
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

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface UploadBoxProps {
  onFileClick?: (file: FileMetadata) => void;
  draftingData?: Drafting;
}

export function Documents({ onFileClick, draftingData }: UploadBoxProps) {
  // State for files - initialize with empty array
  const [files, setFiles] = useState<FileMetadata[]>([]);

  // Update files when draftingData changes
  useEffect(() => {
    if (draftingData && draftingData.file_ids) {
      // Parse file_ids string into an array of file objects
      // Since we don't have a way to get actual file details, we'll create mock files based on file_ids
      try {
        const fileIdsArray = draftingData.file_ids.split(',').filter(id => id.trim() !== '');
        const mockFiles = fileIdsArray.map((id, index) => ({
          id: id.trim(),
          name: `Drafting_File_${index + 1}.pdf`,
          size: 1024000 + index * 512000, // Mock size
          type: 'application/pdf',
          url: '/images/app/upload-file.svg',
        }));
        setFiles(mockFiles);
      } catch (error) {
        console.error('Error parsing file_ids:', error);
        setFiles([]);
      }
    } else {
      setFiles([]);
    }
  }, [draftingData]);

  const getFileIcon = (file: FileMetadata) => {
    const { type } = file;
    if (type.startsWith('image/')) return <img src="/images/app/img.svg" />;
    if (type.startsWith('video/')) return <VideoIcon className="size-4" />;
    if (type.startsWith('audio/')) return <HeadphonesIcon className="size-4" />;
    if (type.includes('pdf')) return <img src="/images/app/pdf.svg" />;
    if (type.includes('word') || type.includes('doc')) return <img src="/images/app/doc.svg" />;
    if (type.includes('excel') || type.includes('sheet')) return <img src="/images/app/doc.svg" />;
    if (type.includes('zip') || type.includes('rar')) return <FileArchiveIcon className="size-4" />;
    return <FileTextIcon className="size-4" />;
  };

  const handleViewFile = (file: FileMetadata) => {
    if (onFileClick) onFileClick(file);
    // else window.open(file.url, '_blank');
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
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
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive"
                  onClick={() => console.log('Remove disabled in view-only mode')}
                >
                  <X className="size-3" />
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