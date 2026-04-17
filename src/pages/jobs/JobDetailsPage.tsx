import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetJobByIdQuery,
  useGetFabsByJobQuery,
  useGetJobMediaQuery,
  useDeleteJobMediaMutation,
  useGetJobNotesQuery,
} from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Camera, Plus } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
import { Badge } from '@/components/ui/badge';
import { JobMediaUpload } from './components/JobMediaUpload';
import Popup from '@/components/ui/popup';
import { FileViewer } from './roles/drafters/components';
import { FileGallery } from '@/pages/jobs/components/FileGallery';
import { useIsSuperAdmin } from '@/hooks/use-permission';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusText(statusId: number): string {
  switch (statusId) {
    case 1: return 'Active';
    case 2: return 'Inactive';
    case 3: return 'Completed';
    default: return 'Unknown';
  }
}

function getFabStatusText(statusId: number): string {
  switch (statusId) {
    case 1: return 'Active';
    case 2: return 'Inactive';
    case 3: return 'Completed';
    default: return 'Unknown';
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function JobDetailsPage() {
  const { job_id } = useParams<{ job_id: string }>();
  const navigate = useNavigate();
  const jobId = job_id ? parseInt(job_id) : 0;

  const isSuperAdmin = useIsSuperAdmin();

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: number; name: string } | null>(null);
  const [activeFile, setActiveFile] = useState<any | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: job, isLoading, isError, error } = useGetJobByIdQuery(jobId, { skip: !jobId });
  const { data: fabs, isLoading: fabsLoading } = useGetFabsByJobQuery(jobId, { skip: !jobId });
  const { data: mediaFiles, isLoading: mediaLoading, refetch: refetchMedia } = useGetJobMediaQuery(
    { job_id: jobId },
    { skip: !jobId },
  );
  const { data: jobNotes, isLoading: notesLoading } = useGetJobNotesQuery(jobId, { skip: !jobId });
  const [deleteJobMedia, { isLoading: isDeleting }] = useDeleteJobMediaMutation();

  // ── Job info rows ──────────────────────────────────────────────────────────
  const jobInfo = job
    ? [
      { label: 'Job Number', value: job.job_number },
      { label: 'Job Name', value: job.name },
      { label: 'Account', value: job.account_name || 'N/A' },
      { label: 'Account Number', value: job.account_number || 'N/A' },
      { label: 'Project Value', value: job.project_value ? `$${job.project_value.toLocaleString()}` : 'N/A' },
      { label: 'Sales Person', value: job.sales_person_name || 'N/A' },
      { label: 'Priority', value: job.priority || 'N/A' },
      { label: 'Status', value: getStatusText(job.status_id) },
      { label: 'Created Date', value: new Date(job.created_at).toLocaleDateString() },
      { label: 'Note', value: job.description || 'N/A' },
    ]
    : [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFileClick = (file: any) => {
    setActiveFile({
      ...file,
      url: file.url || file.file_url,
      name: file.name || file.file_name,
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
    });
  };

  const handleDeleteClick = (file: { id: number; name: string }) => {
    setFileToDelete(file);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !jobId) return;
    try {
      await deleteJobMedia({ job_id: jobId, file_id: fileToDelete.id }).unwrap();
      toast.success('File deleted successfully');
      refetchMedia();
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeleteConfirmationOpen(false);
      setFileToDelete(null);
    }
  };
  const jobNameLink = job?.id ? `/job/details/${job?.id}` : '#';
  const jobNumberLink = job?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${job.job_number}`
    : '#';

  // ── Loading ────────────────────────────────────────────────────────────────
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
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Job Details: Error</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load job data: ${JSON.stringify(error)}` : 'Failed to load job data'}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  // ── Full-screen file viewer ────────────────────────────────────────────────
  if (activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <Container className="lg:mx-0">
        <Toolbar>
          <ToolbarHeading
            // title={`Job ${job?.job_number || 'Loading...'}: ${job?.name || ''}`}
            title={
              <div className="text-2xl font-bold">
                <a href={jobNameLink} className="hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* {fabData?.job_details?.name || `Job ${fabData?.job_id}`} */}
                  {job?.name || ''}
                </a>
                {' - '}
                <a href={jobNumberLink} className="hover:underline" target="_blank">
                  {job?.job_number || 'Loading...'}
                </a>
              </div>
            }
            description="View job details, FABs, and media files"
          />
          <ToolbarActions>
            <BackButton />
          </ToolbarActions>
        </Toolbar>
      </Container>

      <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <Container className="lg:col-span-8">

          {/* Job Information */}
          <Card className="my-4">
            <CardHeader>
              <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {jobInfo.map((item, index) => (
                  <div key={index}>
                    <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="font-semibold text-text text-base leading-[28px]">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accounting Notes */}
          <Card className="my-4">
            <CardHeader>
              <CardHeading className="flex flex-col items-start py-4">
                <CardTitle className="text-[#111827] leading-[32px] text-2xl font-bold">
                  Accounting note
                </CardTitle>
                <p className="text-sm text-[#4B5563]">Accounting notes for this job</p>
              </CardHeading>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : jobNotes?.data?.notes?.length > 0 ? (
                <div className="space-y-4">
                  {jobNotes.data.notes.map((note: any) => (
                    <div
                      key={note.id}
                      className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm text-blue-600">{note.creator_name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                  <p className="text-gray-500 text-sm">No accounting notes available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FABs */}
          <Card className="my-4">
            <CardHeader>
              <CardHeading className="flex flex-col items-start py-4">
                <CardTitle>FABs ({fabs?.length || 0})</CardTitle>
                <p className="text-sm text-[#4B5563]">Fabrication items associated with this job</p>
              </CardHeading>
            </CardHeader>
            <CardContent>
              {fabsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : fabs && fabs.length > 0 ? (
                <div className="space-y-4">
                  {fabs.map((fab) => (
                    <div
                      key={fab.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">{fab.id}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{fab.fab_type}</h4>
                          <p className="text-sm text-gray-600">
                            {fab.total_sqft} sq ft · {fab.stone_type_name || 'N/A'} · {fab.stone_color_name || 'N/A'} . {fab.input_area || 'N/A'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge
                            // variant={
                            //   fab.status_id === 1
                            //     ? 'default'
                            //     : fab.status_id === 2
                            //       ? 'secondary'
                            //       : 'outline'
                            // }
                            >
                              {(fab.current_stage || '').toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/sales/${fab.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No FABs found for this job</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Media Files ─────────────────────────────────────────────────── */}
          <Card className="my-4">
            <CardHeader>
              <CardHeading className="flex flex-col items-start py-4">
                <CardTitle>Media Files</CardTitle>
                <p className="text-sm text-[#4B5563]">Photos and videos associated with this job</p>
              </CardHeading>

              <CardToolbar>
                <Can action="create" on="jobs">
                  <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Camera className="h-4 w-4 mr-2" />
                        Upload Media
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Upload Media Files</DialogTitle>
                      </DialogHeader>
                      <JobMediaUpload
                        jobId={jobId}
                        onUploadComplete={refetchMedia}
                        onClose={() => setShowUploadDialog(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </Can>
              </CardToolbar>
            </CardHeader>

            <CardContent>
              {mediaLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border overflow-hidden">
                      <Skeleton className="aspect-video w-full" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <FileGallery
                  sources={[{ kind: 'job-media', data: mediaFiles ?? [] }]}
                  onFileClick={handleFileClick}
                  onDeleteFile={(file) =>
                    handleDeleteClick({ id: Number(file.id), name: file.name })
                  }
                  deletePermissionSubject="jobs"
                  emptyMessage="No media files uploaded yet."
                />
              )}

              {/* Upload prompt when empty and no upload button visible */}
              {!mediaLoading && (!mediaFiles || mediaFiles.length === 0) && (
                <Can action="create" on="jobs">
                  <div className="mt-4 flex justify-center">
                    <Button onClick={() => setShowUploadDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload First File
                    </Button>
                  </div>
                </Can>
              )}
            </CardContent>
          </Card>
        </Container>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        {isSuperAdmin && (
          <div className="lg:col-span-4 w-full lg:w-[300px] xl:w-[350px] ultra:w-[400px]">
            <div className="border-l">
              <Card className="border-none py-6">
                <CardHeader className="border-b pb-4 flex-col items-start">
                  <CardTitle className="font-semibold text-text">Actions</CardTitle>
                <p className="text-sm text-text-foreground">Available actions for this job</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={() => navigate('/create-jobs')}
                    className="w-full flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Popup
        isOpen={deleteConfirmationOpen}
        onClose={() => {
          setDeleteConfirmationOpen(false);
          setFileToDelete(null);
        }}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        centered
        className='h-auto '
      >
        <div className="flex justify-end space-x-3 my-3">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteConfirmationOpen(false);
              setFileToDelete(null);
            }}
            className="w-[200px]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="w-[140px]"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Popup>
    </>
  );
}