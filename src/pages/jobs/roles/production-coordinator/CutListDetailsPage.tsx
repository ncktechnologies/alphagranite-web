import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading, ToolbarActions } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { TimeDisplay } from '../../roles/back-to-sales/components/DisplayTime';
import { Documents } from '@/pages/shop/components/files';
import { X } from 'lucide-react';
import { UpdateFabIdModal } from './components/UpdateFabIdModal';
import { FileViewer } from '../drafters/components';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

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

const CutListDetailsPage = () => {
    type ViewMode = 'activity' | 'file';
    const [viewMode, setViewMode] = useState<ViewMode>('activity');
    const [activeFile, setActiveFile] = useState<any | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);

    const { id } = useParams<{ id: string }>();
    const fabId = id ? parseInt(id) : 0;
    const navigate = useNavigate();

    const { data: fabData, isLoading } = useGetFabByIdQuery(fabId, { skip: !fabId });

    // Prepare clickable links
    const jobNameLink = fabData?.job_details?.id ? `/job/details/${fabData.job_details.id}` : '#';
    const jobNumberLink = fabData?.job_details?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${fabData.job_details.job_number}`
        : '#';

    // Loading state with skeletons
    if (isLoading) {
        return (
            <Container className='lg:mx-0 max-w-full'>
                <Toolbar className=''>
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
                <div className="border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start h-[calc(100vh-120px)] overflow-y-auto">
                    <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="lg:col-span-9">
                        <Card className='my-4'>
                            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                            <CardContent><Skeleton className="h-96 w-full" /></CardContent>
                        </Card>
                    </div>
                </div>
            </Container>
        );
    }

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    };

    // Get draft data from FAB response
    const draftData = (fabData as any)?.draft_data;
    const statusInfo = getFabStatusInfo(fabData?.status_id);

    // Create sidebar sections – long format Job Details
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Account Name", value: fabData?.account_name || '—' },
                {
                    label: "Fab ID",
                    value: (
                        <Link to={`/sales/${fabData?.id}`} className="text-primary hover:underline">
                            FAB-{fabData?.id}
                        </Link>
                    ),
                },
                { label: "Area", value: fabData?.input_area || '—' },
                {
                    label: "Material",
                    value: fabData?.stone_type_name
                        ? `${fabData.stone_type_name} - ${fabData.stone_color_name || ''} - ${fabData.stone_thickness_value || ''}`
                        : '—',
                },
                {
                    label: "Fab Type",
                    value: <span className="uppercase">{fabData?.fab_type || '—'}</span>,
                },
                { label: "Edge", value: fabData?.edge_name || '—' },
                { label: "Total s.f.", value: fabData?.total_sqft?.toString() || '—' },
                {
                    label: "Scheduled Date",
                    value: fabData?.templating_schedule_start_date
                        ? new Date(fabData.templating_schedule_start_date).toLocaleDateString()
                        : 'Not scheduled',
                },
                { label: "Assigned to", value: fabData?.draft_data?.drafter_name || 'Unassigned' },
                { label: "Sales Person", value: fabData?.sales_person_name || '—' },
                { label: "SlabSmith Needed", value: fabData?.slab_smith_ag_needed ? 'Yes' : 'No' },
            ],
        },
        {
            title: "Drafting Notes",
            type: "notes",
            notes: draftData ? [
                {
                    id: 1,
                    avatar: draftData?.drafter_name?.substring(0, 2).toUpperCase() || 'DR',
                    content: draftData?.draft_note || `Drafting completed with ${draftData?.no_of_piece_drafted || 0} pieces, ${draftData?.total_sqft_drafted || 0} sq ft`,
                    author: draftData?.drafter_name || 'Unknown Drafter',
                    timestamp: draftData?.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
                }
            ] : [],
        },
        {
            title: "FAB Notes",
            type: "notes",
            notes: getAllFabNotes(fabData?.fab_notes || []).map(note => {
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
                    general: { label: 'General', color: 'text-gray-700' }
                };
                const stage = note.stage || 'general';
                const config = stageConfig[stage] || stageConfig.general;
                return {
                    id: note.id,
                    avatar: note.created_by_name?.charAt(0).toUpperCase() || 'U',
                    content: `<span class="inline-block px-2 py-1 rounded text-xs font-medium ${config.color} bg-gray-100 mr-2">${config.label}</span>${note.note}`,
                    author: note.created_by_name || 'Unknown',
                    timestamp: note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'
                };
            })
        }
    ];

    return (
        <>
            {/* Top toolbar with clickable job name/number and description + status badge */}
            <Container className='lg:mx-0 max-w-full'>
                <Toolbar className=''>
                    <div className="flex items-center justify-between w-full">
                        <ToolbarHeading
                            title={
                                <div className="text-2xl font-bold">
                                    <a href={jobNameLink} className="hover:underline">
                                        {fabData?.job_details?.name || `Job ${fabData?.job_id}`}
                                    </a>
                                    {' - '}
                                    <a href={jobNumberLink} className="hover:underline">
                                        {fabData?.job_details?.job_number || fabData?.job_id}
                                    </a>
                                </div>
                            }
                            description={fabData?.job_details?.description || 'No description available'}
                        />
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                                {statusInfo.text}
                            </span>
                        </div>
                    </div>
                    <ToolbarActions>
                        <BackButton fallbackUrl="/job/cut-list" />
                    </ToolbarActions>
                </Toolbar>
            </Container>

            {/* Scrollable area with sticky sidebar */}
            <div className="border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0 items-start h-[calc(100vh-120px)] overflow-y-auto">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px] sticky top-0 self-start">
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}
                    />
                </div>
                <Container className="lg:col-span-9">
                    {viewMode === 'file' && activeFile ? (
                        <div className="">
                            <div className="flex justify-end">
                                <Button
                                    variant="inverse"
                                    size="sm"
                                    onClick={() => {
                                        setViewMode('activity');
                                        setActiveFile(null);
                                    }}
                                >
                                    <X className="w-6 h-6" />
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
                            <Card className='my-4'>
                                <CardHeader>
                                    <CardHeading className='flex flex-col items-start py-4'>
                                        <CardTitle>Cutlist activity</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Review drafting work and schedule for cutting
                                        </p>
                                    </CardHeading>
                                    <CardToolbar>
                                        <Can action="update" on="Cut List">
                                            <Button onClick={() => setShowScheduleModal(true)}>Schedule Cut</Button>
                                        </Can>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/job/cut-list')}
                                        >
                                            Back to Cut List
                                        </Button>
                                    </CardToolbar>
                                </CardHeader>
                            </Card>

                            <Card>
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files from final programming</h2>
                                    <Documents
                                        draftingData={{
                                            ...fabData?.draft_data,
                                            files: fabData?.draft_data?.files?.filter((file: any) => {
                                                const stageKey = file.stage_name ?? file.stage;
                                                return (
                                                    stageKey === 'final_programming' ||
                                                    stageKey === 'cut_list' ||
                                                    (stageKey && stageKey.toLowerCase().includes('final_programming')) ||
                                                    (stageKey && stageKey.toLowerCase().includes('cut_list'))
                                                );
                                            }),
                                            file_ids: ""
                                        }}
                                        onFileClick={handleFileClick}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </Container>
            </div>

            {/* Schedule Cut List Modal */}
            <UpdateFabIdModal
                open={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                fabData={fabData}
            />
        </>
    );
};

export default CutListDetailsPage;