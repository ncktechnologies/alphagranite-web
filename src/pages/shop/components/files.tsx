import { useState } from 'react';
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

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface UploadBoxProps {
  onFileClick?: (file: FileMetadata) => void;
}

export function Documents({ onFileClick }: UploadBoxProps) {
  // Mock sample files (replace with your data)
  const [files] = useState<FileMetadata[]>([
    {
      id: '1',
      name: 'Photo.pdf',
      size: 523400,
      type: 'image/jpeg',
      url: '/images/app/upload-file.svg',
    },
    {
      id: '2',
      name: 'Photo.jpg',
      size: 1452300,
      type: 'image/jpeg',
      url: '/images/app/upload-file.svg',
    },
    {
      id: '3',
      name: 'Data.pdf',
      size: 230000,
      type: 'application/pdf',
      url: '/sample-files/data.xlsx',
    },
    {
      id: '4',
      name: 'Data.xlsx',
      size: 230000,
      type: 'application/vnd.ms-excel',
      url: '/sample-files/data.xlsx',
    },
    {
      id: '5',
      name: 'Data.xlsx',
      size: 230000,
      type: 'application/vnd.ms-excel',
      url: '/sample-files/data.xlsx',
    },
    {
      id: '6',
      name: 'Data.xlsx',
      size: 230000,
      type: 'application/vnd.ms-excel',
      url: '/sample-files/data.xlsx',
    },
  ]);

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
