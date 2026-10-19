import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink, ImageOff, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageViewer } from '@/components/common/image-viewer';
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

const formatFileSize = (bytes: number): string => {
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

const isModelFile = (name: string, type?: string): boolean => {
  if (type && String(type).startsWith('model/')) return true;
  return /\.(gltf|glb)$/i.test(name ?? '');
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FileViewer = ({ onClose, file }: FileViewerProps) => {
  const [imageError, setImageError] = useState(false);
  const [modelError, setModelError] = useState(false);

  const handleDownload = async () => {
    if (!file.url) return;
    try {
      const response = await fetch(file.url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob    = await response.blob();
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

  const isImage = isImageFile(file.name, file.type);
  const isPdf   = isPdfFile(file.name, file.type);
  const isModel = isModelFile(file.name, file.type);

  const viewerContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Mount the model-viewer element ────────────────────────────────────────
  useEffect(() => {
    if (!isModel) return;
    const container = viewerContainerRef.current;
    if (!container) return;

    setModelError(false);
    container.innerHTML = '';

    let cancelled = false;
    let el: any = null;
    const onLoad  = () => console.debug('[FileViewer] model loaded');
    const onError = (e: any) => {
      console.error('[FileViewer] model failed to load:', e);
      setModelError(true);
    };

    // Load model-viewer (and three.js) on demand so it stays out of the main bundle
    import('@google/model-viewer')
      .then(() => {
        if (cancelled) return;
        el = createModelViewer();
        el.addEventListener('load', onLoad);
        el.addEventListener('error', onError);
        container.appendChild(el);
      })
      .catch((e) => {
        console.error('[FileViewer] failed to load <model-viewer>:', e);
        if (!cancelled) setModelError(true);
      });

    return () => {
      cancelled = true;
      if (!el) return;
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      try { container.removeChild(el); } catch { /* ignore */ }
    };
  }, [isModel, file.url, file.name]);

  const createModelViewer = () => {
    const el: any = document.createElement('model-viewer');
    el.src = file.url;
    el.alt = file.name;
    el.style.width  = '100%';
    el.style.height = '100%';
    el.setAttribute('camera-controls', '');
    el.setAttribute('auto-rotate', '');
    el.setAttribute('shadow-intensity', '1');
    el.setAttribute('exposure', '1');
    el.setAttribute('crossorigin', 'anonymous');
    el.setAttribute('loading', 'eager');
    el.setAttribute('reveal', 'auto');
    return el;
  };

  // New file → clear a previous image error
  useEffect(() => {
    setImageError(false);
  }, [file.url]);

  // ── Esc to close, scroll lock (image zoom keys live in ImageViewer) ──────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // ── Stage / badge ─────────────────────────────────────────────────────────
  const stageKey = file.stage_name ?? file.stage;
  const stage    = stageKey && WORKFLOW_STAGES[stageKey]
    ? WORKFLOW_STAGES[stageKey]
    : getFileStage(file.name, { currentStage: stageKey, isDrafting: false });
  const badge = getStageBadge(stage);

  const metaParts = [
    file.size ? formatFileSize(file.size) : null,
    file.file_design ? getFileDesignLabel(file.file_design) : null,
    file.uploaded_by_name ? `By ${file.uploaded_by_name}` : null,
  ].filter(Boolean) as string[];

  const openInNewTab = () => file.url && window.open(file.url, '_blank', 'noopener,noreferrer');

  const toolbarBtn =
    'inline-flex size-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

  // ── Render ────────────────────────────────────────────────────────────────
  const viewer = (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[#0f130b]/95 text-white backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${file.name}`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-white">{file.name}</h2>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/60">
            <span className={badge.className}>{badge.label}</span>
            {metaParts.map((m) => (
              <span key={m} className="whitespace-nowrap">{m}</span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="md"
            onClick={openInNewTab}
            className="hidden sm:inline-flex text-white/80 hover:bg-white/10 hover:text-white"
            disabled={!file.url}
          >
            <ExternalLink className="size-4" />
            Open original
          </Button>
          <Button size="md" onClick={handleDownload} disabled={!file.url}>
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <button
            type="button"
            onClick={onClose}
            className={cn(toolbarBtn, 'ms-1 size-10')}
            aria-label="Close preview (Esc)"
            title="Close (Esc)"
            autoFocus
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative min-h-0 flex-1">
        {isImage && !imageError && file.url ? (
          <ImageViewer
            key={file.url}
            src={file.url}
            alt={file.name}
            fileName={file.name}
            fileActions={false}
            onError={() => setImageError(true)}
            className="absolute inset-0"
          />
        ) : isPdf ? (
          // Edge to edge, fitted to width; the browser's PDF toolbar handles zoom and pages
          <iframe
            src={`${file.url}#toolbar=1&navpanes=0&view=FitH`}
            title={file.name}
            className="absolute inset-0 size-full border-0 bg-neutral-800"
          />

        ) : isModel ? (
          <div className="absolute inset-0 p-3 sm:p-5">
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-background">
              <div ref={viewerContainerRef} className="h-full w-full" />

              {modelError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/95 text-foreground">
                  <div className="max-w-md p-8 text-center">
                    <p className="text-lg font-semibold">Preview not available</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The 3D preview failed to render. The file may be unreachable or CORS‑blocked.
                    </p>
                    <Button onClick={handleDownload} className="mt-4">
                      <Download className="size-4" />
                      Download file
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/10">
                {imageError ? <ImageOff className="size-6 text-white/80" /> : <FileQuestion className="size-6 text-white/80" />}
              </span>
              <p className="text-base font-semibold text-white">
                {imageError ? "This image couldn't be loaded" : 'No preview for this file type'}
              </p>
              <p className="text-sm text-white/60">
                {imageError
                  ? 'The link may have expired or the file is unreachable. Try opening the original or downloading it.'
                  : `${file.name}${file.type ? ` · ${file.type}` : ''}`}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={openInNewTab} disabled={!file.url} className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/30">
                  <ExternalLink className="size-4" />
                  Open original
                </Button>
                <Button onClick={handleDownload} disabled={!file.url}>
                  <Download className="size-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isImage && !imageError && (
        <p className="hidden shrink-0 pb-2 text-center text-[12px] text-white/40 sm:block">
          Scroll or pinch to zoom · Double-click to toggle zoom · Drag to pan · R to rotate · Esc to close
        </p>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(viewer, document.body) : viewer;
};