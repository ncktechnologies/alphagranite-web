import React, { useState } from 'react';
import { Eye, Download, Trash2, File, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedFileMeta {
  id: string | number;
  name: string;
  size: number;
  type?: string;
  url?: string;
  filename?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

interface FileListProps {
  files: UploadedFileMeta[];
  onViewFile?: (file: UploadedFileMeta) => void;
  onDownloadFile?: (file: UploadedFileMeta) => void;
  onDeleteFile?: (fileId: string | number) => Promise<void>;
  showActions?: boolean;
  className?: string;
}

/**
 * File List Component
 * Displays a list of uploaded files with view/download/delete actions
 */
export const FileList: React.FC<FileListProps> = ({
  files,
  onViewFile,
  onDownloadFile,
  onDeleteFile,
  showActions = true,
  className,
}) => {
  const [deletingIds, setDeletingIds] = useState<Set<string | number>>(new Set());

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type?: string) => {
    if (type?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleView = (file: UploadedFileMeta) => {
    if (onViewFile) {
      onViewFile(file);
    } else if (file.url) {
      window.open(file.url, '_blank');
    } else {
      toast.error('File not available for viewing');
    }
  };

  const handleDownload = (file: UploadedFileMeta) => {
    if (onDownloadFile) {
      onDownloadFile(file);
    } else if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    } else {
      toast.error('File not available for download');
    }
  };

  const handleDelete = async (file: UploadedFileMeta) => {
    if (!onDeleteFile) {
      toast.error('Delete functionality not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(file.id));

    try {
      await onDeleteFile(file.id);
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-semibold text-gray-700">
        Uploaded Files ({files.length})
      </h4>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              'flex items-center justify-between bg-gray-50 p-2 rounded-md border',
              deletingIds.has(file.id) && 'opacity-50'
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 bg-white rounded border">
                {getFileIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                  {file.uploaded_by_name && (
                    <span className="ml-2">• by {file.uploaded_by_name}</span>
                  )}
                </p>
              </div>
            </div>
            
            {showActions && !deletingIds.has(file.id) && (
              <div className="flex items-center gap-1">
                {/* View Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(file)}
                  title="View file"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4 text-blue-500" />
                </Button>
                
                {/* Download Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  title="Download file"
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4 text-green-500" />
                </Button>
                
                {/* Delete Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file)}
                  title="Delete file"
                  className="h-8 w-8 p-0 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            )}
            
            {deletingIds.has(file.id) && (
              <span className="text-xs text-muted-foreground">Deleting...</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
