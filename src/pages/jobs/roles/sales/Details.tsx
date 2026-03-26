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

// Helper function to get FAB status display
const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) {
    return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  } else if (statusId === 1) {
    return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  } else {
    return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
  }
};

export function SalesDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  // API returns { success, message, data: FabData } — unwrap either shape
  const { data: response, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
  const fab = (response as any)?.data ?? response;

  // Prepare clickable links
  const jobNameLink = fab?.job_details?.id ? `/job/details/${fab.job_details.id}` : '#';
  const jobNumberLink = fab?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fab.job_details.job_number}`
    : '#';

  // Build the fields for the Job Details card (exactly as required)
  const jobDetailsFields = fab
    ? [
        { label: 'Account', value: fab.account_name || '—' },
        {
          label: 'Fab ID',
          value: (
            <Link to={`/sales/${fab.id}`} className="text-primary hover:underline">
              FAB-{fab.id}
            </Link>
          ),
        },
        { label: 'Area', value: fab.input_area || '—' },
        {
          label: 'Material',
          value: fab.stone_type_name
            ? `${fab.stone_type_name} - ${fab.stone_color_name || ''} - ${fab.stone_thickness_value || ''}`
            : '—',
        },
        {
          label: 'Fab Type',
          value: <span className="uppercase">{fab.fab_type || '—'}</span>,
        },
        { label: 'Edge', value: fab.edge_name || '—' },
        { label: 'Total S.F', value: fab.total_sqft?.toString() || '—' },
        { label: 'Sales Person', value: fab.sales_person_name || '—' },
        {
          label: 'Job Notes',
          value: fab.job_details?.description || 'None',
          fullWidth: true,
        },
      ]
    : [];

  // Build file sources from actual API shape
  const fileSources: FileSource[] = (() => {
    if (!fab) return [];
    const sources: FileSource[] = [];

    const mapFiles = (files: any[], stage: string, uploadedBy?: string): UnifiedFile[] =>
      (files ?? []).map((f): UnifiedFile => ({
        id: String(f.id),
        name: f.name || f.filename || `File_${f.id}`,
        size: parseInt(f.file_size) || f.size || 0,
        type: f.file_type || f.mime_type || 'application/octet-stream',
        url: f.file_url || f.url || '',
        stage,
        uploadedBy,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
      }));

    const draftFiles = mapFiles(fab.draft_data?.files ?? [], 'Drafting', fab.draft_data?.drafter_name);
    if (draftFiles.length > 0) sources.push({ kind: 'raw', data: draftFiles });

    const slabFiles = mapFiles(fab.slabsmith_data?.files ?? [], 'SlabSmith');
    if (slabFiles.length > 0) sources.push({ kind: 'raw', data: slabFiles });

    const salesCtFiles = mapFiles(fab.sales_ct_data?.files ?? [], 'Sales CT');
    if (salesCtFiles.length > 0) sources.push({ kind: 'raw', data: salesCtFiles });

    const topFiles = mapFiles(fab.files ?? [], 'General');
    if (topFiles.length > 0) sources.push({ kind: 'raw', data: topFiles });

    return sources;
  })();

  const totalFileCount = fileSources.reduce((sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0), 0);

  // Prepare sidebar sections for FAB Notes
  const sidebarSections = fab
    ? [
        {
          title: 'FAB Notes',
          type: 'notes',
          notes: (fab.fab_notes || []).map((note: any) => {
            const stageConfig: Record<string, { label: string; color: string }> = {
              templating: { label: 'Templating', color: 'text-blue-700' },
              pre_draft_review: { label: 'Pre-Draft Review', color: 'text-indigo-700' },
              drafting: { label: 'Drafting', color: 'text-green-700' },
              sales_ct: { label: 'Sales CT', color: 'text-yellow-700' },
              slab_smith_request: { label: 'Slab Smith Request', color: 'text-red-700' },
              cut_list: { label: 'Final Programming', color: 'text-purple-700' },
              cutting: { label: 'Cutting', color: 'text-orange-700' },
              revisions: { label: 'Revisions', color: 'text-purple-700' },
              draft: { label: 'Draft', color: 'text-green-700' },
              general: { label: 'General', color: 'text-gray-700' },
            };
            const stage = note.stage || 'general';
            const config = stageConfig[stage] || stageConfig.general;
            return {
              id: note.id,
              avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
              content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${note.note}`,
              author: note.created_by_name || 'Unknown',
              timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date',
            };
          }),
        },
      ]
    : [];

  const handleFileClick = (file: UnifiedFile) => setActiveFile(file);

  // Loading state
  if (isLoading) {
    return (
      <Container className="border-t">
        <Toolbar>
          <div className="flex items-center justify-between w-full">
            <div>
              <ToolbarHeading
                title={<Skeleton className="h-8 w-96" />}
                description={<Skeleton className="h-4 w-80 mt-1" />}
              />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Toolbar>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="mt-6">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <div className="mt-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>

          <div className="border-l">
            <Card className="border-none py-6">
              <CardHeader className="border-b pb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  // Error state
  if (isError) {
    return (
      <Container className="border-t">
        <Toolbar>
          <ToolbarHeading title="Error loading FAB" description="Could not load sales details" />
        </Toolbar>
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load FAB data: ${JSON.stringify(error)}` : 'Failed to load FAB data'}
          </AlertDescription>
        </Alert>
      </Container>
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

  const statusInfo = getFabStatusInfo(fab?.status_id);

  // Main render
  return (
    <Container className="border-t">
      {/* 🔹 TOP TOOLBAR with clickable job name/number + description + status badge */}
      <Toolbar>
        <div className="flex items-center justify-between w-full">
          <ToolbarHeading
            title={
              <div className="text-2xl font-bold">
                <a href={jobNameLink} className="hover:underline">
                  {fab?.job_details?.name || `Job ${fab?.job_id}`}
                </a>
                {' - '}
                <a href={jobNumberLink} className="hover:underline" target="_blank">
                  {fab?.job_details?.job_number || fab?.job_id}
                </a>
              </div>
            }
            description="Fab Details Page"
          />
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
            {statusInfo.text}
          </span>
        </div>
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-6">
        {/* ── LEFT COLUMN (span 2) ───────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* 🔹 JOB DETAILS CARD */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#111827] text-2xl font-bold">Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-sm">
                {jobDetailsFields.map((field, index) => (
                  <div key={index} className={field.fullWidth ? 'col-span-full' : ''}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {field.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[24px] whitespace-pre-wrap">
                      {field.value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAB Files */}
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

          {/* 🔹 GRAYSIDEBAR (FAB Notes) */}
          <GraySidebar sections={sidebarSections as any} className="bg-transparent border-none pl-0" />
        </div>

        {/* ── RIGHT COLUMN (span 1) ──────────────────────────────────── */}
        <div className="border-l">
          <Card className="border-none py-6">
            <CardHeader className="border-b pb-4 flex-col items-start">
              <CardTitle className="font-semibold text-text">Actions</CardTitle>
              <p className="text-sm text-text-foreground">Available actions for this FAB</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={() => navigate(`/sales/edit/${id}`)}
                  className="w-full flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit FAB Details
                </Button>
                <BackButton label="Back" className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}