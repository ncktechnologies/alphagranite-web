import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TemplatingActivityForm } from './templatingActivity';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';

export function TechnicianDetailsPage() {
    // Job Info data array
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
        <Container>
            <Toolbar className=' '>
                    <ToolbarHeading title="FAB ID: 4456" description="Update templating activity" />
                    
                </Toolbar>
        </Container>
        <div className=" border-t grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            <div className="lg:col-span-3" >
                <GraySidebar sections={sidebarSections} />
                <div className="bg-text w-[320px] py-4 px-6 shadow-sm m-0">
                    <h3 className="font-semibold text-white text-lg mb-5">Progress Timeline</h3>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <p className="text-base text-white">Scheduled date</p>
                    </div>
                    <p className="text-xs text-white ml-4 mt-1">March 14, 4:45 PM</p>
                </div>
            </div>

            <Container className='lg:col-span-9 '>
                {/* Header / Breadcrumb */}
                {/* <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">New Fab ID Submission</h1>
                    <p className="text-sm text-muted-foreground">
                        Review and approve fabrication details
                    </p>
                </div>
                <Link to="/jobs/sales">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Jobs
                    </Button>
                </Link>
            </div> */}


                {/* LEFT: Job Info */}
                {/* <Card className="lg:col-span-1 mt-6">
                    <CardHeader>
                        <CardTitle>Job Information</CardTitle>
                    </CardHeader>
                    <CardContent >
                        <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                            {jobInfo.map((item, index) => (
                                <div key={index}>
                                    <p className="text-sm text-foreground font-normal uppercase tracking-wide">
                                        {item.label}
                                    </p>
                                    <p className="font-semibold text-text text-base">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card> */}

                {/* RIGHT: Review checklist */}
                <div className='max-w-3xl w-full mx-auto'>
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
        </>
    );
}
