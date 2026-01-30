import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetJobByIdQuery, useGetFabsByJobQuery, useGetJobMediaQuery, useDeleteJobMediaMutation, useGetJobNotesQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Camera, Video, FileText, Plus, Download, Trash2, Play, X } from 'lucide-react';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { toast } from 'sonner';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
import { Badge } from '@/components/ui/badge';
import { JobMediaUpload } from './components/JobMediaUpload';
import Popup from '@/components/ui/popup';

export function JobDetailsPage() {
  const { job_id } = useParams<{ job_id: string }>();
  const navigate = useNavigate();
  const jobId = job_id ? parseInt(job_id) : 0;

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string; name: string } | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: job, isLoading, isError, error } = useGetJobByIdQuery(jobId, { skip: !jobId });
  const { data: fabs, isLoading: fabsLoading } = useGetFabsByJobQuery(jobId, { skip: !jobId });
  const { data: mediaFiles, isLoading: mediaLoading, refetch: refetchMedia } = useGetJobMediaQuery(
    { job_id: jobId },
    { skip: !jobId }
  );
  const { data: jobNotes, isLoading: notesLoading } = useGetJobNotesQuery(jobId, { skip: !jobId });
  const [deleteJobMedia, { isLoading: isDeleting }] = useDeleteJobMediaMutation();

  // Create job info based on actual job data
  const jobInfo = job ? [
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
  ] : [];

  // Get status text based on status_id
  function getStatusText(statusId: number): string {
    switch (statusId) {
      case 1: return 'Active';
      case 2: return 'Inactive';
      case 3: return 'Completed';
      default: return 'Unknown';
    }
  }

  const handleDeleteClick = (file: { id: number; name: string }) => {
    setFileToDelete(file);
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !jobId) return;

    try {
      await deleteJobMedia({ job_id: jobId, file_id: fileToDelete.id }).unwrap();
      toast.success('File deleted successfully');
      refetchMedia(); // Refresh the media list
    } catch (error) {
      toast.error('Failed to delete file');
      console.error('Delete media error:', error);
    } finally {
      setDeleteConfirmationOpen(false);
      setFileToDelete(null);
    }
  };

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
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className='border-l'>
            <Card className='border-none py-6'>
              <CardHeader className='border-b pb-4 flex-col items-start'>
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

  if (isError) {
    return (
      <Container className="border-t">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Job Details: Error</h1>
            <p className="text-sm text-muted-foreground">
              Unable to load job information
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error ? `Failed to load job data: ${JSON.stringify(error)}` : "Failed to load job data"}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  // Media viewer modal component
  const MediaViewer = () => {
    if (!selectedMedia) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-7xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl">
          {/* Close button */}
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header with file name */}
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="font-semibold text-lg truncate text-gray-900">{selectedMedia.name}</h3>
          </div>

          {/* Media content area */}
          <div className="flex items-center justify-center p-6 bg-gray-100 min-h-[400px] max-h-[calc(90vh-140px)]">
            {selectedMedia.type === 'photo' ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : selectedMedia.type === 'video' ? (
              <div className="w-full max-w-4xl">
                <video
                  src={selectedMedia.url}
                  controls
                  controlsList="nodownload"
                  className="w-full h-auto max-h-[70vh] rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center p-8">
                <FileText className="h-20 w-20 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">Preview not available for this file type</p>
              </div>
            )}
          </div>

          {/* Footer with download button */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedMedia.type === 'photo' ? 'Image' : selectedMedia.type === 'video' ? 'Video' : 'Document'}
            </div>
            <a
              href={selectedMedia.url}
              download
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Container className='lg:mx-0'>
        <Toolbar className=' '>
          <ToolbarHeading title={`Job ${job?.job_number || 'Loading...'}: ${job?.name || ''}`} description="View job details, FABs, and media files" />
          <ToolbarActions>
            <BackButton fallbackUrl="/create-jobs" />
          </ToolbarActions>
        </Toolbar>
      </Container>
      {selectedMedia && <MediaViewer />}

      <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start lg:flex-shrink-0">
        {/* LEFT: Job Info */}
        <Container className="lg:col-span-8">
          {/* Job Information Card */}
          <Card className='my-4'>
            <CardHeader>
              <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Job Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
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

          {/* Accounting Notes Section */}
          <Card className='my-4'>
            <CardHeader>
              <CardHeading className='flex flex-col items-start py-4'>
                <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Accounting note</CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Accounting notes for this job
                </p>
              </CardHeading>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((item) => (
                    <div key={item} className="p-4 border rounded-lg bg-gray-50 flex flex-col gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : jobNotes?.data?.notes && jobNotes.data.notes.length > 0 ? (
                <div className="space-y-4">
                  {jobNotes.data.notes.map((note: any) => (
                    <div key={note.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm text-blue-600">
                          {note.creator_name}
                        </span>
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

          {/* FABs Section */}
          <Card className='my-4'>
            <CardHeader>
              <CardHeading className='flex flex-col items-start py-4'>
                <CardTitle>FABs ({fabs?.length || 0})</CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Fabrication items associated with this job
                </p>
              </CardHeading>
            </CardHeader>
            <CardContent>
              {fabsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center space-x-4">
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
                    <div key={fab.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">{fab.id}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{fab.fab_type}</h4>
                          <p className="text-sm text-gray-600">
                            {fab.total_sqft} sq ft • {fab.stone_type_name || 'N/A'} • {fab.stone_color_name || 'N/A'}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={fab.status_id === 1 ? 'default' : fab.status_id === 2 ? 'secondary' : 'outline'}>
                              {getFabStatusText(fab.status_id)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/job/sales/${fab.id}`)}>
                          View Details
                        </Button>
                      </div>
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

          {/* Media Section */}
          <Card className='my-4'>
            <CardHeader>
              <CardHeading className='flex flex-col items-start py-4'>
                <CardTitle>Media Files</CardTitle>
                <p className="text-sm text-[#4B5563]">
                  Photos and videos associated with this job
                </p>
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
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-16 w-16 rounded" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : mediaFiles && mediaFiles.length > 0 ? (
                <div className="space-y-4">
                  {/* Media Stats */}
                  <div className="flex justify-center space-x-8 mb-6">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Photos</p>
                      <p className="text-lg font-semibold">
                        {mediaFiles.filter(f => f.file_type === 'photo').length}
                      </p>
                    </div>
                    <div className="text-center">
                      <Video className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Videos</p>
                      <p className="text-lg font-semibold">
                        {mediaFiles.filter(f => f.file_type === 'video').length}
                      </p>
                    </div>
                    <div className="text-center">
                      <FileText className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Documents</p>
                      <p className="text-lg font-semibold">
                        {mediaFiles.filter(f => f.file_type === 'document').length}
                      </p>
                    </div>
                  </div>

                  {/* Media Files Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mediaFiles.map((file) => (
                      <div key={file.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                        {/* Media Preview */}
                        <div className="aspect-video bg-gray-100 relative cursor-pointer">
                          {file.file_type === 'photo' && (
                            <img
                              src={file.file_url}
                              alt={file.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                              onClick={() => setSelectedMedia({
                                url: file.file_url,
                                type: file.file_type,
                                name: file.name
                              })}
                            />
                          )}
                          {file.file_type === 'video' && (
                            <div
                              className="w-full h-full flex items-center justify-center bg-gray-200 cursor-pointer hover:bg-gray-300"
                              onClick={() => setSelectedMedia({
                                url: file.file_url,
                                type: file.file_type,
                                name: file.name
                              })}
                            >
                              <Play className="h-12 w-12 text-gray-500" />
                            </div>
                          )}
                          {file.file_type === 'document' && (
                            <div
                              className="w-full h-full flex items-center justify-center bg-gray-200 cursor-pointer hover:bg-gray-300"
                              onClick={() => setSelectedMedia({
                                url: file.file_url,
                                type: file.file_type,
                                name: file.name
                              })}
                            >
                              <FileText className="h-12 w-12 text-gray-500" />
                            </div>
                          )}

                          {/* File Type Badge */}
                          <Badge
                            variant="secondary"
                            className="absolute top-2 left-2 text-xs capitalize"
                          >
                            {file.file_type}
                          </Badge>
                        </div>

                        {/* File Info */}
                        <div className="p-3">
                          <h4
                            className="font-medium text-sm truncate hover:text-blue-600 cursor-pointer"
                            title={file.name}
                            onClick={() => setSelectedMedia({
                              url: file.file_url,
                              type: file.file_type,
                              name: file.name
                            })}
                          >
                            {file.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {(parseInt(file.file_size) / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-xs text-gray-500">
                            Uploaded by {file.uploader_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(file.created_at).toLocaleDateString()}
                          </p>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => setSelectedMedia({
                                url: file.file_url,
                                type: file.file_type,
                                name: file.name
                              })}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Can action="delete" on="jobs">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick({
                                    id: file.id,
                                    name: file.name
                                  });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Can>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex justify-center space-x-8 mb-4">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Photos (0)</p>
                    </div>
                    <div className="text-center">
                      <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Videos (0)</p>
                    </div>
                    <div className="text-center">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Documents (0)</p>
                    </div>
                  </div>
                  <p className="text-gray-500">No media files uploaded yet</p>
                  <Can action="create" on="jobs">
                    <Button
                      className="mt-4"
                      onClick={() => setShowUploadDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload First File
                    </Button>
                  </Can>
                </div>
              )}
            </CardContent>
          </Card>
        </Container>

        {/* RIGHT: Actions Sidebar */}
        <div className="lg:col-span-4 w-full lg:w-[300px] xl:w-[350px] ultra:w-[400px]">
          <div className='border-l'>
            <Card className='border-none py-6'>
              <CardHeader className='border-b pb-4 flex-col items-start'>
                <CardTitle className='font-semibold text-text'>Actions</CardTitle>
                <p className="text-sm text-text-foreground">
                  Available actions for this job
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={() => navigate(`/create-jobs`)} className="w-full flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Jobs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      <Popup
        isOpen={deleteConfirmationOpen}
        onClose={() => {
          setDeleteConfirmationOpen(false);
          setFileToDelete(null);
        }}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        centered={true}
      >
        <div className="flex justify-end space-x-3 my-3">
          <Button
            variant="outline"
            onClick={() => {
              setDeleteConfirmationOpen(false);
              setFileToDelete(null);
            }}
            className="w-[124px]"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="w-[140px]"

          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Popup>
    </>
  );
}

// Helper function to get FAB status text
function getFabStatusText(statusId: number): string {
  switch (statusId) {
    case 1: return 'Active';
    case 2: return 'Inactive';
    case 3: return 'Completed';
    default: return 'Unknown';
  }
}