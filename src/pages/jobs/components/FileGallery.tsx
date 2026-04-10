import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/hooks/use-file-upload';
import { WORKFLOW_STAGES, getFileStage, getStageBadge } from '@/utils/file-labeling';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  };
  return map[ext] ?? 'application/octet-stream';
};

const getCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'other' => {
  if (mimeType.startsWith('image/'))  return 'image';
  if (mimeType.startsWith('video/'))  return 'video';
  if (mimeType.startsWith('audio/'))  return 'audio';
  if (mimeType.includes('pdf'))       return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('doc')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'sheet';
  if (mimeType.includes('zip') || mimeType.includes('rar'))    return 'archive';
  return 'other';
};

// ── Resolve stage label + className from a file ───────────────────────────────
// Priority: stage_name → stage → 'general'
function resolveStage(file: UnifiedFile): { label: string; className: string } {
  const stageKey = file.stage_name || file.stage || 'general';
  const stageObj = WORKFLOW_STAGES[stageKey]
    ?? getFileStage(file.name, { currentStage: stageKey, isDrafting: false });
  const badge = getStageBadge(stageObj);
  return {
    label:     badge?.label     || stageKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    className: badge?.className || 'bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded',
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
  return <FileTextIcon className={cn('text-gray-500', cls)} />;
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

  const raw        = (file._raw ?? {}) as any;
  const fileType   = raw.file_type   ?? '';
  const fileDesign = raw.file_design ?? file.file_design ?? '';

  return (
    <div className="relative rounded-lg border border-[#e2e4ed] p-4 transition-colors hover:border-gray-400 bg-white">
      {/* Top row: icon centred + delete top-right */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Icon */}
          <div className="size-8 flex items-center justify-center rounded">
            <FileIcon mimeType={file.type ?? ''} className="size-8" />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 w-full">
            <p
              className="text-[14px] text-black font-bold truncate cursor-pointer hover:text-primary"
              title={file.name}
              onClick={() => onView?.(file)}
            >
              {file.name}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-1">
              {/* Size */}
              {file.size ? (
                <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
              ) : null}

              {/* ✅ Stage — stage_name → stage → 'general' */}
              <span className={cn('w-fit', stageCls)}>{stageLabel}</span>

              {/* File type (qa, etc.) */}
              {fileType && (
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded uppercase">
                  {fileType}
                </span>
              )}

              {/* File design */}
              {fileDesign && (
                <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-0.5 rounded">
                  {fileDesign.replace(/_/g, ' ')}
                </span>
              )}

              {/* Uploader */}
              {(file.uploaded_by_name ?? file.uploadedBy) && (
                <span className="text-xs text-muted-foreground bg-blue-50 px-2 py-0.5 rounded">
                  {file.uploaded_by_name ?? file.uploadedBy}
                </span>
              )}

              {/* Date */}
              {file.uploadedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete — top right */}
         {onDelete && (
        deletePermissionSubject ? (
          <Can action="delete" on={deletePermissionSubject}>
            <button
              className="absolute top-4 right-4 size-6 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
              onClick={(e) => { e.stopPropagation(); onDelete(file); }}
            >
              <X className="size-3" />
            </button>
          </Can>
        ) : (
          <button
            className="absolute top-4 right-4 size-6 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
            onClick={(e) => { e.stopPropagation(); onDelete(file); }}
          >
            <X className="size-3" />
          </button>
        )
      )}
      </div>

      {/* View button */}
      <Button
        onClick={() => onView?.(file)}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="View file"
      >
        <Eye className="w-4 h-4 text-blue-500" />
      </Button>
    </div>
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
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onView?.(file)}
    >
      {/* Icon + name + size */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="size-8 flex items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <FileIcon mimeType={file.type ?? ''} className="size-4" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-gray-800 truncate max-w-[220px]"
              title={file.name}
            >
              {file.name}
            </p>
            {file.size ? (
              <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
            ) : null}
          </div>
        </div>
      </td>

      {/* ✅ Stage */}
      <td className="py-3 px-4">
        <span className={cn('w-fit whitespace-nowrap', stageCls)}>{stageLabel}</span>
      </td>

      {/* Type + design */}
      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          {fileType && (
            <span className="text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded w-fit uppercase">
              {fileType}
            </span>
          )}
          {fileDesign && (
            <span className="text-[11px] text-gray-500 bg-blue-50 px-2 py-0.5 rounded w-fit">
              {fileDesign.replace(/_/g, ' ')}
            </span>
          )}
          {!fileType && !fileDesign && <span className="text-xs text-gray-400">—</span>}
        </div>
      </td>

      {/* Uploaded by */}
      <td className="py-3 px-4">
        <span className="text-xs text-gray-700 font-medium">
          {file.uploaded_by_name ?? file.uploadedBy ?? '—'}
        </span>
      </td>

      {/* Date + time */}
      <td className="py-3 px-4 whitespace-nowrap">
        {file.uploadedAt ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-gray-700">
              {new Date(file.uploadedAt).toLocaleDateString()}
            </span>
            <span className="text-[11px] text-gray-400">
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

  const handleView   = useCallback((file: UnifiedFile) => { onFileClick?.(file);  }, [onFileClick]);
  const handleDelete = useCallback((file: UnifiedFile) => { onDeleteFile?.(file); }, [onDeleteFile]);

  return (
    <div className={cn('space-y-4', className)}>

      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
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
                <X className="size-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <Filter className="size-3.5 mr-1.5 text-gray-400" />
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
                      <span className="ml-1.5 text-xs text-gray-400">({categoryCounts[value]})</span>
                    )}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Count */}
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} of {allFiles.length} file{allFiles.length !== 1 ? 's' : ''}
          </span>

          {/* Layout toggle */}
          {!lockLayout && (
            <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
              <button
                className={cn(
                  'p-1.5 transition-colors',
                  layout === 'card'
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-400 hover:bg-gray-50'
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
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-400 hover:bg-gray-50'
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
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <File className="size-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  gap-4">
          {filtered.map((file) => (
            <FileCard
              key={String(file.id)}
              file={file}
              onView={onFileClick   ? handleView   : undefined}
              onDelete={onDeleteFile ? handleDelete : undefined}
              deletePermissionSubject={deletePermissionSubject}
            />
          ))}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && layout === 'table' && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Name', 'Stage', 'Type ', 'Uploaded by', 'Date', ''].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
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
                  onView={onFileClick   ? handleView   : undefined}
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