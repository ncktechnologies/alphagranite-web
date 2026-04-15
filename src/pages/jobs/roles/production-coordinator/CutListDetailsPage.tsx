import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { Documents } from '@/pages/shop/components/files';
import { FileViewer } from '../drafters/components';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { UpdateFabIdModal } from './components/UpdateFabIdModal';
import { stageConfig } from '@/utils/note-utils';

// Helper functions (reused from draft details)
const getAllFabNotes = (fabNotes: any[]) => fabNotes || [];

const getFabStatusInfo = (statusId: number | undefined) => {
  if (statusId === 0) return { className: 'bg-red-100 text-red-800', text: 'ON HOLD' };
  if (statusId === 1) return { className: 'bg-green-100 text-green-800', text: 'ACTIVE' };
  return { className: 'bg-gray-100 text-gray-800', text: 'LOADING' };
};

export function CutListDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const fabId = id ? Number(id) : 0;

  const { data: fabData, isLoading, refetch } = useGetFabByIdQuery(fabId, {
    skip: !fabId,
    refetchOnMountOrArgChange: true,
  });

  const [viewMode, setViewMode] = useState<'activity' | 'file'>('activity');
  const [activeFile, setActiveFile] = useState<any | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const cuttingScheduleDate = fabData?.shop_date_schedule;
  const isScheduled = !!cuttingScheduleDate;

  const handleFileClick = (file: any) => {
    const enhancedFile = {
      ...file,
      url: file.file_url || file.url,
      name: file.name || file.file_name,
      type: file.file_type || file.type,
      size: file.file_size || file.size,
      uploadedAt: file.created_at ? new Date(file.created_at) : new Date(),
      stage_name: file.stage_name ?? file.stage,
    };
    setActiveFile(enhancedFile);
    setViewMode('file');
  };

  // Prepare sidebar sections
  const sidebarSections = useMemo(() => {
    if (!fabData) return [];

    const draftData = fabData.draft_data;

    return [
      {
        title: 'Job Details',
        type: 'details',
        items: [
          { label: 'Account Name', value: fabData.account_name || '—' },
          {
            label: 'Fab ID',
            value: (
              <Link to={`/sales/${fabData.id}`} className="text-primary hover:underline">
                {fabData.id}
              </Link>
            ),
          },
          { label: 'Area', value: fabData.input_area || '—' },
          {
            label: 'Material',
            value: fabData.stone_type_name
              ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
              : '—',
          },
          { label: 'Fab Type', value: <span className="uppercase">{fabData.fab_type || '—'}</span> },
          { label: 'Edge', value: fabData.edge_name || '—' },
          { label: 'Total s.f.', value: fabData.total_sqft?.toString() || '—' },
          {
            label: 'Scheduled Date',
            value: cuttingScheduleDate
              ? new Date(cuttingScheduleDate).toLocaleDateString()
              : fabData.templating_schedule_start_date
                ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
                : 'Not scheduled',
          },
          { label: 'Drafter Assigned', value: draftData?.drafter_name || 'Unassigned' },
          { label: 'Sales Person', value: fabData.sales_person_name || '—' },
          { label: 'SlabSmith Needed', value: fabData.slab_smith_ag_needed ? 'Yes' : 'No' },
        ],
      },
      {
        title: 'Drafting Notes',
        type: 'notes',
        notes: draftData
          ? [
            {
              id: 1,
              avatar: draftData.drafter_name?.substring(0, 2).toUpperCase() || 'DR',
              content:
                draftData.draft_note ||
                `Drafting completed with ${draftData.no_of_piece_drafted || 0} pieces, ${draftData.total_sqft_drafted || 0} sq ft`,
              author: draftData.drafter_name || 'Unknown Drafter',
              timestamp: draftData.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
            },
          ]
          : [],
      },
      {
        title: 'Notes',
        type: 'notes',
        notes: Array.isArray(fabData.notes)
          ? fabData.notes.map((note: string, index: number) => ({
            id: index,
            avatar: 'N',
            content: note,
            author: 'System',
            timestamp: new Date().toLocaleDateString(),
          }))
          : [],
      },
      {
        title: 'FAB Notes',
        type: 'notes',
        notes: Array.isArray(fabData.fab_notes)
          ? fabData.fab_notes.map((note: any) => {
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
    ];
  }, [fabData, cuttingScheduleDate]);

  // Filter files for "final programming" stage
  const finalProgrammingFiles = useMemo(() => {
    if (!fabData?.draft_data?.files) return [];
    return fabData.draft_data.files.filter((file: any) => {
      const stage = file.stage_name ?? file.stage;
      return stage === 'final_programming' || stage === 'cut_list' || stage?.toLowerCase().includes('final_programming');
    });
  }, [fabData]);

  // Loading skeleton (matching draft details)
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* sticky toolbar skeleton */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 lg:px-8 py-3">
          <Skeleton className="h-8 w-72 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* sidebar skeleton */}
          <div className="w-full lg:w-[220px] xl:w-[260px] shrink-0 border-r">
            <Skeleton className="h-full min-h-[300px] w-full" />
          </div>
          {/* content skeleton */}
          <div className="flex-1 p-4 sm:p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
  const jobNumberLink = fabData?.job_details?.job_number
    ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
    : '#';
  const statusInfo = getFabStatusInfo(fabData?.status_id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Sticky toolbar ──────────────────────────────────────────────────── */}
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
                      {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                    </a>
                    <span className="mx-1 text-gray-400">·</span>
                    <a
                      href={jobNumberLink}
                      className="hover:underline text-gray-600"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fabData?.job_details?.job_number || fabData?.job_id}
                    </a>
                  </div>
                }
                description="Cutlist Details"
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

      {/* ── Two‑column layout ─────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        {/* Gray sidebar (sticky) */}
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
          <GraySidebar sections={sidebarSections as any} jobId={fabData?.job_id} />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 space-y-4">
          {viewMode === 'file' && activeFile ? (
            // File viewer
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <div>
                  <h3 className="font-semibold text-sm">{activeFile.name}</h3>
                  <p className="text-xs text-gray-500">
                    {activeFile.size ? `${Math.round(activeFile.size / 1024)} KB` : 'Unknown size'} · {activeFile.stage_name}
                  </p>
                </div>
                <Button
                  variant="inverse"
                  size="sm"
                  onClick={() => {
                    setViewMode('activity');
                    setActiveFile(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <FileViewer
                file={activeFile}
                onClose={() => {
                  setViewMode('activity');
                  setActiveFile(null);
                }}
              />
            </div>
          ) : (
            <>
              {/* ── Cutlist activity card ──────────────────────────────────── */}
              <Card>
                <CardHeader className="py-3 px-4 sm:px-5">
                  <div>
                    <CardTitle className="text-sm sm:text-base">Cutlist activity</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">Review drafting work and schedule for cutting</p>
                  </div>
                  <Can action="update" on="Cut List">
                    <Button
                      onClick={() => setShowScheduleModal(true)}
                    // variant={isScheduled ? 'outline' : 'default'}
                    // className={isScheduled ? '' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {isScheduled ? 'Update Cut' : 'Schedule Cut'}
                    </Button>
                  </Can>
                </CardHeader>
              </Card>

              {/* ── Uploaded files card ────────────────────────────────────── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">All FAB Files</CardTitle>
                  <p className="text-xs text-muted-foreground">Files from drafting, SlabSmith, SCT, CNC, and final programming</p>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-5 space-y-5">
                  <Documents
                    draftingData={fabData?.draft_data}
                    slabsmithData={(fabData as any)?.slabsmith_data}
                    sctData={(fabData as any)?.sales_ct_data}
                    cncData={(fabData as any)?.cnc_data}
                    onFileClick={handleFileClick}
                    showDeleteButton={false}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>

      {/* ── Schedule modal ────────────────────────────────────────────────── */}
      {showScheduleModal && (
        <UpdateFabIdModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          fabData={fabData}
        //   onSuccess={() => {
        //     refetch(); // Refresh data after scheduling
        //     toast.success('Cutting schedule updated');
        //   }}
        />
      )}
    </div>
  );
}

export default CutListDetailsPage;