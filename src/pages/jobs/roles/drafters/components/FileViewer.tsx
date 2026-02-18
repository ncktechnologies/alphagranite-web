import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { FileViewerProps } from '@/pages/jobs/components/job';
import { getFileStage, getStageBadge } from '@/utils/file-labeling';

export const FileViewer = ({
  inline = false,
  onClose,
  file,
}: FileViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleResetZoom = () => { setZoom(100); setRotation(0); };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    if (!file.url) return;
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(file.url, '_blank');
    }
  };

  // Detect if file is a PDF
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  
  // Log for debugging
  console.log('[v0] FileViewer received:', { name: file.name, type: file.type, url: file.url, isPdf });

  const stage = file.stage || getFileStage(file.name, { isDrafting: true });
  const badge = getStageBadge(stage);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{file.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={badge.className}>{badge.label}</span>
            <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-100">
        {file.type?.startsWith('image/') && !imageError ? (
          <Card className="relative max-w-5xl max-h-full overflow-hidden">
            <div
              className="transition-transform duration-200"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  console.error('[v0] Image failed to load:', file.url);
                  setImageError(true);
                }}
              />
            </div>
          </Card>
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
            <iframe
              src={`${file.url}#toolbar=1&navpanes=0&view=FitH`}
              title={file.name}
              className="flex-1 w-full border-0"
              onError={() => {
                console.error('[v0] PDF iframe failed to load:', file.url);
              }}
            />
          </div>
        ) : (
          <Card className="p-12 text-center text-gray-500">
            <p className="text-lg">Preview not available</p>
            <p className="text-sm mt-2">{file.name}</p>
            <p className="text-xs text-gray-400 mt-3">File type: {file.type || 'Unknown'}</p>
            <Button onClick={handleDownload} className="mt-4">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </Card>
        )}
      </div>

      {/* Controls */}
      <div className="border-t p-4 flex justify-between items-center gap-2 bg-gray-50">
        <div className="flex gap-2">
          {/* Show zoom controls only for images */}
          {file.type?.startsWith('image/') && !imageError && (
            <>
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 25}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">{zoom}%</span>
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 300}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                Rotate
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                Reset
              </Button>
            </>
          )}
          {/* Show open in new window for PDFs */}
          {isPdf && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(file.url, '_blank')}
            >
              Open 
            </Button>
          )}
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
};
