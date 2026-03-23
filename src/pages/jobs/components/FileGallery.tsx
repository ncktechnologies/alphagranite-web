import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/hooks/use-file-upload';
import { WORKFLOW_STAGES, getFileStage, getStageBadge } from '@/utils/file-labeling';
import { Can } from '@/components/permission';
import {
  FileTextIcon,
  FileArchiveIcon,
  HeadphonesIcon,
  VideoIcon,
  ImageIcon,
  FileSpreadsheetIcon,
  Trash2,
  Eye,
  Download,
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
  type?: string;           // MIME type or generic ('photo','video','document')
  url: string;
  // workflow stage label (human-friendly). Prefer `stage_name` when available.
  stage?: string;
  // workflow stage key (e.g. "final_programming")
  stage_name?: string;
  file_design?: string;
  uploaded_by_name?: string;
  // Legacy display field
  uploadedBy?: string;
  uploadedAt?: Date | string;
  // raw source data (preserved for callers)
  _raw?: any;
}

export type FileSource =
  | { kind: 'drafting';    data: any }   // fab drafting API response
  | { kind: 'slabsmith';   data: any }   // slab smith API response
  | { kind: 'job-media';   data: any[] } // job media array
  | { kind: 'raw';         data: UnifiedFile[] }; // already-normalised

interface FileGalleryProps {
  /** One or more file sources to merge and display */
  sources: FileSource[];
  /** Card or table layout – user can toggle unless you lock it */
  defaultLayout?: 'card' | 'table';
  /** Hide the layout toggle button */
  lockLayout?: boolean;
  /** Show search + type filter toolbar */
  showToolbar?: boolean;
  /** Permission subject for delete action */
  deletePermissionSubject?: string;
  /** Called when user clicks View / row */
  onFileClick?: (file: UnifiedFile) => void;
  /** Called when user clicks Delete */
  onDeleteFile?: (file: UnifiedFile) => void;
  /** Extra class on the root element */
  className?: string;
  /** Message shown when there are no files */
  emptyMessage?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getMimeType = (name: string, rawType?: string): string => {
  if (rawType && !['photo', 'video', 'document'].includes(rawType)) return rawType;
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    mp3: 'audio/mpeg', wav: 'audio/wav',
  };
  return map[ext] ?? 'application/octet-stream';
};

const getCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'other' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('doc')) return 'doc';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'sheet';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'other';
};

/** Normalise any source shape into UnifiedFile[] */
const normaliseSource = (source: FileSource): UnifiedFile[] => {
  switch (source.kind) {
    case 'raw':
      return source.data;

    case 'job-media':
      return (source.data ?? []).map((f: any): UnifiedFile => ({
        id: String(f.id),
        name: f.name || f.file_name || `File_${f.id}`,
        size: parseInt(f.file_size) || f.size || 0,
        type: getMimeType(f.name || f.file_name || '', f.file_type || f.type),
        url: f.file_url || f.url || '',
        stage_name: f.stage_name ?? f.stage,
        stage: f.stage_name ?? f.stage,
        file_design: f.file_design,
        uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedBy: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
      }));

    case 'drafting': {
      const d = source.data;
      if (!d) return [];
      const files: any[] = Array.isArray(d.files) && d.files.length > 0
        ? d.files
        : d.file_ids
          ? d.file_ids.split(',').filter(Boolean).map((id: string, i: number) => ({
              id: id.trim(), name: `${i + 1}.pdf`, file_type: 'application/pdf',
            }))
          : [];
      return files.map((f: any): UnifiedFile => {
        const stageLabel = getFileStage(f.filename || f.name, {
          isDrafting: true,
        });
        return ({
        id: String(f.id),
        name: f.filename || f.name || `File_${f.id}`,
        size: parseInt(f.file_size) || parseInt(f.size) || 0,
        type: getMimeType(f.filename || f.name || '', f.file_type || f.mime_type),
        url: f.file_url || f.url || '',
        stage_name: f.stage_name ?? f.stage ?? stageLabel.stage,
        stage: f.stage_name ?? f.stage ?? stageLabel.stage,
        file_design: f.file_design,
        uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedBy: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
        });
      });
    }

    case 'slabsmith': {
      const s = source.data;
      if (!s) return [];
      const files: any[] = Array.isArray(s.files) ? s.files : [];
      return files.map((f: any): UnifiedFile => {
        const stage_name = f.stage_name ?? 'slab_smith';
        const stageLabel = WORKFLOW_STAGES[stage_name];
        return ({
        id: String(f.id),
        name: f.name || f.filename || `SlabSmith_${f.id}`,
        size: parseInt(f.file_size) || 0,
        type: getMimeType(f.name || '', f.file_type),
        url: f.file_url || f.url || '',
        stage_name,
        stage: stageLabel?.label ?? stage_name,
        file_design: f.file_design,
        uploaded_by_name: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedBy: f.uploaded_by_name ?? f.uploader_name ?? f.uploaded_by,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
        });
      });
    }

    default:
      return [];
  }
};

// ─── File icon ────────────────────────────────────────────────────────────────

function FileIcon({ mimeType, url, className }: { mimeType: string; url?: string; className?: string }) {
  const cat = getCategory(mimeType);
  const cls = cn('shrink-0', className);
  if (cat === 'image') return <img src="/images/app/img.svg" alt="img" className={cls} />;
  if (cat === 'pdf')   return <img src="/images/app/pdf.svg" alt="pdf" className={cls} />;
  if (cat === 'doc')   return <img src="/images/app/doc.svg" alt="doc" className={cls} />;
  if (cat === 'video') return <VideoIcon className={cn('text-red-500', cls)} />;
  if (cat === 'audio') return <HeadphonesIcon className={cn('text-purple-500', cls)} />;
  if (cat === 'sheet') return <FileSpreadsheetIcon className={cn('text-green-600', cls)} />;
  if (cat === 'archive') return <FileArchiveIcon className={cn('text-amber-500', cls)} />;
  return <FileTextIcon className={cn('text-gray-500', cls)} />;
}

// ─── Thumbnail for image files ─────────────────────────────────────────────

function FileThumbnail({ file }: { file: UnifiedFile }) {
  const cat = getCategory(file.type ?? '');
  if (cat === 'image') {
    return (
      <img
        src={file.url}
        alt={file.name}
        className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <FileIcon mimeType={file.type ?? ''} className="size-10 opacity-60" />
    </div>
  );
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
  const stageKey = file.stage_name;
  const stageObj = stageKey && WORKFLOW_STAGES[stageKey]
    ? WORKFLOW_STAGES[stageKey]
    : getFileStage(file.name, { currentStage: stageKey, isDrafting: false });
  const badge = getStageBadge(stageObj);

  return (
    <div className="group relative rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200">
      {/* Thumbnail area */}
      <div
        className="aspect-video bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onView?.(file)}
      >
        <FileThumbnail file={file} />
      </div>

      {/* Stage badge overlay */}
      {badge.label && (
        <span className={cn('absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded font-medium', badge.className)}>
          {badge.label}
        </span>
      )}

      {/* Info */}
      <div className="p-3 space-y-2">
        <p
          className="text-sm font-semibold text-gray-800 truncate cursor-pointer hover:text-primary"
          title={file.name}
          onClick={() => onView?.(file)}
        >
          {file.name}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {file.size ? <span>{formatBytes(file.size)}</span> : null}
          {file.stage_name && <span>· {file.stage_name}</span>}
          {file.file_design && <span>· {file.file_design}</span>}
          {(file.uploaded_by_name ?? file.uploadedBy) && <span>· {file.uploaded_by_name ?? file.uploadedBy}</span>}
        </div>

        {file.uploadedAt && (
          <p className="text-xs text-gray-400">
            {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onView?.(file)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>

          {onDelete && (
            deletePermissionSubject ? (
              <Can action="delete" on={deletePermissionSubject}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                  onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </Can>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                onClick={(e) => { e.stopPropagation(); onDelete(file); }}
              >
                <Trash2 className="size-3" />
              </Button>
            )
          )}
        </div>
      </div>
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
  const stageKey = file.stage_name;
  const stageObj = stageKey && WORKFLOW_STAGES[stageKey]
    ? WORKFLOW_STAGES[stageKey]
    : getFileStage(file.name, { currentStage: stageKey, isDrafting: false });
  const badge = getStageBadge(stageObj);

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onView?.(file)}
    >
      {/* Icon + name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="size-8 flex items-center justify-center rounded-lg bg-gray-100 shrink-0">
            <FileIcon mimeType={file.type ?? ''} className="size-4" />
          </div>
          <span className="text-sm font-medium text-gray-800 truncate max-w-[260px]" title={file.name}>
            {file.name}
          </span>
        </div>
      </td>

      {/* Stage */}
      <td className="py-3 px-4">
        {/* {badge.label && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', badge.className)}>
            {badge.label}
          </span>
        )} */}
        {file.stage_name && (
          <div className="text-[10px] text-gray-400 mt-1">
            {file.stage_name}
          </div>
        )}
        {file.file_design && (
          <div className="text-[10px] text-gray-400 mt-1">
            Type: {file.file_design}
          </div>
        )}
      </td>

      {/* Size */}
      <td className="py-3 px-4 text-xs text-gray-500">
        {file.size ? formatBytes(file.size) : '—'}
      </td>

      {/* Uploaded by */}
      <td className="py-3 px-4 text-xs text-gray-500">
        {file.uploaded_by_name ?? file.uploadedBy ?? '—'}
      </td>

      {/* Date */}
      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '—'}
      </td>

      {/* Actions */}
      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={() => onView?.(file)}>
            <Eye className="size-3.5 text-gray-500" />
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
  const [layout, setLayout] = useState<'card' | 'table'>(defaultLayout);
  const [search, setSearch] = useState('');
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

  // Category counts for the filter dropdown
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
      const matchType = typeFilter === 'all' || getCategory(f.type ?? '') === typeFilter;
      return matchSearch && matchType;
    });
  }, [allFiles, search, typeFilter]);

  const handleView = useCallback((file: UnifiedFile) => {
    onFileClick?.(file);
  }, [onFileClick]);

  const handleDelete = useCallback((file: UnifiedFile) => {
    onDeleteFile?.(file);
  }, [onDeleteFile]);

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
                { value: 'all',     label: 'All files' },
                { value: 'image',   label: 'Images' },
                { value: 'pdf',     label: 'PDFs' },
                { value: 'doc',     label: 'Documents' },
                { value: 'video',   label: 'Videos' },
                { value: 'audio',   label: 'Audio' },
                { value: 'sheet',   label: 'Spreadsheets' },
                { value: 'archive', label: 'Archives' },
                { value: 'other',   label: 'Other' },
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

          {/* Count badge */}
          <span className="text-xs text-gray-400 ml-auto">
            {filtered.length} of {allFiles.length} file{allFiles.length !== 1 ? 's' : ''}
          </span>

          {/* Layout toggle */}
          {!lockLayout && (
            <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
              <button
                className={cn(
                  'p-1.5 transition-colors',
                  layout === 'card' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50'
                )}
                onClick={() => setLayout('card')}
                title="Card view"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                className={cn(
                  'p-1.5 transition-colors',
                  layout === 'table' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50'
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

      {/* Card grid */}
      {filtered.length > 0 && layout === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((file) => (
            <FileCard
              key={String(file.id)}
              file={file}
              onView={onFileClick ? handleView : undefined}
              onDelete={onDeleteFile ? handleDelete : undefined}
              deletePermissionSubject={deletePermissionSubject}
            />
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && layout === 'table' && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Name', 'Stage', 'Size', 'Uploaded by', 'Date', ''].map((h) => (
                  <th key={h} className="py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
                  onView={onFileClick ? handleView : undefined}
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