import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent, CardHeading } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Pencil } from 'lucide-react';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '../drafters/components';

export function SalesDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  // API returns { success, message, data: FabData } — unwrap either shape
  const { data: response, isLoading, isError, error } = useGetFabByIdQuery(Number(id));
  const fab = (response as any)?.data ?? response;

  // ── Job info rows ──────────────────────────────────────────────────────
  const jobInfo = fab
    ? [
        { label: 'FAB ID',          value: String(fab.id) },
        { label: 'FAB Type',        value: fab.fab_type },
        { label: 'Account',         value: fab.account_name },
        { label: 'Job name',        value: fab.job_details?.name },
        {
          label: 'Job #',
          value: (
            <Link
              to={`/job/details/${fab.job_details?.id}`}
              className="text-primary hover:underline"
            >
              {fab.job_details?.job_number}
            </Link>
          ),
        },
        { label: 'Area (s)',         value: fab.input_area },
        { label: 'Stone type',       value: fab.stone_type_name || 'N/A' },
        { label: 'Stone color',      value: fab.stone_color_name || 'N/A' },
        { label: 'Stone thickness',  value: fab.stone_thickness_value || 'N/A' },
        { label: 'Edge',             value: fab.edge_name || 'N/A' },
        { label: 'Total square ft',  value: String(fab.total_sqft) },
        { label: 'Notes',            value: fab.templating_notes?.join(', ') || 'N/A' },
      ]
    : [];

  // ── Build file sources from actual API shape ───────────────────────────
  //
  // Confirmed from API response:
  //   fab.draft_data.files       → drafting files
  //   fab.slabsmith_data.files   → slabsmith files
  //   fab.sales_ct_data.files    → sales CT files
  //
  const fileSources: FileSource[] = (() => {
    if (!fab) return [];
    const sources: FileSource[] = [];

    // Helper to map a raw file array to UnifiedFile[]
    const mapFiles = (files: any[], stage: string, uploadedBy?: string): UnifiedFile[] =>
      (files ?? []).map((f): UnifiedFile => ({
        id:         String(f.id),
        name:       f.name || f.filename || `File_${f.id}`,
        size:       parseInt(f.file_size) || f.size || 0,
        type:       f.file_type || f.mime_type || 'application/octet-stream',
        url:        f.file_url || f.url || '',
        stage,
        uploadedBy,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw:       f,
      }));

    // 1. Drafting files  →  fab.draft_data.files
    const draftFiles = mapFiles(
      fab.draft_data?.files ?? [],
      'Drafting',
      fab.draft_data?.drafter_name ?? undefined,
    );
    if (draftFiles.length > 0) sources.push({ kind: 'raw', data: draftFiles });

    // 2. SlabSmith files  →  fab.slabsmith_data.files
    const slabFiles = mapFiles(
      fab.slabsmith_data?.files ?? [],
      'SlabSmith',
    );
    if (slabFiles.length > 0) sources.push({ kind: 'raw', data: slabFiles });

    // 3. Sales CT files  →  fab.sales_ct_data.files
    const salesCtFiles = mapFiles(
      fab.sales_ct_data?.files ?? [],
      'Sales CT',
    );
    if (salesCtFiles.length > 0) sources.push({ kind: 'raw', data: salesCtFiles });

    // 4. Top-level files array (future-proofing)
    const topFiles = mapFiles(fab.files ?? [], 'General');
    if (topFiles.length > 0) sources.push({ kind: 'raw', data: topFiles });

    return sources;
  })();

  const totalFileCount = fileSources.reduce(
    (sum, s) => sum + (s.kind === 'raw' ? s.data.length : 0),
    0,
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleFileClick = (file: UnifiedFile) => setActiveFile(file);

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card className="lg:col-span-2 mt-6 pt-6">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="border-l">
            <Card className="border-none py-6">
              <CardHeader className="border-b pb-4 flex-col items-start">
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

  // ── Error ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">FAB ID: Error</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error
              ? `Failed to load FAB data: ${JSON.stringify(error)}`
              : 'Failed to load FAB data'}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  // ── Full-screen file viewer ────────────────────────────────────────────
  if (activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <Container className="border-t">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">FAB ID: {fab?.id}</h1>
          <p className="text-sm text-muted-foreground">Review fabrication details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Job Information */}
          <Card className="mt-6 pt-6">
            <CardHeader>
              <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {jobInfo.map((item, index) => (
                  <div key={index}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[28px]">
                      {item.value}
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
        </div>

        {/* ── RIGHT COLUMN ──────────────────────────────────────────────── */}
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
                <Link to="/sales">
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Fabs
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}