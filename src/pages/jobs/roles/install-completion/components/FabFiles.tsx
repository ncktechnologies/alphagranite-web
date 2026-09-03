import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardHeading } from '@/components/ui/card';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '../../drafters/components';

interface FabFilesGalleryProps {
  fab: any; // Accept the full FAB object
}

export function FabFilesGallery({ fab }: FabFilesGalleryProps) {
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  // ─── Build file sources (same logic as SalesDetailsPage) ──────────────
  const fileSources: FileSource[] = (() => {
    if (!fab) return [];
    const sources: FileSource[] = [];

    const toUnifiedFiles = (files: any[]): UnifiedFile[] =>
      (files ?? []).map((f): UnifiedFile => ({
        id: String(f.id),
        name: f.name || f.filename || `File_${f.id}`,
        size: parseInt(f.file_size) || f.size || 0,
        type: f.file_type || f.mime_type || 'application/octet-stream',
        url: f.file_url || f.url || '',
        stage_name: f.stage_name ?? f.stage,
        stage: f.stage_name ?? f.stage,
        file_design: f.file_design,
        uploaded_by_name: f.uploaded_by_name ?? f.uploader_name,
        uploadedBy: f.uploaded_by_name ?? f.uploader_name,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
      }));

    if (fab.draft_data?.files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.draft_data.files) });
    if (fab.slabsmith_data?.files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.slabsmith_data.files) });
    if (fab.sales_ct_data?.files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.sales_ct_data.files) });
    if (fab.cnc_data?.files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.cnc_data.files) });
    if (fab.files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.files) });
    if (fab.operator_files?.length) sources.push({ kind: 'raw', data: toUnifiedFiles(fab.operator_files) });

    const shopRevisionFiles: any[] = [];
    (fab.shop_revisions || []).forEach((rev: any) => {
      if (rev.files?.length) shopRevisionFiles.push(...rev.files);
    });
    if (shopRevisionFiles.length) sources.push({ kind: 'raw', data: toUnifiedFiles(shopRevisionFiles) });

    return sources;
  })();

  const totalFileCount = fileSources.reduce((sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0), 0);

  if (activeFile) {
    return <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading className="flex flex-col items-start py-4">
          <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
            FAB Files
            {totalFileCount > 0 && (
              <span className="ml-2 text-base font-normal text-gray-400">({totalFileCount})</span>
            )}
          </CardTitle>
          <p className="text-sm text-[#4B5563]">
            Drafting, SlabSmith, Sales CT, CNC, Operator, and Shop Revision files
          </p>
        </CardHeading>
      </CardHeader>
      <CardContent>
        <FileGallery
          sources={fileSources}
          onFileClick={(file) => setActiveFile(file)}
          defaultLayout="card"
          emptyMessage="No files have been uploaded for this FAB yet."
        />
      </CardContent>
    </Card>
  );
}