// FileViewer.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FileViewerProps {
  file: any;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
  // Determine if the file is an image based on its type or extension
  const isImage = file.type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name || file.url || '');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative w-full h-full max-w-6xl max-h-full">
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
        
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={file.preview || file.url} 
              alt={file.name || 'File preview'} 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-2">{file.name || 'Document'}</h3>
              <p className="mb-4">This file type cannot be previewed directly.</p>
              {file.url && (
                <Button asChild variant="secondary">
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    Download File
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}