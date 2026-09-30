import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2, ExternalLink, ImageOff, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  // zoom is relative to "fit to screen" (100 = whole image visible)
  const [zoom, setZoom]             = useState(100);
  const [rotation, setRotation]     = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [natural, setNatural]       = useState<{ w: number; h: number } | null>(null);
  const [stageSize, setStageSize]   = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [modelError, setModelError] = useState(false);

  const MIN_ZOOM = 25;
  const MAX_ZOOM = 400;
  const clampZoom = (z: number) => Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)));
  const handleZoomIn    = useCallback(() => setZoom(prev => clampZoom(prev * 1.25)), []);
  const handleZoomOut   = useCallback(() => setZoom(prev => clampZoom(prev / 1.25)), []);
  const handleResetZoom = useCallback(() => { setZoom(100); setRotation(0); }, []);
  const handleRotate    = useCallback(() => setRotation(prev => (prev + 90) % 360), []);

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

    // Safety check: script loaded?
    const ce = (window as any).customElements;
    if (!ce || !ce.get('model-viewer')) {
      console.error('[FileViewer] <model-viewer> is not defined. Add the script to index.html.');
      setModelError(true);
      return;
    }

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

    const onLoad  = () => console.debug('[FileViewer] model loaded');
    const onError = (e: any) => {
      console.error('[FileViewer] model failed to load:', e);
      setModelError(true);
    };
    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);

    container.appendChild(el);

    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      try { container.removeChild(el); } catch { /* ignore */ }
    };
  }, [isModel, file.url, file.name]);

  // ── Image fit / pan ───────────────────────────────────────────────────────
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setStageSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isImage]);

  useEffect(() => {
    // New file → reset view
    setZoom(100);
    setRotation(0);
    setImageError(false);
    setImageLoaded(false);
    setNatural(null);
  }, [file.url]);

  const sideways = rotation % 180 !== 0;
  const PAD = 32;
  const fitScale = natural && stageSize.w > 0
    ? Math.min(
        (stageSize.w - PAD * 2) / (sideways ? natural.h : natural.w),
        (stageSize.h - PAD * 2) / (sideways ? natural.w : natural.h),
        1, // never upscale small images when "fit"
      )
    : 1;
  const scale = Math.max(fitScale, 0.01) * (zoom / 100);
  const imgW = natural ? natural.w * scale : 0;
  const imgH = natural ? natural.h * scale : 0;
  const boxW = sideways ? imgH : imgW;
  const boxH = sideways ? imgW : imgH;
  const canPan = !!natural && (boxW > stageSize.w || boxH > stageSize.h);

  // ── Keyboard, wheel zoom, scroll lock ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
      if (!isImage || imageError) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); handleZoomIn(); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); handleZoomOut(); }
      else if (e.key === '0') { e.preventDefault(); handleResetZoom(); }
      else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleRotate(); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isImage, imageError, onClose, handleZoomIn, handleZoomOut, handleResetZoom, handleRotate]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !isImage) return;
    // Ctrl/⌘ + wheel (and trackpad pinch, which reports ctrlKey) zooms instead of scrolling
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(prev => clampZoom(prev * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isImage]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPan || !stageRef.current) return;
    panRef.current = { x: e.clientX, y: e.clientY, left: stageRef.current.scrollLeft, top: stageRef.current.scrollTop };
    setIsPanning(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = panRef.current;
    if (!p || !stageRef.current) return;
    stageRef.current.scrollLeft = p.left - (e.clientX - p.x);
    stageRef.current.scrollTop = p.top - (e.clientY - p.y);
  };
  const endPan = () => { panRef.current = null; setIsPanning(false); };

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
        {isImage && !imageError ? (
          <>
            <div
              ref={stageRef}
              className={cn(
                'absolute inset-0 overflow-auto [scrollbar-color:rgb(255_255_255/0.25)_transparent]',
                canPan ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPan}
              onPointerCancel={endPan}
              onDoubleClick={() => setZoom(prev => (prev > 100 ? 100 : 200))}
            >
              <div className="flex min-h-full min-w-full items-center justify-center" style={{ padding: PAD }}>
                <div className="relative shrink-0" style={{ width: boxW || undefined, height: boxH || undefined }}>
                  <img
                    src={file.url}
                    alt={file.name}
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
                      setImageLoaded(true);
                    }}
                    onError={() => {
                      console.error('[FileViewer] Image failed to load:', file.url);
                      setImageError(true);
                    }}
                    className={cn(
                      'absolute left-1/2 top-1/2 max-w-none select-none rounded-sm shadow-[0_20px_60px_-12px_rgb(0_0_0/0.6)] transition-[opacity,transform] duration-200',
                      imageLoaded ? 'opacity-100' : 'opacity-0',
                    )}
                    style={{
                      width: imgW || undefined,
                      height: imgH || undefined,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {!imageLoaded && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
              </div>
            )}

            {/* Floating image toolbar */}
            {imageLoaded && (
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-black/60 p-1 shadow-lg backdrop-blur-md">
                <button type="button" className={toolbarBtn} onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out (−)" title="Zoom out (−)">
                  <ZoomOut className="size-4" />
                </button>
                <button
                  type="button"
                  className="h-9 min-w-14 rounded-full px-2 text-sm font-semibold tabular-nums text-white/90 hover:bg-white/15"
                  onClick={() => setZoom(100)}
                  title="Fit to screen (0)"
                >
                  {zoom}%
                </button>
                <button type="button" className={toolbarBtn} onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in (+)" title="Zoom in (+)">
                  <ZoomIn className="size-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
                <button type="button" className={toolbarBtn} onClick={handleRotate} aria-label="Rotate (R)" title="Rotate (R)">
                  <RotateCw className="size-4" />
                </button>
                <button type="button" className={toolbarBtn} onClick={handleResetZoom} aria-label="Reset view (0)" title="Reset view (0)">
                  <Maximize2 className="size-4" />
                </button>
              </div>
            )}
          </>

        ) : isPdf ? (
          <div className="absolute inset-0 p-3 sm:p-5">
            <div className="h-full w-full overflow-hidden rounded-xl bg-white shadow-2xl">
              <iframe
                src={`${file.url}#toolbar=1&navpanes=0&view=FitH`}
                title={file.name}
                className="h-full w-full border-0"
                onError={() => console.error('[FileViewer] PDF iframe failed to load:', file.url)}
              />
            </div>
          </div>

        ) : isModel ? (
          <div className="absolute inset-0 p-3 sm:p-5">
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-white">
              <div ref={viewerContainerRef} className="h-full w-full" />

              {modelError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/95 text-foreground">
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

      {isImage && !imageError && imageLoaded && (
        <p className="hidden shrink-0 pb-2 text-center text-[12px] text-white/40 sm:block">
          Scroll with Ctrl/⌘ or pinch to zoom · Double-click to toggle zoom · Drag to pan · R to rotate · Esc to close
        </p>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(viewer, document.body) : viewer;
};