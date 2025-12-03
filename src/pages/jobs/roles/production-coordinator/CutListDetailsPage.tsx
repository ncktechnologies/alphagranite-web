import { useState } from 'react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { toast } from 'sonner';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import GraySidebar from '../../components/job-details.tsx/GraySidebar';
import { TimeDisplay } from '../../roles/back-to-sales/components/DisplayTime';
import { Documents } from '@/pages/shop/components/files';
import { X } from 'lucide-react';
import { UpdateFabIdModal } from './components/UpdateFabIdModal';
import { FileViewer } from '../drafters/components';

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
            title: "",
            sectionTitle: "Drafting Notes",
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
    ];

    return (
        <>
            <Container className='lg:mx-0'>
                <Toolbar className=' '>
                    <ToolbarHeading title={`FAB ID: ${fabData?.id || 'Loading...'}`} description="Review drafting activity and schedule cut list" />
                </Toolbar>
            </Container>
            <div className=" border-t grid grid-cols-1 lg:grid-cols-12 xl:gap-6 ultra:gap-0  items-start lg:flex-shrink-0">
                <div className="lg:col-span-3 w-full lg:w-[250px] xl:w-[300px] ultra:w-[400px]" >
                    <GraySidebar sections={sidebarSections as any} className='' />
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
                                        <CardTitle>Drafting activity</CardTitle>
                                        <p className="text-sm text-[#4B5563]">
                                            Review drafting work and schedule for cutting
                                        </p>
                                    </CardHeading>
                                    <CardToolbar>
                                        <Button onClick={() => setShowScheduleModal(true)}>Schedule Cut List</Button>
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
                                <CardHeader className='py-5 border-b'>
                                    <TimeDisplay
                                        startTime={draftData?.drafter_start_date ? new Date(draftData.drafter_start_date) : undefined}
                                        endTime={draftData?.drafter_end_date ? new Date(draftData.drafter_end_date) : undefined}
                                        totalTime={draftData?.total_hours_drafted || 0}
                                    />
                                </CardHeader>
                                <CardContent className="">
                                    <h2 className='font-semibold text-sm py-3'>Uploaded files</h2>
                                    <Documents
                                        onFileClick={handleFileClick}
                                        draftingData={draftData}
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