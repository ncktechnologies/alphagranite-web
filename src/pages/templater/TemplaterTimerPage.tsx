import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OperatorTimerComponent } from '../operator/components/TimerComponent';
import {
    useGetTemplaterTimerStateQuery,
    useStartTemplaterTimerMutation,
    usePauseTemplaterTimerMutation,
    useResumeTemplaterTimerMutation,
    useStopTemplaterTimerMutation,
} from '@/store/api/jobTimers';
import { useDeleteJobMediaMutation, useGetJobByIdQuery, useGetJobMediaQuery } from '@/store/api/job';
import { PauseModal } from './PauseModal';
import { StopModal } from './StopModal';
import { TemplaterTimerHistory } from './TemplaterHistory';
import { Toolbar, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { BackButton } from '@/components/common/BackButton';
import { FileGallery } from '../jobs/components/FileGallery';
import { Card, CardContent, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';
import { Can } from '@/components/permission';
import DialogContent, { Dialog, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { JobMediaUpload } from '../jobs/components/JobMediaUpload';
import { Skeleton } from '@/components/ui/skeleton';
import Popup from '@/components/ui/popup';
import { FileViewer } from '../jobs/roles/drafters/components';

export function TemplaterTimerPage() {
    const { job_id } = useParams<{ job_id: string }>();
    const navigate = useNavigate();

    const currentUser = useSelector((s: any) => s.user.user);
    const templater_id = currentUser?.id;

    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<{ id: number; name: string } | null>(null);
    const [activeFile, setActiveFile] = useState<any | null>(null);


    // Fetch job details for header
    const { data: jobData } = useGetJobByIdQuery(Number(job_id), { skip: !job_id });

    const { data: mediaFiles, isLoading: mediaLoading, refetch: refetchMedia } = useGetJobMediaQuery(
        { job_id: job_id },
        { skip: !job_id },
    );
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isStopped, setIsStopped] = useState(false);

    const [pauseModalOpen, setPauseModalOpen] = useState(false);
    const [stopModalOpen, setStopModalOpen] = useState(false);

    const shouldSkip = !job_id || !templater_id;
    const { data: timerState, refetch, isLoading: isTimerLoading } = useGetTemplaterTimerStateQuery(
        { job_id: Number(job_id), templater_id: templater_id! },
        {
            skip: shouldSkip,
            pollingInterval: isRunning ? 5000 : 0, // Poll every 5s when running
        }
    );
      const [deleteJobMedia, { isLoading: isDeleting }] = useDeleteJobMediaMutation();
    

    const [startTimer] = useStartTemplaterTimerMutation();
    const [pauseTimer] = usePauseTemplaterTimerMutation();
    const [resumeTimer] = useResumeTemplaterTimerMutation();

    // Sync timer state from server
    useEffect(() => {
        if (timerState) {
            const session = timerState.session;
            if (session) {
                // Use total_actual_seconds for cumulative time across all sessions
                // This includes all work time from previous sessions + current session
                const totalSeconds = timerState.total_actual_seconds || session.total_work_seconds || 0;
                setElapsedTime(totalSeconds);
                setIsRunning(session.status === 'running');
                setIsPaused(session.status === 'paused');
                setIsStopped(session.status === 'stopped');


            } else {
                setIsStopped(false);
                setElapsedTime(0);
                setIsRunning(false);
                setIsPaused(false);
            }
        }
    }, [timerState]);

    // Note: OperatorTimerComponent has its own internal interval for smooth ticking
    // We don't need a separate interval here - the component handles it via onTimeUpdate

    const handleStart = async () => {
        if (!templater_id || !job_id) return;
        try {
            await startTimer({ job_id: Number(job_id), templater_id }).unwrap();
            localStorage.setItem('activeTemplaterJobId', job_id);
            toast.success('Timer started');
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to start timer');
        }
    };

    const handlePause = () => setPauseModalOpen(true);
    const handleStopSubmit = () => setStopModalOpen(true);

    const handleResume = async () => {
        if (!templater_id) return;
        try {
            await resumeTimer({ job_id: Number(job_id), templater_id }).unwrap();
            toast.success('Timer resumed');
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to resume timer');
        }
    };

    const handlePauseSuccess = () => refetch();
    const handleStopSuccess = () => refetch();

    const handleFileClick = (file: any) => {
        setActiveFile({
            ...file,
            url: file.url || file.file_url,
            name: file.name || file.file_name,
            type: file.type || 'application/octet-stream',
            size: file.size || 0,
        });
    };

    const handleDeleteClick = (file: { id: number; name: string }) => {
        setFileToDelete(file);
        setDeleteConfirmationOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!fileToDelete || !job_id) return;
        try {
            await deleteJobMedia({ job_id: job_id, file_id: fileToDelete.id }).unwrap();
            toast.success('File deleted successfully');
            refetchMedia();
        } catch {
            toast.error('Failed to delete file');
        } finally {
            setDeleteConfirmationOpen(false);
            setFileToDelete(null);
        }
    };

    // Prepare clickable links
    const jobNameLink = jobData?.id ? `/job/details/${jobData.id}` : '#';
    const jobNumberLink = jobData?.job_number
        ? `https://alphagraniteaustin.moraware.net/sys/search?search=${jobData.job_number}`
        : '#';

    if (shouldSkip) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-red-600">Missing information</h2>
                    <p className="text-gray-600">Unable to identify the job or templater.</p>
                    <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
                </div>
            </div>
        );
    }
    if (activeFile) {
        return (
            <div className="fixed inset-0 z-50 bg-white overflow-auto">
                <FileViewer file={activeFile} onClose={() => setActiveFile(null)} />
            </div>
        );
    }
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Sticky toolbar - matching details page layout */}
            <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
                <div className="px-3 sm:px-4 lg:px-6">
                    <Toolbar className="py-2 sm:py-3">
                        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                            <ToolbarHeading
                                title={
                                    <div className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                                        <a href={jobNameLink} className="hover:underline"
                                            target="_blank"
                                            rel="noreferrer">
                                            {jobData?.name || `Job ${job_id}`}
                                        </a>
                                        <span className="mx-1 text-gray-400">·</span>
                                        <a
                                            href={jobNumberLink}
                                            className="hover:underline text-gray-600"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {jobData?.job_number || job_id}
                                        </a>
                                    </div>
                                }
                                description="Templater Timer"
                            />
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <BackButton />
                            </div>
                        </div>
                    </Toolbar>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    {isTimerLoading ? (
                        <div className="space-y-6">
                            {/* Timer skeleton */}
                            <div className="bg-white rounded-lg border shadow-sm p-8 space-y-4">
                                <div className="flex justify-center">
                                    <Skeleton className="h-32 w-48 rounded-full" />
                                </div>
                                <div className="flex justify-center gap-3">
                                    <Skeleton className="h-10 w-24" />
                                    <Skeleton className="h-10 w-24" />
                                </div>
                            </div>
                            {/* Submit button skeleton */}
                            <div className="flex justify-center">
                                <Skeleton className="h-10 w-32" />
                            </div>
                        </div>
                    ) : !isStopped ? (
                        <>
                            <OperatorTimerComponent
                                totalTime={elapsedTime}
                                isRunning={isRunning}
                                isPaused={isPaused}
                                onStart={handleStart}
                                onPause={handlePause}
                                onResume={handleResume}
                                onTimeUpdate={setElapsedTime}
                                disabled={!job_id || !templater_id}
                            />
                            <div className="mt-6 flex justify-center">
                                <Button
                                    onClick={handleStopSubmit}
                                    size="xl"
                                    disabled={!job_id || !templater_id}
                                >
                                    Submit
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-8 bg-white rounded-lg border shadow-sm">
                            <div className="text-lg font-semibold text-gray-700 mb-2">Session Ended</div>
                            <p className="text-gray-500">This timer session has been completed and cannot be restarted.</p>
                            <div className="mt-4 text-sm text-gray-400">
                                Total time worked: {Math.floor(elapsedTime / 3600)}h {Math.floor((elapsedTime % 3600) / 60)}m {elapsedTime % 60}s
                            </div>
                        </div>
                    )}
                    {/* ── Media Files ─────────────────────────────────────────────────── */}
                    <Card className="my-4">
                        <CardHeader>
                            <CardHeading className="flex flex-col items-start py-4">
                                <CardTitle>Media Files</CardTitle>
                                <p className="text-sm text-[#4B5563]">Photos and videos associated with this job</p>
                            </CardHeading>

                            <CardToolbar>
                                <Can action="create" on="jobs">
                                    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Camera className="h-4 w-4 mr-2" />
                                                Upload Media
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Upload Media Files</DialogTitle>
                                            </DialogHeader>
                                            <JobMediaUpload
                                                jobId={job_id}
                                                onUploadComplete={refetchMedia}
                                                onClose={() => setShowUploadDialog(false)}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </Can>
                            </CardToolbar>
                        </CardHeader>

                        <CardContent>
                            {mediaLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="rounded-xl border overflow-hidden">
                                            <Skeleton className="aspect-video w-full" />
                                            <div className="p-3 space-y-2">
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-3 w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <FileGallery
                                    sources={[{ kind: 'job-media', data: mediaFiles ?? [] }]}
                                    onFileClick={handleFileClick}
                                    onDeleteFile={(file) =>
                                        handleDeleteClick({ id: Number(file.id), name: file.name })
                                    }
                                    deletePermissionSubject="jobs"
                                    emptyMessage="No media files uploaded yet."
                                />
                            )}

                            {/* Upload prompt when empty and no upload button visible */}
                            {!mediaLoading && (!mediaFiles || mediaFiles.length === 0) && (
                                <Can action="create" on="jobs">
                                    <div className="mt-4 flex justify-center">
                                        <Button onClick={() => setShowUploadDialog(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Upload First File
                                        </Button>
                                    </div>
                                </Can>
                            )}
                        </CardContent>
                    </Card>
                    <TemplaterTimerHistory
                        jobId={Number(job_id)}
                        templaterId={templater_id!}
                    />
                </div>
            </div>

            <PauseModal
                open={pauseModalOpen}
                onClose={() => setPauseModalOpen(false)}
                jobId={Number(job_id)}
                templaterId={templater_id!}
                onPauseSuccess={handlePauseSuccess}
            />

            <StopModal
                open={stopModalOpen}
                onClose={() => setStopModalOpen(false)}
                jobId={Number(job_id)}
                templaterId={templater_id!}
                onStopSuccess={handleStopSuccess}
            />
            {/* ── Delete confirmation ──────────────────────────────────────────── */}
            <Popup
                isOpen={deleteConfirmationOpen}
                onClose={() => {
                    setDeleteConfirmationOpen(false);
                    setFileToDelete(null);
                }}
                title="Delete File"
                description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
                centered
                className='h-auto '
            >
                <div className="flex justify-end space-x-3 my-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setDeleteConfirmationOpen(false);
                            setFileToDelete(null);
                        }}
                        className="w-[200px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        className="w-[140px]"
                    >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </div>
            </Popup>
        </div>
    );
}
