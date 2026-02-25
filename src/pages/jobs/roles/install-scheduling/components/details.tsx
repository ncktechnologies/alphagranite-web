import { Container } from '@/components/common/container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GraySidebar from '@/pages/jobs/components/job-details.tsx/GraySidebar';
import { Link, useParams } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';

// Helper function to filter fab notes by stage
const filterNotesByStage = (fabNotes: any[], stage: string) => {
    return fabNotes.filter(note => note.stage === stage);
};

// Helper function to get all fab notes (unfiltered)
const getAllFabNotes = (fabNotes: any[]) => {
    return fabNotes || [];
};

export function InstallSchedulingDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: fab, isLoading, isError, error } = useGetFabByIdQuery(Number(id));

    if (isLoading) {
        return (
            <Container className=" border-t">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-80 mt-2" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 mt-6 ">
                        <div className="flex justify-between items-center" >
                            <div>
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-16 mt-1" />
                            </div>
                            <div>
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </div>
                        <Card className="mt-6 pt-6">
                            <CardHeader>
                                <Skeleton className="h-8 w-48" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-64 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                    <Skeleton className="h-96 w-full" />
                </div>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container className="border-t">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Failed to load install scheduling details. {error && 'Please try again later.'}
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    if (!fab) {
        return (
            <Container className="border-t">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Not Found</AlertTitle>
                    <AlertDescription>
                        Install scheduling record not found.
                    </AlertDescription>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="border-t">
            <Toolbar>
                <ToolbarHeading
                    title={`${fab.job_details?.name || 'Install Scheduling'}`}
                    description={`Job #${fab.job_details?.job_number || fab.id}`}
                />
            </Toolbar>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold">Install Scheduling Details</h3>
                            <p className="text-sm text-muted-foreground">Current Stage: {fab.current_stage}</p>
                        </div>
                        <Link to={`/app/jobs/install-scheduling`}>
                            <Badge variant="outline">Back to List</Badge>
                        </Link>
                    </div>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Job Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Job Name</p>
                                    <p className="font-medium">{fab.job_details?.name || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Job Number</p>
                                    <p className="font-medium">{fab.job_details?.job_number || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Sq Ft</p>
                                    <p className="font-medium">{fab.total_sqft || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge className="mt-1">{fab.current_stage}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {fab.fab_notes && fab.fab_notes.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {fab.fab_notes.map((note: any, index: number) => (
                                        <div key={index} className="text-sm p-2 bg-muted rounded">
                                            <p className="font-medium">{note.stage}</p>
                                            <p className="text-muted-foreground">{note.note || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <GraySidebar fab={fab} />
            </div>
        </Container>
    );
}
