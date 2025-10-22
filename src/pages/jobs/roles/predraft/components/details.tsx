import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReviewChecklistForm } from './ReviewChecklist';
import { Badge } from '@/components/ui/badge';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';

export function PreDraftDetailsPage() {
    // Job Info data array
    const jobInfo = [
        { label: 'FAB ID', value: 'FAB-2024-001' },
        { label: 'FAB Type', value: 'FAB-toilet tiles' },
        { label: 'Account', value: 'FAB-2024-001' },
        { label: 'Job name', value: 'Johnson Kitchen Remodel' },
        { label: 'Job #', value: 'Fabrication' },
        { label: 'Area (s)', value: '2847 Oak Street, Denver, CO' },
        { label: 'Stone type', value: 'Marble tiles' },
        { label: 'Stone colour', value: 'Grey' },
        { label: 'Stone thickness', value: '20cm' },
        { label: 'Edge', value: 'Flat edge' },
        { label: 'Total square ft', value: '234 square ft' },
    ];
    const sidebarSections = [
        {
            title: "Notes",
            type: "notes",
            // className: "",
            notes: [
                {
                    id: 1,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
                {
                    id: 1,
                    avatar: "MR",
                    content: "Lorem ipsum dolor sit amee magna aliqua. veniam, quis nostrud exercitation ",
                    author: "Mike Rodriguez",
                    timestamp: "Oct 3, 2025",
                },
            ],
        },


    ];

    return (
        <Container className=" border-t">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* LEFT: Job Info */}
                <div className="lg:col-span-2 mt-6 ">
                    <div className="flex justify-between items-center" >
                        <div>

                            <p className="font-semibold text-text text-xl tracking-wide">FAB-2024-001</p>
                            <p className="text-sm text-text-foreground font-normal uppercase ">
                                FAB ID
                            </p>
                        </div>
                        <div className='text-text-foreground'>
                            Status:
                            <Badge className='text-[#0BC33F] bg-[#0BC33F]/20 rounded-[50px] h-[30px] font-medium text-[14px] ml-2 px-2'>completed</Badge>
                        </div>
                    </div>
                    <Card className="mt-6 pt-6">
                        <CardHeader>
                            <CardTitle className='text-[#111827] leading-[32px] text-2xl font-bold'>Job Information</CardTitle>
                        </CardHeader>
                        <CardContent >
                            <div className="grid grid-cols-2 md:grid-cols-3 space-y-10">
                                {jobInfo.map((item, index) => (
                                    <div key={index}>
                                        <p className="text-sm text-text-foreground font-normal uppercase tracking-wide">
                                            {item.label}
                                        </p>
                                        <p className="font-semibold text-text text-base leading-[28px] ">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    <div className="w-full lg:w-[250px] XL:W-[300PX] 2xl:w-[400px]  lg:flex-shrink-0">
                        <GraySidebar sections={sidebarSections as any} className='bg-transparent border-none pl-0' />
                    </div>

                </div>

                {/* RIGHT: Review checklist */}
                <div className=' bg-[#FAFAFA] min-h-screen pt-12 pb-3'>
                    <Card className='border-none bg-transparent'>
                        <CardHeader className='border-b pb-4 flex-col items-start'>
                            <CardTitle className='text-text'>Templating Review</CardTitle>
                            <p className="text-sm text-text-foreground leading-[20px]">
                                Review and approve Complete template
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ReviewChecklistForm />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
}
