import { useMemo, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/hooks/use-file-upload';
import { WORKFLOW_STAGES, getFileStage, getStageBadge, normalizeStageKey } from '@/utils/file-labeling';
import { Can } from '@/components/permission';
import {
  FileTextIcon,
  FileArchiveIcon,
  HeadphonesIcon,
  VideoIcon,
  FileSpreadsheetIcon,
  Trash2,
  Eye,
  LayoutGrid,
  List,
  Search,
  Filter,
  X,
  File,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedFile {
  id: string | number;
  name: string;
  size?: number;
  type?: string;
  url: string;
  stage?: string;
  stage_name?: string;
  file_design?: string;
  uploaded_by_name?: string;
  uploadedBy?: string;
  uploadedAt?: Date | string;
  _raw?: any;
}

export type FileSource =
  | { kind: 'drafting';  data: any }
  | { kind: 'slabsmith'; data: any }
  | { kind: 'job-media'; data: any[] }
  | { kind: 'raw';       data: UnifiedFile[] };

interface FileGalleryProps {
  sources: FileSource[];
  defaultLayout?: 'card' | 'table';
  lockLayout?: boolean;
  showToolbar?: boolean;
  deletePermissionSubject?: string;
  onFileClick?: (file: UnifiedFile) => void;
  onDeleteFile?: (file: UnifiedFile) => void;
  className?: string;
  emptyMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMimeType = (name: string, rawType?: string): string => {
  if (rawType && !['photo', 'video', 'document'].includes(rawType)) return rawType;
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif',  webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4',  mov: 'video/quicktime', avi: 'video/x-msvideo',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    mp3: 'audio/mpeg',  wav: 'audio/wav',
    gltf: 'model/gltf+json', glb: 'model/gltf-binary',
  };
  return map[ext] ?? 'application/octet-stream';
};

const getCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'model' | 'other' => {
  if (mimeType.startsWith('image/'))  return 'image';
  if (mimeType.startsWith('video/'))  return 'video';
  if (mimeType.startsWith('audio/'))  return 'audio';
  if (mimeType.includes('pdf'))       return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('doc')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'sheet';
  if (mimeType.includes('zip') || mimeType.includes('rar'))    return 'archive';
  if (mimeType.startsWith('model/'))   return 'model';
  return 'other';
};

// ── Resolve stage label + className from a file ───────────────────────────────
// Priority: stage_name → stage → 'general'
function resolveStage(file: UnifiedFile): { label: string; className: string } {
  // 1. Get raw stage from backend (stage_name > stage > fallback)
  const rawStage = file.stage_name || file.stage || 'general';
  
  // 2. Normalise to match WORKFLOW_STAGES keys (e.g. "CNC" → "cnc", "Cut List" → "cut_list")
  const normalisedKey = normalizeStageKey(rawStage);
  
  // 3. Try to find exact match in WORKFLOW_STAGES
  let stageObj = WORKFLOW_STAGES[normalisedKey];
  
  // 4. If not found, use filename-based detection (pass normalised key as currentStage hint)
  if (!stageObj) {
    stageObj = getFileStage(file.name, { currentStage: normalisedKey });
  }
  
  // 5. Get badge (safe against undefined)
  const badge = getStageBadge(stageObj);
  
  // 6. Return label (use rawStage for display if badge label is fallback)
  return {
    label: badge.label === 'Unknown' ? rawStage.replace(/_/g, ' ') : badge.label,
    className: badge.className
  };
}

const normaliseSource = (source: FileSource): UnifiedFile[] => {
  switch (source.kind) {
    case 'raw':
      return source.data;

    case 'job-media':
      return (source.data ?? []).map((f: any): UnifiedFile => ({
        id:               String(f.id),
        name:             f.name || f.file_name || `File_${f.id}`,
        size:             parseInt(f.file_size) || f.size || 0,
        type:             getMimeType(f.name || f.file_name || '', f.file_type || f.type),
        url:              f.file_url || f.url || '',
        stage_name:       f.stage_name ?? f.stage,
        stage:            f.stage_name ?? f.stage,
        file_design:      f.file_design,
        uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedBy:       f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedAt:       f.created_at ? new Date(f.created_at) : undefined,
        _raw:             f,
      }));

    case 'drafting': {
      const d = source.data;
      if (!d) return [];
      const files: any[] =
        Array.isArray(d.files) && d.files.length > 0
          ? d.files
          : d.file_ids
            ? d.file_ids.split(',').filter(Boolean).map((id: string, i: number) => ({
                id: id.trim(), name: `${i + 1}.pdf`, file_type: 'application/pdf',
              }))
            : [];
      return files.map((f: any): UnifiedFile => {
        const stageLabel = getFileStage(f.filename || f.name, { isDrafting: true });
        return {
          id:               String(f.id),
          name:             f.filename || f.name || `File_${f.id}`,
          size:             parseInt(f.file_size) || parseInt(f.size) || 0,
          type:             getMimeType(f.filename || f.name || '', f.file_type || f.mime_type),
          url:              f.file_url || f.url || '',
          stage_name:       f.stage_name ?? f.stage ?? stageLabel.stage,
          stage:            f.stage_name ?? f.stage ?? stageLabel.stage,
          file_design:      f.file_design,
          uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
          uploadedBy:       f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
          uploadedAt:       f.created_at ? new Date(f.created_at) : undefined,
          _raw:             f,
        };
      });
    }

    case 'slabsmith': {
      const s = source.data;
      if (!s) return [];
      const files: any[] = Array.isArray(s.files) ? s.files : [];
      return files.map((f: any): UnifiedFile => {
        const stage_name = f.stage_name ?? 'slab_smith';
        const stageLabel = WORKFLOW_STAGES[stage_name];
        return {
          id:               String(f.id),
          name:             f.name || f.filename || `SlabSmith_${f.id}`,
          size:             parseInt(f.file_size) || 0,
          type:             getMimeType(f.name || '', f.file_type),
          url:              f.file_url || f.url || '',
          stage_name,
          stage:            stageLabel?.label ?? stage_name,
          file_design:      f.file_design,
          uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
          uploadedBy:       f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
          uploadedAt:       f.created_at ? new Date(f.created_at) : undefined,
          _raw:             f,
        };
      });
    }

    default:
      return [];
  }
};

// ─── File icon ────────────────────────────────────────────────────────────────

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cat = getCategory(mimeType);
  const cls = cn('shrink-0', className);
  if (cat === 'image')   return <img src="/images/app/img.svg"  alt="img"  className={cls} />;
  if (cat === 'pdf')     return <img src="/images/app/pdf.svg"  alt="pdf"  className={cls} />;
  if (cat === 'doc')     return <img src="/images/app/doc.svg"  alt="doc"  className={cls} />;
  if (cat === 'video')   return <VideoIcon           className={cn('text-red-500',    cls)} />;
  if (cat === 'audio')   return <HeadphonesIcon      className={cn('text-purple-500', cls)} />;
  if (cat === 'sheet')   return <FileSpreadsheetIcon className={cn('text-green-600',  cls)} />;
  if (cat === 'archive') return <FileArchiveIcon     className={cn('text-amber-500',  cls)} />;
  if (cat === 'model')   return <LayoutGrid className={cn('text-indigo-600', cls)} />;
  return <FileTextIcon className={cn('text-muted-foreground', cls)} />;
}

// ─── Card view ────────────────────────────────────────────────────────────────

function FileCard({
  file,
  onView,
  onDelete,
  deletePermissionSubject,
}: {
  file: UnifiedFile;
  onView?: (f: UnifiedFile) => void;
  onDelete?: (f: UnifiedFile) => void;
  deletePermissionSubject?: string;
}) {
  const { label: stageLabel, className: stageCls } = resolveStage(file);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const raw        = (file._raw ?? {}) as any;
  const fileDesign = raw.file_design ?? file.file_design ?? '';
  const fileType   = raw.file_type ?? '';
  const category   = getCategory(file.type ?? '');
  const isImage    = category === 'image';
  const isPdf      = category === 'pdf';

  // Format date with both date and time
  const formattedDate = file.uploadedAt
    ? new Date(file.uploadedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <article className="group overflow-hidden rounded-md border border-border bg-background transition-shadow hover:shadow-md">
      <button
        type="button"
        className="relative block aspect-[16/9] w-full overflow-hidden bg-muted text-left"
        onClick={() => onView?.(file)}
        aria-label={`Preview ${file.name}`}
      >
        {isImage && file.url && !thumbnailFailed ? (
          <img
            src={file.url}
            alt={file.name}
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : isPdf && file.url ? (
          <iframe
            src={`${file.url}${file.url.includes('#') ? '&' : '#'}page=1&toolbar=0&navpanes=0&view=FitH`}
            title={`Preview of ${file.name}`}
            tabIndex={-1}
            className="pointer-events-none size-full border-0 bg-white"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FileIcon mimeType={file.type ?? ''} className="size-12" />
          </div>
        )}
        <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
        {(isImage || isPdf) && (
          <span className="absolute left-3 top-3 rounded-sm bg-black/65 px-2 py-1 text-[11px] font-medium uppercase text-white">
            {isImage ? 'Image' : 'PDF'}
          </span>
        )}
        {file.size ? (
          <span className="absolute bottom-3 right-3 rounded-sm bg-black/65 px-2 py-1 text-xs text-white">
            {formatBytes(file.size)}
          </span>
        ) : null}
      </button>

      <div className="space-y-3 p-3.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 truncate text-left text-sm font-semibold text-foreground hover:text-primary"
            title={file.name}
            onClick={() => onView?.(file)}
          >
            {file.name}
          </button>
          {onDelete && (
            deletePermissionSubject ? (
              <Can action="delete" on={deletePermissionSubject}>
                <button
                  type="button"
                  className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(file)}
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </Can>
            ) : (
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(file)}
                aria-label={`Delete ${file.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            )
          )}
        </div>

        <div className="flex min-h-6 flex-wrap items-center gap-1.5">
          <span className={cn('w-fit', stageCls)}>{stageLabel}</span>
          {fileType && (
            <span className="rounded-sm bg-accent px-2 py-0.5 text-xs font-medium uppercase text-secondary-foreground">
              {fileType}
            </span>
          )}
          {fileDesign && (
            <span className="rounded-sm bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {fileDesign.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          <span className="truncate" title={file.uploaded_by_name ?? file.uploadedBy}>
            {file.uploaded_by_name ?? file.uploadedBy ?? 'Unknown uploader'}
          </span>
          {formattedDate && <time className="shrink-0">{formattedDate}</time>}
        </div>
      </div>
    </article>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function FileRow({
  file,
  onView,
  onDelete,
  deletePermissionSubject,
}: {
  file: UnifiedFile;
  onView?: (f: UnifiedFile) => void;
  onDelete?: (f: UnifiedFile) => void;
  deletePermissionSubject?: string;
}) {
  // ✅ stage_name → stage → 'general'
  const { label: stageLabel, className: stageCls } = resolveStage(file);

  const raw        = (file._raw ?? {}) as any;
  const fileType   = raw.file_type   ?? '';
  const fileDesign = raw.file_design ?? file.file_design ?? '';

  return (
    <tr
      className="border-b border-border hover:bg-muted transition-colors cursor-pointer"
      onClick={() => onView?.(file)}
    >
      {/* Icon + name + size */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="size-8 flex items-center justify-center rounded-lg bg-accent shrink-0">
            <FileIcon mimeType={file.type ?? ''} className="size-4" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-foreground truncate max-w-[220px]"
              title={file.name}
            >
              {file.name}
            </p>
            {file.size ? (
              <p className="text-xs text-placeholder mt-0.5">{formatBytes(file.size)}</p>
            ) : null}
          </div>
        </div>
      </td>

      {/* Stage */}
      <td className="py-3 px-4">
        <span className={cn('w-fit whitespace-nowrap', stageCls)}>{stageLabel}</span>
      </td>

      {/* Type + design */}
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          {fileType && (
            <span className="text-[12px] font-medium text-secondary-foreground bg-accent px-2 py-0.5 rounded w-fit uppercase">
              {fileType}
            </span>
          )}
          {fileDesign && (
            <span className="text-[12px] text-blue-700 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-300 px-2 py-0.5 rounded w-fit">
              {fileDesign.replace(/_/g, ' ')}
            </span>
          )}
          {!fileType && !fileDesign && <span className="text-xs text-placeholder">—</span>}
        </div>
      </td>

      {/* Uploaded by */}
      <td className="py-3 px-4">
        <span className="text-xs text-secondary-foreground font-medium">
          {file.uploaded_by_name ?? file.uploadedBy ?? '—'}
        </span>
      </td>

      {/* Date + time (two-line) */}
      <td className="py-3 px-4 whitespace-nowrap">
        {file.uploadedAt ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-secondary-foreground">
              {new Date(file.uploadedAt).toLocaleDateString()}
            </span>
            <span className="text-[12px] text-placeholder">
              {new Date(file.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ) : '—'}
      </td>

      {/* Actions */}
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onView?.(file)}
          >
            <Eye className="size-3.5 text-blue-500" />
          </Button>

          {onDelete && (
            deletePermissionSubject ? (
              <Can action="delete" on={deletePermissionSubject}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(file)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </Can>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete(file)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FileGallery({
  sources,
  defaultLayout = 'card',
  lockLayout = false,
  showToolbar = true,
  deletePermissionSubject,
  onFileClick,
  onDeleteFile,
  className,
  emptyMessage = 'No files available.',
}: FileGalleryProps) {
  const [layout, setLayout]         = useState<'card' | 'table'>(defaultLayout);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Merge + normalise all sources, deduplicate by id
  const allFiles = useMemo(() => {
    const seen = new Set<string>();
    return sources
      .flatMap(normaliseSource)
      .filter((f) => {
        const key = String(f.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [sources]);

  // Category counts for the type filter dropdown
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allFiles.length };
    allFiles.forEach((f) => {
      const cat = getCategory(f.type ?? '');
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [allFiles]);

  const filtered = useMemo(() => {
    return allFiles.filter((f) => {
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
      const matchType   = typeFilter === 'all' || getCategory(f.type ?? '') === typeFilter;
      return matchSearch && matchType;
    });
  }, [allFiles, search, typeFilter]);

  const previewFiles = useMemo(
    () => filtered.filter((file) => ['image', 'pdf'].includes(getCategory(file.type ?? ''))),
    [filtered]
  );
  const previewIndex = previewFiles.findIndex((file) => String(file.id) === previewFileId);
  const previewFile = previewFiles[previewIndex] ?? null;

  const movePreview = useCallback((direction: -1 | 1) => {
    const nextFile = previewFiles[previewIndex + direction];
    if (nextFile) setPreviewFileId(String(nextFile.id));
  }, [previewFiles, previewIndex]);

  useEffect(() => {
    if (!previewFile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && previewIndex > 0) {
        event.preventDefault();
        movePreview(-1);
      } else if (event.key === 'ArrowRight' && previewIndex < previewFiles.length - 1) {
        event.preventDefault();
        movePreview(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePreview, previewFile, previewFiles.length, previewIndex]);

  const handleView   = useCallback((file: UnifiedFile) => { onFileClick?.(file);  }, [onFileClick]);
  const handleDelete = useCallback((file: UnifiedFile) => { onDeleteFile?.(file); }, [onDeleteFile]);

  // Viewer state for 3D models
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFile, setViewerFile] = useState<UnifiedFile | null>(null);

  // Ensure model-viewer script is loaded when needed
  const ensureModelViewerLoaded = () => {
    import('@google/model-viewer').catch((e) => console.error('Failed to load <model-viewer>:', e));
  };

  const openViewer = (file: UnifiedFile) => {
    ensureModelViewerLoaded();
    setViewerFile(file);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setViewerFile(null);
  };

  // intercept view action for 3D files
  const handleViewIntercept = useCallback((file: UnifiedFile) => {
    const isModel = String(file.type || '').startsWith('model/');
    if (isModel) {
      openViewer(file);
      return;
    }
    const category = getCategory(file.type ?? '');
    if (category === 'image' || category === 'pdf') {
      setPreviewFileId(String(file.id));
      return;
    }
    onFileClick?.(file);
  }, [onFileClick]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Model viewer modal */}
      {viewerOpen && viewerFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-4xl h-[80vh] bg-background rounded-md shadow-lg overflow-hidden">
            <button
              onClick={closeViewer}
              className="absolute top-3 end-3 z-50 bg-background rounded-full p-2 shadow"
              aria-label="Close viewer"
            >
              <X />
            </button>
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {
                // Render model-viewer dynamically to avoid TS JSX typing issues
              }
              {(() => {
                const ModelViewer: any = 'model-viewer';
                return (
                  <ModelViewer
                    src={viewerFile.url}
                    alt={viewerFile.name}
                    style={{ width: '100%', height: '100%' }}
                    camera-controls
                    auto-rotate
                    exposure="1"
                    ar
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(previewFile)}
        onOpenChange={(open) => { if (!open) setPreviewFileId(null); }}
      >
        <DialogContent
          variant="fullscreen"
          className="overflow-hidden border-0 bg-neutral-950 p-0 text-white sm:rounded-none [&>button]:text-white [&>button]:hover:bg-white/10"
        >
          {previewFile && (
            <>
              <DialogTitle className="sr-only">{previewFile.name}</DialogTitle>
              <div className="flex min-h-16 items-center gap-4 border-b border-white/10 px-5 py-3 pr-16">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{previewFile.name}</p>
                  <p className="mt-1 truncate text-xs text-white/60">
                    {[previewFile.size ? formatBytes(previewFile.size) : null,
                      resolveStage(previewFile).label,
                      (previewFile._raw as any)?.file_design ?? previewFile.file_design,
                      previewFile.uploaded_by_name ?? previewFile.uploadedBy,
                      previewFile.uploadedAt ? new Date(previewFile.uploadedAt).toLocaleString() : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-white/60">
                  {previewIndex + 1} / {previewFiles.length}
                </span>
              </div>
              <div className="relative flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-4 sm:p-8">
                {getCategory(previewFile.type ?? '') === 'image' ? (
                  <img
                    key={String(previewFile.id)}
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <iframe
                    key={String(previewFile.id)}
                    src={previewFile.url}
                    title={previewFile.name}
                    className="size-full max-w-5xl bg-white"
                  />
                )}
                {previewIndex > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 size-11 -translate-y-1/2 rounded-full shadow-lg"
                    onClick={() => movePreview(-1)}
                    aria-label="Previous file"
                    title="Previous file (Left arrow)"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                )}
                {previewIndex < previewFiles.length - 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 size-11 -translate-y-1/2 rounded-full shadow-lg"
                    onClick={() => movePreview(1)}
                    aria-label="Next file"
                    title="Next file (Right arrow)"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-placeholder" />
            <Input
              placeholder="Search files…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="size-3.5 text-placeholder hover:text-secondary-foreground" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <Filter className="size-3.5 mr-1.5 text-placeholder" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {[
                { value: 'all',     label: 'All files'    },
                { value: 'image',   label: 'Images'       },
                { value: 'pdf',     label: 'PDFs'         },
                { value: 'doc',     label: 'Documents'    },
                { value: 'video',   label: 'Videos'       },
                { value: 'audio',   label: 'Audio'        },
                { value: 'sheet',   label: 'Spreadsheets' },
                { value: 'archive', label: 'Archives'     },
                { value: 'other',   label: 'Other'        },
              ]
                .filter(({ value }) => value === 'all' || (categoryCounts[value] ?? 0) > 0)
                .map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                    {categoryCounts[value] != null && (
                      <span className="ml-1.5 text-xs text-placeholder">({categoryCounts[value]})</span>
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Count */}
          <span className="text-xs text-placeholder ml-auto">
            {filtered.length} of {allFiles.length} file{allFiles.length !== 1 ? 's' : ''}
          </span>

          {/* Layout toggle */}
          {!lockLayout && (
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                className={cn(
                  'p-1.5 transition-colors',
                  layout === 'card'
                    ? 'bg-accent text-foreground'
                    : 'text-placeholder hover:bg-muted'
                )}
                onClick={() => setLayout('card')}
                title="Card view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                className={cn(
                  'p-1.5 transition-colors',
                  layout === 'table'
                    ? 'bg-accent text-foreground'
                    : 'text-placeholder hover:bg-muted'
                )}
                onClick={() => setLayout('table')}
                title="Table view"
              >
                <List className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border bg-muted">
          <File className="size-10 text-placeholder mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || typeFilter !== 'all' ? 'No files match your filter.' : emptyMessage}
          </p>
          {(search || typeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-xs"
              onClick={() => { setSearch(''); setTypeFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* ── Card grid ──────────────────────────────────────────────────────── */}
      {filtered.length > 0 && layout === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((file) => (
            <FileCard
              key={String(file.id)}
              file={file}
              onView={handleViewIntercept}
              onDelete={onDeleteFile ? handleDelete : undefined}
              deletePermissionSubject={deletePermissionSubject}
            />
          ))}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && layout === 'table' && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted border-b border-border">
                {['Name', 'Stage', 'Type ', 'Uploaded by', 'Date', ''].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <FileRow
                  key={String(file.id)}
                  file={file}
                  onView={handleViewIntercept}
                  onDelete={onDeleteFile ? handleDelete : undefined}
                  deletePermissionSubject={deletePermissionSubject}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}