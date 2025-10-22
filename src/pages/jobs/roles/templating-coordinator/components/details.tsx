import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ReviewChecklistForm } from './ReviewChecklist';

export function FabIdDetailsPage() {
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
                {/* <Card className="lg:col-span-2 mt-6">
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
                <Card className=" lg:col-span-2 mt-6 pt-6">
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

                {/* RIGHT: Review checklist */}
                <div className='border-l'>
                    <Card className='border-none py-6'>
                        <CardHeader className='border-b pb-4 flex-col items-start'>
                            <CardTitle className='font-semibold text-text'>FAB ID Review</CardTitle>
                            <p className="text-sm text-text-foreground">
                                Review and approve fabrication details
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
