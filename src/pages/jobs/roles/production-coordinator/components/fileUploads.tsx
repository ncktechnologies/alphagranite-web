// fileUploads.tsx
import React, { useCallback, useState } from 'react';
import { FileUploadComponent } from '@/pages/jobs/roles/drafters/components/FileUploadComponent';
import { Documents } from '@/pages/shop/components/files';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileWithPreview } from '@/hooks/use-file-upload';
import { useDeleteFileFromFinalProgrammingMutation } from '@/store/api/job';
import { toast } from 'sonner';

interface UploadDocumentsProps {
  onFilesChange: (files: FileWithPreview[]) => void;
  onFileClick: (file: any) => void;
  fpId?: number;
}

export function UploadDocuments({ onFilesChange, onFileClick, fpId }: UploadDocumentsProps) {
  const [deleteFileFromFinalProgramming] = useDeleteFileFromFinalProgrammingMutation();
  
  const handleFileUpload = useCallback((files: File[]) => {
    // Convert to FileWithPreview format
    const filesWithPreview: FileWithPreview[] = files.map(file => ({
      ...file,
      preview: URL.createObjectURL(file)
    }));
    
    onFilesChange(filesWithPreview);
    toast.success(`${files.length} file(s) ready to upload`);
  }, [onFilesChange]);

  const handleFileDelete = async (fileId: string) => {
    if (!fpId) {
      toast.error('Final programming session not found');
      return;
    }
    
    try {
      await deleteFileFromFinalProgramming({
        fp_id: fpId,
        file_id: fileId
      }).unwrap();
      
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileUploadComponent onFilesChange={handleFileUpload} />
        
        <div>
          <h3 className="font-semibold text-sm py-3">Uploaded files</h3>
          <Documents 
            onFileClick={onFileClick}
            onDeleteFile={handleFileDelete}
            fpId={fpId}
          />
        </div>
      </CardContent>
    </Card>
  );
}