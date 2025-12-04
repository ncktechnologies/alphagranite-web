// FileViewer.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface FileViewerProps {
  file: any;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Determine if the file is an image based on its type or extension
  const isImage = file.type?.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name || file.url || '');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.click();
    }
  };

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
        
        <div className="flex h-[calc(95vh-120px)]">
          {/* Main Content - File Viewer */}
          <div className="flex-1 flex flex-col">
            {/* File Display Area */}
            <Card className="flex-1 flex items-center justify-center overflow-hidden relative max-w-[702px] mx-auto">
              <div
                className="max-w-full max-h-full transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                {/* File Preview */}
                {isImage ? (
                  <img
                    src={file.preview || file.url} 
                    alt={file.name || 'File preview'} 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : file.type === 'application/pdf' ? (
                  <div className="bg-white p-8 rounded-lg shadow-lg">
                    <div className="text-center text-gray-500">
                      <p className="text-lg font-medium">PDF Preview</p>
                      <p className="text-sm">{file.name}</p>
                      <p className="text-xs mt-2">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ) : file.type?.includes('dwg') || file.type?.includes('cad') ? (
                  // Mock DWG/CAD file display
                  <div className="bg-white p-8 rounded-lg shadow-lg border">
                    <div className="w-full h-full min-h-[400px] relative">
                      <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">CAD/DWG File</p>
                        <p className="text-sm">{file.name}</p>
                        <p className="text-xs mt-2">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow-lg">
                    <div className="text-center text-gray-500">
                      <p className="text-lg font-medium">File Preview</p>
                      <p className="text-sm">{file.name}</p>
                      <p className="text-xs mt-2">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
            <p className="text-sm text-center mt-2 font-medium text-text-foreground">{file.name}</p>

            {/* Bottom Controls */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                {/* Download Button */}
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className='text-[#7A9705] font-semibold'
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 border rounded-[50px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoom <= 25}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="px-2 py-1 text-sm font-medium min-w-[60px] text-center">
                      {zoom}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoom >= 300}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Rotate Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  {/* Reset Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetZoom}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}