import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  Maximize,
  RotateCcw,
  RotateCw,
  Scan,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTypingTarget } from '@/lib/keyboard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Zoomable, pannable image preview for dark lightboxes.
 *
 * Wheel / trackpad zooms toward the pointer, drag pans when the image is larger
 * than the view, double-click toggles fit ↔ 200%. Keyboard: + / − zoom, 0 fit,
 * 1 actual size, R rotate (Shift+R counter-clockwise). Arrow keys are left to the
 * host so it can page between files.
 */

const MIN_SCALE = 0.05;
const MAX_SCALE = 8;
const STEP = 1.25;

interface ImageViewerProps {
  src: string;
  alt: string;
  /** Used for the downloaded file name */
  fileName?: string;
  /** Show Download / Open in new tab in the toolbar (off when the host header already has them) */
  fileActions?: boolean;
  /** Let the host render its own fallback instead of the built-in message */
  onError?: () => void;
  className?: string;
}

interface View {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  /** Follow the container size (re-fit on resize) until the user zooms */
  fit: boolean;
}

export function ImageViewer({ src, alt, fileName, fileActions = true, onError, className }: ImageViewerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0, rotation: 0, fit: true });
  const [failed, setFailed] = useState(false);
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Animate zoom changes, but not the first fit after the image loads
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (!natural) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [natural]);

  const rotated = view.rotation % 180 !== 0;
  const imgW = natural ? (rotated ? natural.h : natural.w) : 0;
  const imgH = natural ? (rotated ? natural.w : natural.h) : 0;
  // Fit never upscales small images past 100%
  const fitScale = natural && box.w && box.h ? Math.min(box.w / imgW, box.h / imgH, 1) : 1;
  const scale = view.fit ? fitScale : view.scale;

  // Keep the image covering the view when larger than it, centered when smaller
  const clamp = useCallback(
    (s: number, x: number, y: number) => {
      const maxX = Math.max(0, (imgW * s - box.w) / 2);
      const maxY = Math.max(0, (imgH * s - box.h) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    [imgW, imgH, box.w, box.h],
  );

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Zoom to `next`, keeping the point (px, py) — relative to the view center — still. */
  const zoomTo = useCallback(
    (next: number, px = 0, py = 0) => {
      setView((v) => {
        const current = v.fit ? fitScale : v.scale;
        const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
        const ratio = s / current;
        const pos = clamp(s, px - (px - v.x) * ratio, py - (py - v.y) * ratio);
        return { ...v, scale: s, ...pos, fit: false };
      });
    },
    [fitScale, clamp],
  );

  const zoomBy = useCallback((factor: number) => zoomTo(scale * factor), [zoomTo, scale]);
  const fitToView = useCallback(() => setView((v) => ({ ...v, x: 0, y: 0, fit: true })), []);
  const actualSize = useCallback(() => zoomTo(1), [zoomTo]);
  const rotate = useCallback(
    (dir: 1 | -1) => setView((v) => ({ ...v, rotation: (v.rotation + dir * 90 + 360) % 360, x: 0, y: 0, fit: true })),
    [],
  );

  // Wheel needs a non-passive listener to stop the page from scrolling
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      // Trackpad pinch arrives as ctrl+wheel with small deltas; scale those up
      const delta = e.ctrlKey ? e.deltaY * 8 : e.deltaY;
      zoomTo(scale * Math.exp(-delta * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo, scale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === '+' || e.key === '=') zoomBy(STEP);
      else if (e.key === '-' || e.key === '_') zoomBy(1 / STEP);
      else if (e.key === '0') fitToView();
      else if (e.key === '1') actualSize();
      else if (e.key.toLowerCase() === 'r') rotate(e.shiftKey ? -1 : 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomBy, fitToView, actualSize, rotate]);

  const canPan = imgW * scale > box.w + 1 || imgH * scale > box.h + 1;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !canPan) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: view.fit ? 0 : view.x, oy: view.fit ? 0 : view.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const pos = clamp(scale, d.ox + e.clientX - d.x, d.oy + e.clientY - d.y);
    setView((v) => ({ ...v, scale, ...pos, fit: false }));
  };
  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    if (view.fit || scale <= fitScale + 1e-3) {
      zoomTo(Math.max(fitScale * 2, 1), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
    } else {
      fitToView();
    }
  };

  const download = async () => {
    const name = fileName || alt || 'image';
    try {
      // Cross-origin URLs ignore <a download>, so fetch the bytes first
      const res = await fetch(src);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      window.open(src, '_blank', 'noopener');
    }
  };

  const pct = Math.round(scale * 100);
  const offset = view.fit ? { x: 0, y: 0 } : { x: view.x, y: view.y };

  return (
    <div className={cn('relative size-full', className)}>
      <div
        ref={boxRef}
        className={cn(
          'relative size-full touch-none overflow-hidden select-none',
          canPan ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
      >
        {failed ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
            This image couldn’t be loaded.
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            onError={() => {
              setFailed(true);
              onError?.();
            }}
            className={cn('absolute left-1/2 top-1/2 max-w-none', animate && !dragging && 'transition-transform duration-150 ease-out', !natural && 'opacity-0')}
            style={{
              width: natural?.w,
              height: natural?.h,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${view.rotation}deg) scale(${scale})`,
            }}
          />
        )}
      </div>

      {!natural && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label="Loading image">
          <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      )}

      {natural && !failed && (
        <div
          role="toolbar"
          aria-label="Image controls"
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-black/75 p-1 text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
        >
          <ToolButton label="Zoom out" shortcut="−" onClick={() => zoomBy(1 / STEP)} disabled={scale <= MIN_SCALE}>
            <ZoomOut />
          </ToolButton>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={fitToView}
                className="h-8 min-w-14 rounded-lg px-2 text-xs font-semibold tabular-nums hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label={`Zoom ${pct}%, reset to fit`}
              >
                {pct}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Reset to fit</TooltipContent>
          </Tooltip>
          <ToolButton label="Zoom in" shortcut="+" onClick={() => zoomBy(STEP)} disabled={scale >= MAX_SCALE}>
            <ZoomIn />
          </ToolButton>
          <Divider />
          <ToolButton label="Fit to screen" shortcut="0" onClick={fitToView} active={view.fit}>
            <Maximize />
          </ToolButton>
          <ToolButton label="Actual size" shortcut="1" onClick={actualSize} active={!view.fit && Math.abs(scale - 1) < 1e-3}>
            <Scan />
          </ToolButton>
          <Divider />
          <ToolButton label="Rotate left" shortcut="⇧R" onClick={() => rotate(-1)}>
            <RotateCcw />
          </ToolButton>
          <ToolButton label="Rotate right" shortcut="R" onClick={() => rotate(1)}>
            <RotateCw />
          </ToolButton>
          {fileActions && (
            <>
              <Divider />
              <ToolButton label="Download" onClick={download}>
                <Download />
              </ToolButton>
              <ToolButton label="Open in new tab" onClick={() => window.open(src, '_blank', 'noopener')}>
                <ExternalLink />
              </ToolButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />;
}

function ToolButton({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
            active && 'bg-white/15',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {shortcut && <span className="ms-2 text-white/60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
