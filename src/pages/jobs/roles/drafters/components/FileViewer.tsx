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

  // Log for debugging
  console.log('FileViewer received:', { name: file.name, type: file.type, url: file.url });

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
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <Card className="relative max-w-5xl max-h-full overflow-hidden">
          <div
            className="transition-transform duration-200"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {file.type?.startsWith('image/') && !imageError ? (
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  console.error('Image failed to load:', file.url);
                  setImageError(true);
                }}
              />
            ) : file.type === 'application/pdf' ? (
              <iframe
                src={`${file.url}#toolbar=0`}
                title={file.name}
                className="w-full h-[80vh]"
              />
            ) : (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg">Preview not available</p>
                <p className="text-sm mt-2">{file.name}</p>
                <Button onClick={handleDownload} className="mt-4">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="border-t p-4 flex justify-end gap-2">
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
        <Button onClick={handleDownload} className="ml-2">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
};