import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, FileTextIcon, ImageIcon, VideoIcon, HeadphonesIcon } from 'lucide-react';

interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface FileListViewProps {
  onFileClick: (file: FileMetadata) => void;
}

export function FileListView({ onFileClick }: FileListViewProps) {
  // In a real implementation, this would come from a context or API
  // For now, we'll show an empty state
  const files: FileMetadata[] = [];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.startsWith('video/')) return <VideoIcon className="w-4 h-4" />;
    if (fileType.startsWith('audio/')) return <HeadphonesIcon className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileTextIcon className="w-4 h-4" />;
    return <FileTextIcon className="w-4 h-4" />;
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No files uploaded yet</p>
        <p className="text-sm mt-1">Upload files to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id} className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
              {getFileIcon(file.type)}
            </div>
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileClick(file)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </Card>
      ))}
    </div>
  );
}