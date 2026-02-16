import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { TimeDisplay } from '../../roles/back-to-sales/components/DisplayTime';
import { Documents } from '@/pages/shop/components/files';
import { X } from 'lucide-react';
import { UpdateFabIdModal } from './components/UpdateFabIdModal';
import { FileViewer } from '../drafters/components';
import { Can } from '@/components/permission';
import { BackButton } from '@/components/common/BackButton';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
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

    if (isLoading) {
        return <div>Loading...</div>;
    }

    const handleFileClick = (file: any) => {
        setActiveFile(file);
        setViewMode('file');
    };

    // Get draft data from FAB response
    const draftData = (fabData as any)?.draft_data;

    // Create sidebar sections with actual FAB data
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Job Name", value: fabData?.job_details?.name || `Job ${fabData?.job_id}` },
                { label: "Job Number", value: fabData?.job_details?.job_number || String(fabData?.job_id) },
                { label: "Stone Type", value: fabData?.stone_type_name || 'N/A' },
                { label: "Stone Color", value: fabData?.stone_color_name || 'N/A' },
                { label: "Stone Thickness", value: fabData?.stone_thickness_value || 'N/A' },
                { label: "Edge Profile", value: fabData?.edge_name || 'N/A' },
                { label: "Total Sq Ft", value: fabData?.total_sqft?.toString() || 'N/A' },
                { label: "Input Area", value: fabData?.input_area?.toString() || 'N/A' },
                { label: "FAB Type", value: fabData?.fab_type || 'N/A' },
            ],
        },
        {
            title: "Drafting Notes",
            type: "notes",
            // Use actual drafting notes from FAB response
            notes: draftData ? [
                {
                    id: 1,
                    avatar: draftData?.drafter_name?.substring(0, 2).toUpperCase() || 'DR',
                    content: draftData?.draft_note || `Drafting completed with ${draftData?.no_of_piece_drafted || 0} pieces, ${draftData?.total_sqft_drafted || 0} sq ft`,
                    author: draftData?.drafter_name || 'Unknown Drafter',
                    timestamp: draftData?.updated_at ? new Date(draftData.updated_at).toLocaleDateString() : 'N/A',
                }
            ] : [], // Empty array if no draft data
        },
        {
            title: "FAB Notes",
            type: "notes",
            notes: getAllFabNotes(fabData?.fab_notes || []).map(note => {
                // Stage display mapping
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
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <ToolbarHeading
                                title={`FAB ID: ${fabData?.id || 'Loading...'}`}
                                description="Review drafting activity and schedule cut list"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${fabData?.status_id !== undefined ? {
                                0: 'bg-red-100 text-red-800',
                                1: 'bg-green-100 text-green-800'
                            }[fabData.status_id as 0 | 1] : 'bg-gray-100 text-gray-800'}`}>
                                {fabData?.status_id !== undefined ? {
                                    0: 'ON HOLD',
                                    1: 'ACTIVE'
                                }[fabData.status_id as 0 | 1] : 'LOADING'}
                            </span>
                        </div>
                    </div>
                    <ToolbarActions>
                        <BackButton fallbackUrl="/job/cut-list" />
                    </ToolbarActions>
                </Toolbar>
            </Container>
            <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
                    <GraySidebar
                        sections={sidebarSections as any}
                        jobId={fabData?.job_id}  // Add this prop
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
                                <CardHeader >
                                    <CardHeading className='flex flex-col items-start py-4'>
                                        <CardTitle>Cutlist activity</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Review drafting work and schedule for cutting
                                        </p>
                                    </CardHeading>
                                    <CardToolbar>
                                        <Can action="update" on="Cut List">
                                            <Button onClick={() => setShowScheduleModal(true)}>Schedule Cut List</Button>
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
                                {/* <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                        totalTime={draftData?.total_hours_drafted || 0}
                                    />
                                </CardHeader> */}
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files from final programming</h2>
                                    {/* <Documents
                                        onFileClick={handleFileClick}
                                        draftingData={draftData}
                                    /> */}

                                    <Documents
                                        draftingData={{
                                            ...fabData?.draft_data,
                                            files: fabData?.draft_data.files.filter((file: any) =>
                                                file.stage === 'final_programming' ||
                                                file.stage === 'cut_list' ||
                                                (file.stage && file.stage.toLowerCase().includes('final_programming')) ||
                                                (file.stage && file.stage.toLowerCase().includes('cut_list'))
                                            ),
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