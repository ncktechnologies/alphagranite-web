// ShopRevisionDetailsPage.tsx
import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useCompleteShopRevisionMutation,
  useGetShopRevisionsByFabIdQuery,
  useAddFilesToShopRevisionMutation,
} from '@/store/api/shopRevision';
import { useGetFabByIdQuery, useDeleteFileMutation } from '@/store/api/job';
import { useGetOperatorQaFilesQuery } from '@/store/api/operator';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import { UniversalUploadModal } from '@/components/universal-upload';
import { useSelector } from 'react-redux';
import { SCTTimer } from '@/pages/jobs/roles/back-to-sales/components/SCTTimer';
import { usePermission, useIsSuperAdmin } from '@/hooks/use-permission';
import Popup from '@/components/ui/popup';

interface ExtendedUnifiedFile extends UnifiedFile {
  uploaded_by_id?: number;
}

const ShopRevisionDetailsPage = () => {
  const { fabId } = useParams<{ fabId: string }>();
  const numericFabId = Number(fabId);
  const navigate = useNavigate();

  const currentUser = useSelector((s: any) => s.user.user);
  const currentOperatorId = currentUser?.employee_id || currentUser?.id || 0;

  // Permissions
  const isSuperAdmin = useIsSuperAdmin();
  const permissions = usePermission('Shop Revision');
  const canManageRevisions = isSuperAdmin || permissions.can_create;

  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null);
  const [markChecked, setMarkChecked] = useState(false);
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCompleteFeedbackDialog, setShowCompleteFeedbackDialog] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');

  // ── Delete confirmation state ──
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  // Data fetching
  const { data: revisionsData, isLoading: revisionsLoading, refetch: refetchRevisions } = useGetShopRevisionsByFabIdQuery(
    numericFabId,
    { skip: !numericFabId }
  );
  const { data: fabResponse, refetch: refetchFab } = useGetFabByIdQuery(numericFabId, { skip: !numericFabId });
  const [completeRevision, { isLoading: isCompleting }] = useCompleteShopRevisionMutation();

  // ✅ Upload to shop revision
  const [uploadToShopRevision, { isLoading: isUploading }] = useAddFilesToShopRevisionMutation();

  // Delete mutation
  const [deleteFile, { isLoading: isDeleting }] = useDeleteFileMutation();

  const revisions = useMemo(() => (Array.isArray(revisionsData) ? revisionsData : []), [revisionsData]);
  const fab = (fabResponse as any)?.data ?? fabResponse;

  // Selected revision
  const selectedRevision = useMemo(() => {
    if (!revisions.length) return null;
    if (selectedRevisionId) {
      return revisions.find((r) => r.id === selectedRevisionId) ?? revisions[0];
    }
    return revisions[0];
  }, [revisions, selectedRevisionId]);

  const selectedRequesterId = selectedRevision?.requested_by || 0;

  // QA files for the selected revision's requester
  const { data: qaFilesData, refetch: refetchQaFiles } = useGetOperatorQaFilesQuery(
    { operator_id: selectedRequesterId, job_id: numericFabId },
    { skip: !numericFabId || !selectedRequesterId }
  );

  // All FAB shop‑revision files (any operator)
  const allFabRevisionFiles: ExtendedUnifiedFile[] = useMemo(() => {
    if (!fab) return [];
    const rawFiles = [
      ...(fab.files || []),
      ...(fab.draft_data?.files || []),
      ...(fab.slabsmith_data?.files || []),
      ...(fab.sales_ct_data?.files || []),
      ...(fab.cnc_data?.files || []),
    ];
    return rawFiles
      .filter((f: any) => {
        const stage = (f.stage_name || f.stage || '').toLowerCase();
        return stage === 'shop_revision' || stage === 'shop revision';
      })
      .map((f: any): ExtendedUnifiedFile => ({
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
        uploaded_by_id: f.uploaded_by ?? f.operator_id ?? f.uploaded_by_id,
        uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
        _raw: f,
      }));
  }, [fab]);

  // Files directly attached to the selected revision (from the revision's `files` array)
  const revisionDirectFiles: ExtendedUnifiedFile[] = useMemo(() => {
    if (!selectedRevision?.files || !Array.isArray(selectedRevision.files)) return [];
    return selectedRevision.files.map((f: any): ExtendedUnifiedFile => ({
      id: String(f.id),
      name: f.name || f.filename || `File_${f.id}`,
      size: f.file_size || f.size || 0,
      type: f.file_type || f.mime_type || 'application/octet-stream',
      url: f.file_url || f.url || '',
      stage_name: f.stage_name ?? f.stage,
      stage: f.stage_name ?? f.stage,
      file_design: f.file_design,
      uploaded_by_name: f.uploaded_by_name ?? f.uploader_name,
      uploadedBy: f.uploaded_by_name ?? f.uploader_name,
      uploaded_by_id: f.uploaded_by ?? f.operator_id ?? f.uploaded_by_id,
      uploadedAt: f.created_at ? new Date(f.created_at) : undefined,
      _raw: f,
    }));
  }, [selectedRevision]);

  const qaFilesForSelected: ExtendedUnifiedFile[] = useMemo(() => {
    if (!qaFilesData?.data) return [];
    return (qaFilesData.data as any[])
      .filter((file: any) => {
        const stage = (file.stage_name || file.stage || '').toLowerCase();
        return stage === 'shop_revision' || stage === 'shop revision';
      })
      .map((file: any): ExtendedUnifiedFile => ({
        id: String(file.id),
        name: file.name || file.file_name,
        size: file.file_size || file.size || 0,
        type: file.file_type || file.mime_type || 'application/octet-stream',
        url: file.file_url || file.url,
        stage: file.stage_name || file.stage,
        uploadedBy: file.uploaded_by_name || 'Operator',
        uploaded_by_id: file.uploaded_by ?? file.operator_id ?? file.uploaded_by_id,
        uploadedAt: file.created_at ? new Date(file.created_at) : undefined,
        _raw: file,
      }));
  }, [qaFilesData]);

  // Merge all sources: revision direct files + fab files + QA files
  const mergedFiles = useMemo(
    () => [...revisionDirectFiles, ...allFabRevisionFiles, ...qaFilesForSelected],
    [revisionDirectFiles, allFabRevisionFiles, qaFilesForSelected]
  );
  const fileSources: FileSource[] = mergedFiles.length > 0 ? [{ kind: 'raw', data: mergedFiles }] : [];

  const handleSelectRevision = (id: number) => {
    setSelectedRevisionId(id);
    setMarkChecked(false);
  };

  const handleComplete = async () => {
    if (!selectedRevision || !markChecked) return;
    setShowCompleteFeedbackDialog(true);
  };

  const handleConfirmComplete = async () => {
    if (!selectedRevision) return;
    try {
      await completeRevision({ revision_id: selectedRevision.id, revision_feedback: revisionFeedback.trim() }).unwrap();
      toast.success('Revision marked as complete.');
      setMarkChecked(false);
      setRevisionFeedback('');
      setShowCompleteFeedbackDialog(false);
      refetchRevisions();
      refetchFab();
      navigate('/revision');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to complete revision.');
    }
  };

  const handleUploadComplete = () => {
    setShowUploadModal(false);
    refetchRevisions(); // Refresh to get the newly attached files
    refetchFab();
    if (selectedRequesterId) {
      refetchQaFiles();
    }
    toast.success('Shop revision files uploaded successfully');
  };

  // ── Delete handlers ──
  const handleDeleteClick = (file: UnifiedFile) => {
    setFileToDelete({ id: String(file.id), name: file.name });
    setDeleteConfirmationOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFile({ file_id: fileToDelete.id }).unwrap();
      toast.success('File deleted successfully');
      refetchRevisions();
      refetchFab();
      if (selectedRequesterId) {
        refetchQaFiles();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete file');
    } finally {
      setDeleteConfirmationOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationOpen(false);
    setFileToDelete(null);
  };

  const fabInfo = [
    { label: 'FAB ID', value: String(fab?.id || fabId || '—') },
    {
      label: 'JOB #',
      value: fab?.job_details?.id ? (
        <Link to={`/job/details/${fab.job_details.id}`} className="text-primary hover:underline">
          {fab?.job_details?.job_number || '—'}
        </Link>
      ) : (
        fab?.job_details?.job_number || '—'
      ),
    },
    { label: 'JOB NAME', value: fab?.job_details?.name || '—' },
    { label: 'FAB TYPE', value: fab?.fab_type || '—' },
    { label: 'ACCOUNT', value: fab?.account_name || '—' },
    { label: 'Shop CURRENT STAGE', value: fab?.shop_current_stage || '—' },
    { label: 'NO. OF PIECES', value: fab?.no_of_pieces ?? '—' },
    { label: 'TOTAL SQ FT', value: fab?.total_sqft ?? '—' },
    { label: 'STONE TYPE', value: fab?.stone_type_name || '—' },
    { label: 'STONE COLOR', value: fab?.stone_color_name || '—' },
    { label: 'STONE THICKNESS', value: fab?.stone_thickness_value || '—' },
    { label: 'EDGE', value: fab?.edge_name || '—' },
  ];

  if (activeFile) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-auto">
        <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
      </div>
    );
  }

  // Permission‑derived UI flags
  const canUpload = !!selectedRevision && !selectedRevision.revision_completed && canManageRevisions && !!selectedRevision.id;
  const canComplete = canManageRevisions && !selectedRevision?.revision_completed;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="px-4 py-3">
          <Toolbar>
            <div className="flex items-center justify-between w-full">
              <ToolbarHeading
                title={`Shop Revision Details - FAB ${fabId || ''}`}
                description={fab?.job_details?.name || 'Revision details'}
              />
              <BackButton />
            </div>
          </Toolbar>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>FAB Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-5">
                {fabInfo.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</span>
                    <span className="text-sm">{item.value as any}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Shop Revision Files</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedRevision
                    ? `Files uploaded by ${selectedRevision.requested_by_name || `Operator ${selectedRevision.requested_by}`}`
                    : 'Select a revision to view its files'}
                </p>
              </div>
              {canUpload ? (
                <Button onClick={() => setShowUploadModal(true)} size="sm">
                  Upload Files
                </Button>
              ) : (
                <Button size="sm" disabled title="No active revision selected or insufficient permissions">
                  Upload Unavailable
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <FileGallery
                sources={fileSources}
                onFileClick={(file) => setActiveFile(file)}
                onDeleteFile={handleDeleteClick}
                deletePermissionSubject="file"
                defaultLayout="card"
                emptyMessage={
                  !selectedRevision
                    ? 'No revision selected.'
                    : mergedFiles.length === 0
                      ? `No files uploaded yet for this revision by ${selectedRevision.requested_by_name || 'requester'}.`
                      : 'No shop revision files found.'
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revision History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {revisionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading revisions...</p>
              ) : revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revisions found for this FAB.</p>
              ) : (
                revisions.map((revision) => (
                  <button
                    key={revision.id}
                    className={`w-full text-left border rounded-md p-3 transition ${selectedRevision?.id === revision.id ? 'border-green-600 bg-green-50/50' : 'border-border'
                      }`}
                    onClick={() => handleSelectRevision(revision.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">Revision #{revision.id}</p>
                      <span
                        className={`text-xs ${revision.revision_completed ? 'text-green-700' : 'text-orange-700'
                          }`}
                      >
                        {revision.revision_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{revision.revision_note}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Requested by: {revision.requested_by_name || `Operator ${revision.requested_by}`}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column (4 cols) – Revision Details */}
        <Card className="lg:col-span-4 border-l shadow-sm">
          <CardHeader>
            <CardTitle>Revision Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRevision ? (
              <p className="text-sm text-muted-foreground">Select a revision to view details.</p>
            ) : (
              <>
                <SCTTimer
                  startTime={selectedRevision?.created_at || null}
                  endTime={selectedRevision?.completed_at || null}
                  text="Time in Shop Revision:"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">FAB ID</p>
                  <p className="text-sm font-medium">{selectedRevision.fab_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Revision Note</p>
                  <p className="text-sm">{selectedRevision.revision_note || '—'}</p>
                </div>
                {selectedRevision.revision_feedback && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Revision Feedback</p>
                    <p className="text-sm">{selectedRevision.revision_feedback}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requested By</p>
                  <p className="text-sm">
                    {selectedRevision.requested_by_name || selectedRevision.requested_by || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm">
                    {selectedRevision.created_at
                      ? format(new Date(selectedRevision.created_at), 'MMM dd, yyyy h:mm a')
                      : '—'}
                  </p>
                </div>
                {selectedRevision.revision_completed && selectedRevision.completed_at && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Completed At</p>
                    <p className="text-sm">
                      {format(new Date(selectedRevision.completed_at), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">
                    {selectedRevision.revision_completed ? (
                      <span className="text-green-700">Completed</span>
                    ) : (
                      <span className="text-orange-700">Pending</span>
                    )}
                  </p>
                </div>
                <Separator />
                {canComplete ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="revision-completed"
                        checked={markChecked}
                        onCheckedChange={(checked) => setMarkChecked(checked === true)}
                        disabled={selectedRevision.revision_completed}
                      />
                      <Label htmlFor="revision-completed" className="text-sm">
                        Revision completed
                      </Label>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!markChecked || isCompleting || selectedRevision.revision_completed}
                      onClick={handleComplete}
                    >
                      {selectedRevision.revision_completed
                        ? 'Already Completed'
                        : isCompleting
                          ? 'Marking...'
                          : 'Mark as Complete'}
                    </Button>
                  </>
                ) : selectedRevision.revision_completed ? (
                  <Button className="w-full" disabled>
                    Already Completed
                  </Button>
                ) : (
                  <Button className="w-full" disabled title="You don't have permission to mark revisions as complete">
                    Mark as Complete (Restricted)
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ Upload Modal – uses selected revision ID */}
      {canUpload && (
        <UniversalUploadModal
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          title="Upload Shop Revision Files"
          entityId={selectedRevision.id}               // kept for compatibility
          uploadMutation={uploadToShopRevision}
          disabled={isUploading}
          stages={[{ value: 'shop revision', label: 'Shop Revision' }]}
          fileTypes={[
            { value: 'block_drawing', label: 'Block Drawing' },
            { value: 'layout', label: 'Layout' },
            { value: 'ss_layout', label: 'SS Layout' },
            { value: 'shop_drawing', label: 'Shop Drawing' },
            { value: 'photo_media', label: 'Photo Media' },
          ]}
          additionalParams={{
            revision_id: selectedRevision.id,   // ✅ explicitly pass the ID here
            operator_id: currentOperatorId,
          }}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Completion feedback dialog */}
      <Dialog open={showCompleteFeedbackDialog} onOpenChange={setShowCompleteFeedbackDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revision Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Please enter the revision feedback before completing this shop revision.
            </p>
            <Textarea
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              placeholder="Enter revision feedback..."
              className="min-h-[140px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompleteFeedbackDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmComplete}
                disabled={isCompleting || !revisionFeedback.trim()}
              >
                {isCompleting ? 'Submitting...' : 'Submit Feedback & Complete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Popup */}
      <Popup
        isOpen={deleteConfirmationOpen}
        onClose={handleDeleteCancel}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        centered
        className="h-auto"
      >
        <div className="flex justify-end space-x-3 my-3">
          <Button variant="outline" onClick={handleDeleteCancel} className="w-[200px]">
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
    </div>
  );
};

export default ShopRevisionDetailsPage;