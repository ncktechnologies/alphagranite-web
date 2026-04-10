import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { FileViewerProps } from '@/pages/jobs/components/job';
import { WORKFLOW_STAGES, getFileStage, getStageBadge } from '@/utils/file-labeling';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFileDesignLabel = (value: string): string => {
  const designMap: Record<string, string> = {
    block_drawing: 'Block Drawing',
    layout:        'Layout',
    ss_layout:     'SS Layout',
    shop_drawing:  'Shop Drawing',
    photo_media:   'Photo / Media',
  };
  return designMap[value] || value;
};

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};


const isImageFile = (name: string, type?: string): boolean => {
  if (type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/i.test(name ?? '');
};


const isPdfFile = (name: string, type?: string): boolean => {
  if (type === 'application/pdf') return true;
  return /\.pdf$/i.test(name ?? '');
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FileViewer = ({
  inline = false,
  onClose,
  file,
}: FileViewerProps) => {
  const [zoom, setZoom]           = useState(100);
  const [rotation, setRotation]   = useState(0);
  const [imageError, setImageError] = useState(false);

  const handleZoomIn    = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut   = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleResetZoom = () => { setZoom(100); setRotation(0); };
  const handleRotate    = () => setRotation(prev => (prev + 90) % 360);

  
  const handleDownload = async () => {
    if (!file.url) return;
    try {
      const response = await fetch(file.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob   = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn('[FileViewer] fetch-download failed, falling back:', error);
      // Anchor fallback — works for same-origin; for cross-origin it may open a tab
      const link    = document.createElement('a');
      link.href     = file.url;
      link.download = file.name;
      link.target   = '_blank';
      link.rel      = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ── Derived flags (extension-aware, not type-only) ─────────────────────────
  const isImage = isImageFile(file.name, file.type);
  const isPdf   = isPdfFile(file.name, file.type);

  // ── Stage / badge ──────────────────────────────────────────────────────────
  const stageKey = file.stage_name ?? file.stage;
  const stage    = stageKey && WORKFLOW_STAGES[stageKey]
    ? WORKFLOW_STAGES[stageKey]
    : getFileStage(file.name, { currentStage: stageKey, isDrafting: false });
  const badge = getStageBadge(stage);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{file.name}</h2>

          <div className="flex items-center gap-2 mt-1">
            <span className={badge.className}>{badge.label}</span>
            {file.size ? (
              <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
            ) : null}
          </div>

          {(file.stage_name || file.file_design || file.uploaded_by_name) && (
            <div className="mt-2 text-xs text-gray-500 space-x-2">
              {file.stage_name   && <span>Stage: {file.stage_name}</span>}
              {file.file_design  && <span>Type: {getFileDesignLabel(file.file_design)}</span>}
              {file.uploaded_by_name && <span>By: {file.uploaded_by_name}</span>}
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={onClose}>
          <X className="size-[36px]" />
        </Button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-100">

        {/* ── Image viewer ── */}
        {isImage && !imageError ? (
          <Card className="relative max-w-5xl max-h-full overflow-hidden">
            <div
              className="transition-transform duration-200"
              style={{
                transform:       `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={file.url}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
                onError={() => {
                  console.error('[FileViewer] Image failed to load:', file.url);
                  setImageError(true);
                }}
              />
            </div>
          </Card>

        /* ── PDF viewer ── */
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col bg-white rounded-lg overflow-hidden">
            <iframe
              src={`${file.url}#toolbar=1&navpanes=0&view=FitH`}
              title={file.name}
              className="flex-1 w-full border-0"
              onError={() => {
                console.error('[FileViewer] PDF iframe failed to load:', file.url);
              }}
            />
          </div>

        /* ── Unsupported / load-error fallback ── */
        ) : (
          <Card className="p-12 text-center text-gray-500">
            <p className="text-lg">Preview not available</p>
            <p className="text-sm mt-2">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">
              File type: {file.type || 'Unknown'}
            </p>
            {imageError && (
              <p className="text-xs text-red-400 mt-1">
                Image failed to load — the URL may have expired or be unreachable.
              </p>
            )}
            <Button onClick={handleDownload} className="mt-4">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </Card>
        )}
      </div>

      {/* ── Footer controls ── */}
      <div className="border-t p-4 flex justify-between items-center gap-2 bg-gray-50">
        <div className="flex gap-2">

          {/* Zoom + rotate — images only, and only when load succeeded */}
          {isImage && !imageError && (
            <>
              <Button
                variant="outline" size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium">{zoom}%</span>
              <Button
                variant="outline" size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
              >
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

          {/* Open in new tab — PDFs only */}
          {isPdf && (
            <Button
              variant="outline" size="sm"
              onClick={() => window.open(file.url, '_blank')}
            >
              Open in new tab
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