import { BackButton } from '@/components/common/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCompleteShopRevisionMutation, useGetShopRevisionsByFabIdQuery } from '@/store/api/shopRevision';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { FileGallery, type FileSource, type UnifiedFile } from '@/pages/jobs/components/FileGallery';
import { FileViewer } from '@/pages/jobs/roles/drafters/components';
import { Link } from 'react-router';
import { useNavigate } from 'react-router';

const ShopRevisionDetailsPage = () => {
  const { fabId } = useParams<{ fabId: string }>();
  const numericFabId = Number(fabId);
  const navigate = useNavigate();
  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null);
  const [markChecked, setMarkChecked] = useState(false);
  const [activeFile, setActiveFile] = useState<UnifiedFile | null>(null);

  const { data: revisionsData, isLoading } = useGetShopRevisionsByFabIdQuery(numericFabId, {
    skip: !numericFabId,
  });
  const { data: fabResponse } = useGetFabByIdQuery(numericFabId, { skip: !numericFabId });
  const [completeRevision, { isLoading: isCompleting }] = useCompleteShopRevisionMutation();

  const revisions = useMemo(() => (Array.isArray(revisionsData) ? revisionsData : []), [revisionsData]);
  const fab = (fabResponse as any)?.data ?? fabResponse;

  const revisionFiles: UnifiedFile[] = useMemo(() => {
    if (!fab) return [];
    const rawFiles = [
      ...(fab.files || []),
      ...(fab.draft_data?.files || []),
      ...(fab.slabsmith_data?.files || []),
      ...(fab.sales_ct_data?.files || []),
      ...(fab.cnc_data?.files || []),
    ];

    return rawFiles
      .filter((f: any) => (f.stage_name || f.stage) === 'shop_revision')
      .map((f: any): UnifiedFile => ({
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
  }, [fab]);

  const selectedRevision = useMemo(() => {
    if (!revisions.length) return null;
    if (selectedRevisionId) {
      return revisions.find((r) => r.id === selectedRevisionId) ?? revisions[0];
    }
    return revisions[0];
  }, [revisions, selectedRevisionId]);

  const handleSelectRevision = (id: number) => {
    setSelectedRevisionId(id);
    setMarkChecked(false);
  };

  const handleComplete = async () => {
    if (!selectedRevision || !markChecked) return;
    try {
      await completeRevision(selectedRevision.id).unwrap();
      toast.success('Revision marked as complete.');
      setMarkChecked(false);
      navigate('/revision');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to complete revision.');
    }
  };

  const fileSources: FileSource[] = revisionFiles.length > 0 ? [{ kind: 'raw', data: revisionFiles }] : [];

  const fabInfo = [
    { label: 'FAB ID', value: String(fab?.id || fabId || '—') },
    {
      label: 'JOB #',
      value: fab?.job_details?.id ? (
        <Link to={`/job/details/${fab.job_details.id}`} className="text-primary hover:underline">
          {fab?.job_details?.job_number || '—'}
        </Link>
      ) : (fab?.job_details?.job_number || '—'),
    },
    { label: 'JOB NAME', value: fab?.job_details?.name || '—' },
    { label: 'FAB TYPE', value: fab?.fab_type || '—' },
    { label: 'ACCOUNT', value: fab?.account_name || '—' },
    { label: 'CURRENT STAGE', value: fab?.current_stage || '—' },
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
            <CardHeader>
              <CardTitle>FAB Revision Files</CardTitle>
            </CardHeader>
            <CardContent>
              <FileGallery
                sources={fileSources}
                onFileClick={(file) => setActiveFile(file)}
                defaultLayout="card"
                emptyMessage="No shop revision files uploaded for this FAB."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revision History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading revisions...</p>
              ) : revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revisions found for this FAB.</p>
              ) : (
                revisions.map((revision) => (
                  <button
                    key={revision.id}
                    className={`w-full text-left border rounded-md p-3 transition ${
                      selectedRevision?.id === revision.id ? 'border-green-600 bg-green-50/50' : 'border-border'
                    }`}
                    onClick={() => handleSelectRevision(revision.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">Revision #{revision.id}</p>
                      <span className={`text-xs ${revision.revision_completed ? 'text-green-700' : 'text-orange-700'}`}>
                        {revision.revision_completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{revision.revision_note}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-4 border-l shadow-sm">
          <CardHeader>
            <CardTitle>Revision Details</CardTitle>  {/* Changed from "Revision Form" */}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRevision ? (
              <p className="text-sm text-muted-foreground">Select a revision to view details.</p>
            ) : (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">FAB ID</p>
                  <p className="text-sm font-medium">{selectedRevision.fab_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Revision Note</p>
                  <p className="text-sm">{selectedRevision.revision_note || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requested By</p>
                  <p className="text-sm">{selectedRevision.requested_by_name || selectedRevision.requested_by || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm">{selectedRevision.assigned_to_name || selectedRevision.assigned_to || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm">
                    {selectedRevision.created_at ? format(new Date(selectedRevision.created_at), 'MMM dd, yyyy h:mm a') : '—'}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShopRevisionDetailsPage;