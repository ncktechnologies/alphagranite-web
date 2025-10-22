import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TemplatingActivityForm } from './templatingActivity';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';

export function TechnicianDetailsPage() {
    const sidebarSections = [
        {
            title: "Job Details",
            type: "details",
            items: [
                { label: "Customer", value: "Johnson Kitchen & Bath" },
                { label: "Area", value: "2847 Oak Street, Denver, CO" },
                { label: "Material", value: "Calacatta Gold Quartz - 3cm" },
                { label: "Scheduled Date", value: "03 Oct, 2025" },
                { label: "Assigned to", value: "Mike Rodriguez" },
            ],
        },
    ];

    return (
        <>
            <Container className='lg:mx-0 max-w-full'>
                <Toolbar className=''>
                    <ToolbarHeading title="FAB ID: 4456" description="Update templating activity" />
                </Toolbar>
            </Container>
            
            {/* Changed to use flex on large screens with consistent spacing */}
            <div className="border-t flex flex-col lg:flex-row gap-3 xl:gap-4 items-start max-w-full">
                {/* Sidebar - fixed width */}
                <div className="w-full lg:w-[250px] xl:w-[286px] ultra:w-[500px] lg:flex-shrink-0">
                    <GraySidebar sections={sidebarSections as any} />
                    <div className="bg-text w-full py-4 px-6 shadow-sm mt-3">
                        <h3 className="font-semibold text-white text-lg mb-5">Progress Timeline</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            <p className="text-base text-white">Scheduled date</p>
                        </div>
                        <p className="text-xs text-white ml-4 mt-1">March 14, 4:45 PM</p>
                    </div>
                </div>

                {/* Main content - flexible */}
                <div className="lg:flex-1 min-w-0">
                    <Container className='mx-0 max-w-full px-0'>
                        <div className='max-w-6xl w-full mx-auto lg:mr-auto'>
                            <Card className='my-4'>
                                <CardHeader className='flex flex-col items-start py-4'>
                                    <CardTitle>Template activity</CardTitle>
                                    <p className="text-sm text-[#4B5563]">
                                        Update your templating activity here
                                    </p>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardContent>
                                    <TemplatingActivityForm />
                                </CardContent>
                            </Card>
                        </div>
                    </Container>
                </div>
            </div>
        </>
    );
}