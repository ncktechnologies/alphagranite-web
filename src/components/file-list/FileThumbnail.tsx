import { useEffect, useState } from 'react';
import {
  Archive,
  Box,
  FileSpreadsheet,
  FileText,
  Headphones,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileThumbnailProps {
  fileName: string;
  mimeType?: string;
  src?: string;
  className?: string;
  fit?: 'cover' | 'contain';
}

export function FileThumbnail({
  fileName,
  mimeType = '',
  src,
  className,
  fit = 'cover',
}: FileThumbnailProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const type = mimeType.toLowerCase();
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isImage = type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(extension);
  const isPdf = type.includes('pdf') || extension === 'pdf';
  const isVideo = type.startsWith('video/') || ['mp4', 'mov', 'avi', 'webm'].includes(extension);
  const isAudio = type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(extension);
  const isSpreadsheet = type.includes('sheet') || type.includes('excel') || ['xls', 'xlsx', 'csv'].includes(extension);
  const isArchive = type.includes('zip') || type.includes('rar') || ['zip', 'rar', '7z'].includes(extension);
  const isModel = type.startsWith('model/') || ['gltf', 'glb'].includes(extension);

  useEffect(() => setImageFailed(false), [src]);

  return (
    <div className={cn('relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted', className)}>
      {src && isImage && !imageFailed ? (
        <img
          src={src}
          alt={fileName}
          loading="lazy"
          onError={() => setImageFailed(true)}
          className={cn('size-full', fit === 'cover' ? 'object-cover' : 'object-contain')}
        />
      ) : src && isPdf ? (
        <iframe
          src={`${src}${src.includes('#') ? '&' : '#'}page=1&toolbar=0&navpanes=0&view=FitH`}
          title={`Preview of ${fileName}`}
          tabIndex={-1}
          loading="lazy"
          className="pointer-events-none size-full border-0 bg-white"
        />
      ) : isImage ? (
        <ImageIcon className="size-10 text-muted-foreground" aria-hidden="true" />
      ) : isVideo ? (
        <Video className="size-10 text-red-500" aria-hidden="true" />
      ) : isAudio ? (
        <Headphones className="size-10 text-purple-500" aria-hidden="true" />
      ) : isSpreadsheet ? (
        <FileSpreadsheet className="size-10 text-green-600" aria-hidden="true" />
      ) : isArchive ? (
        <Archive className="size-10 text-amber-500" aria-hidden="true" />
      ) : isModel ? (
        <Box className="size-10 text-indigo-600" aria-hidden="true" />
      ) : (
        <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  );
}