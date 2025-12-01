import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { FileViewerProps } from '@/pages/jobs/components/job';
import { Card } from '@/components/ui/card';


export const FileViewer = ({
  inline = false,
  isOpen = true,
  onClose,
  file,
}: FileViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

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

  const ShellStart =
    ({ children }: { children: React.ReactNode }) => (
      <div className="">
        <div className="p-6 pb-0 border-b">
          {children}
        </div>
      </div>
    )


  const ShellBodyStart = inline
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const CloseButton = () => (
    <Button variant="ghost" size="sm" onClick={onClose}>
      <X className="w-4 h-4" />
    </Button>
  );

  return (
    <ShellStart>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">FAB ID: {file.id}</div>
          <p className="text-sm text-gray-600 mt-1">Viewing file: {file.name}</p>
        </div>
        {onClose && <CloseButton />}
      </div>
      <ShellBodyStart>
        <div className="flex h-[calc(95vh-120px)]">
          {/* Main Content - File Viewer */}
          <div className="flex-1 flex flex-col">
            {/* File Display Area */}
            <Card className="flex-1  flex items-center justify-center overflow-hidden relative max-w-[702px] mx-auto">
              <div
                className="max-w-full max-h-full transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                {/* File Preview */}
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.name}
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
                ) : file.type.includes('dwg') || file.type.includes('cad') ? (
                  // Mock DWG/CAD file display - showing a technical drawing
                  <div className="bg-white p-8 rounded-lg shadow-lg border">
                    <div className="w-full h-full min-h-[400px] relative">
                      {/* Mock technical drawing */}
                      <svg
                        viewBox="0 0 800 600"
                        className="w-full h-full"
                        style={{ background: '#f8f9fa' }}
                      >
                        {/* Kitchen Island Drawing */}
                        <rect
                          x="100"
                          y="100"
                          width="600"
                          height="400"
                          fill="none"
                          stroke="#000"
                          strokeWidth="2"
                        />

                        {/* Dimensions */}
                        <text x="50" y="120" fontSize="12" fill="#666">150 mm</text>
                        <text x="50" y="520" fontSize="12" fill="#666">452 mm</text>
                        <text x="450" y="520" fontSize="12" fill="#666">1.5m</text>
                        <text x="450" y="80" fontSize="12" fill="#666">1.4m</text>

                        {/* Inner details */}
                        <rect
                          x="200"
                          y="200"
                          width="400"
                          height="200"
                          fill="none"
                          stroke="#000"
                          strokeWidth="1"
                        />

                        {/* Cabinet outlines */}
                        <rect
                          x="220"
                          y="220"
                          width="80"
                          height="160"
                          fill="none"
                          stroke="#333"
                          strokeWidth="1"
                        />

                        <rect
                          x="320"
                          y="220"
                          width="80"
                          height="160"
                          fill="none"
                          stroke="#333"
                          strokeWidth="1"
                        />

                        <rect
                          x="420"
                          y="220"
                          width="80"
                          height="160"
                          fill="none"
                          stroke="#333"
                          strokeWidth="1"
                        />

                        {/* Counter lines */}
                        <line x1="200" y1="200" x2="600" y2="200" stroke="#666" strokeWidth="1" strokeDasharray="5,5" />
                        <line x1="200" y1="400" x2="600" y2="400" stroke="#666" strokeWidth="1" strokeDasharray="5,5" />
                      </svg>
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
                {/* File Info */}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 25}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 300}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ShellBodyStart>
    </ShellStart>
  );
};