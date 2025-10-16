import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {  Save, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';

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

    // Checklist items
    const checklist = [
        { label: 'Customer information verified', checked: true },
        { label: 'Material specifications confirmed', checked: false },
        { label: 'Stone type confirmed', checked: false },
        { label: 'Stone type colour confirmed', checked: false },
        { label: 'Total area size confirmed', checked: false },
        { label: 'FAB type confirmed', checked: false },
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
                <Card className="lg:col-span-2 mt-6">
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
                </Card>

                {/* RIGHT: Review checklist */}
                <div className='border-l'>
                    <Card className='border-none py-6'>
                        <CardHeader className='border-b pb-4'>
                            <CardTitle>FAB ID Review</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Review and approve fabrication details
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {checklist.map((item, index) => (
                                    <label
                                        key={index}
                                        className="flex items-center space-x-2 text-sm"
                                    >
                                        <Checkbox checked={item.checked} />
                                        <span
                                        >
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Notes</p>
                                <Textarea placeholder="Type here..." className="min-h-[100px]" />
                            </div>

                            <div className="space-y-3 mt-6">
                                <Button className="w-full py-6 text-base">
                                    Schedule for templating
                                </Button>
                                <Button variant="outline" className="w-full text-secondary font-bold py-6 text-base">
                                   <Undo2/>
                                    Return to sales
                                </Button>
                                <Button variant="ghost" className="w-full text-[#2B892B] underline py-6 text-base">
                                    <Save/>
                                    Save to draft
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Container>
    );
}
