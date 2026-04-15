import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent, CardHeading } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Pencil } from 'lucide-react';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '../drafters/components';
import { BackButton } from '@/components/common/BackButton';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Can } from '@/components/permission';
import { stageConfig } from '@/utils/note-utils';

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function SalesDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  const { data: response, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
  const fab = (response as any)?.data ?? response;

  // Prepare clickable links
  const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
  const jobNumberLink = fab?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
    : '#';

  // Build file sources from actual API shape
  // Inside SalesDetailsPage, replace the fileSources building block:

const fileSources: FileSource[] = (() => {
  if (!fab) return [];
  const sources: FileSource[] = [];

  // Helper to convert API file array into UnifiedFile[]
  const toUnifiedFiles = (files: any[]): UnifiedFile[] =>
    (files ?? []).map((f): UnifiedFile => ({
      id: String(f.id),
      name: f.name || f.filename || `File_${f.id}`,
      size: parseInt(f.file_size) || f.size || 0,
      type: f.file_type || f.mime_type || 'application/octet-stream',
      url: f.file_url || f.url || '',
      stage_name: f.stage_name ?? f.stage,   // ← keep backend's stage_name
      stage: f.stage_name ?? f.stage,
      file_design: f.file_design,
      uploaded_by_name: f.uploaded_by_name ?? f.uploader_name,
      uploadedBy: f.uploaded_by_name ?? f.uploader_name,
      uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
      _raw: f,
    }));

  // Drafting files (from draft_data.files)
  if (fab.draft_data?.files?.length) {
    sources.push({ kind: 'raw', data: toUnifiedFiles(fab.draft_data.files) });
  }
  // SlabSmith files
  if (fab.slabsmith_data?.files?.length) {
    sources.push({ kind: 'raw', data: toUnifiedFiles(fab.slabsmith_data.files) });
  }
  // Sales CT files
  if (fab.sales_ct_data?.files?.length) {
    sources.push({ kind: 'raw', data: toUnifiedFiles(fab.sales_ct_data.files) });
  }
  // CNC files (if you later add cnc_data)
  if (fab.cnc_data?.files?.length) {
    sources.push({ kind: 'raw', data: toUnifiedFiles(fab.cnc_data.files) });
  }
  // Top-level files
  if (fab.files?.length) {
    sources.push({ kind: 'raw', data: toUnifiedFiles(fab.files) });
  }

  return sources;
})();

  const totalFileCount = fileSources.reduce((sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0), 0);

  // Prepare sidebar sections (Job Details + FAB Notes)
  const sidebarSections = fab
    ? [
      {
        title: 'Job Details',
        type: 'details',
        items: [
          { label: 'Account', value: fab.account_name || '—' },
          {
            label: 'Fab ID',
            value: 
              // <Link to={`/sales/${fab.id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                fab.id
              // </Link>
            
          },
          { label: 'Area', value: fab.input_area || '—' },
          {
            label: 'Material',
            value: fab.stone_type_name
              ? `${fab.stone_type_name} - ${fab.stone_color_name || ''} - ${fab.stone_thickness_value || ''}`
              : '—',
          },
          { label: 'Fab Type', value: <span className="uppercase">{fab.fab_type || '—'}</span> },
          { label: 'Edge', value: fab.edge_name || '—' },
          { label: 'Total S.F', value: fab.total_sqft?.toString() || '—' },
          { label: 'Sales Person', value: fab.sales_person_name || '—' },
          {
            label: 'Job Notes',
            value: fab.job_details?.description || 'None',
          },
        ],
      },
      {
        title: 'Notes',
        type: 'notes',
        notes: Array.isArray(fab.notes)
          ? fab.notes.map((note: string, index: number) => ({
            id: index,
            avatar: 'N',
            content: note,
            author: '',
            timestamp: '',
          }))
          : [],
      },
      {
        title: 'FAB Notes',
        type: 'notes',
        notes: Array.isArray(fab.fab_notes)
          ? fab.fab_notes.map((note: any) => {
          
            const stage = note?.stage || 'general';
            const config = stageConfig[stage] || stageConfig.general;
            return {
              id: note?.id,
              avatar: note?.created_by_name?.charAt(0).toUpperCase() || 'U',
              content: note?.note || '',
              author: note?.created_by_name || 'Unknown',
              timestamp: note?.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
              category: config.label,
              categoryColor: config.color,
            };
          })
          : [],
      },
    ]
    : [];

  const handleFileClick = (file: UnifiedFile) => setActiveFile(file);

  // Loading skeleton (mirror drafter details structure)
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-8 w-72 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
            <Skeleton className="h-full min-h-[300px] w-full" />
          </div>
          <div className="flex-1 p-4 sm:p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !fab) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <ToolbarHeading title="Error loading FAB" description="Could not load sales details" />
        </div>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : 'Failed to load FAB data'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Full-screen file viewer
  if (activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
      </div>
    );
  }

  const statusInfo = getFabStatusInfo(fab.status_id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="px-3 sm:px-4 lg:px-6">
          <Toolbar className="py-2 sm:py-3">
            <div className="flex items-center justify-between w-full gap-2 flex-wrap">
              <ToolbarHeading
                title={
                  <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                    <a href={jobNameLink} className="hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fab?.job_details?.name || `Job ${fab?.job_id}`}
                    </a>
                    <span className="mx-1 text-gray-400">·</span>
                    <a
                      href={jobNumberLink}
                      className="hover:underline text-gray-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fab?.job_details?.job_number || fab?.job_id}
                    </a>
                  </div>
                }
                description="Fab Details"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
                <BackButton />
              </div>
            </div>
          </Toolbar>
        </div>
      </div>

      {/* Main two‑column layout */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Sticky sidebar (GraySidebar) */}
        <aside
          className={[
            'w-full bg-white border-b',
            'lg:w-[220px] xl:w-[260px] lg:shrink-0',
            'lg:sticky lg:top-[50px]',
            'lg:self-start',
            'lg:max-h-[calc(100vh-50px)]',
            'lg:overflow-y-auto',
            'lg:border-b-0 lg:border-r',
          ].join(' ')}
        >
          <GraySidebar sections={sidebarSections as any} jobId={fab?.job_id} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
          {/* FAB Files Card */}
          <Card>
            <CardHeader>
              <CardHeading className="flex flex-col items-start py-4">
                <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                  FAB Files
                  {totalFileCount > 0 && (
                    <span className="ml-2 text-base font-normal text-gray-400">
                      ({totalFileCount})
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Drafting, SlabSmith, and all other files for this fabrication
                </p>
              </CardHeading>
              <Can  >
              <div className="space-y-4">
                <Button
                  onClick={() => navigate(`/sales/edit/${id}`)}
                  className="w-full flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit FAB Details
                </Button>
                {/* <BackButton label="Back" className="w-full" /> */}
              </div>
              </Can>
            </CardHeader>
            <CardContent>
              <FileGallery
                sources={fileSources}
                onFileClick={handleFileClick}
                defaultLayout="card"
                emptyMessage="No files have been uploaded for this FAB yet."
              />
            </CardContent>
          </Card>

          {/* Actions Card */}

        </main>
      </div>
    </div>
  );
}