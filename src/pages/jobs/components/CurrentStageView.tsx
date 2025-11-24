import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router';
import { useGetFabByIdQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Settings } from 'lucide-react';
import { JOB_STAGES } from '@/hooks/use-job-stage';

interface CurrentStageViewProps {
  isOpen: boolean;
  onClose: () => void;
  fabId: string;
  jobName: string;
}

export function CurrentStageView({ isOpen, onClose, fabId, jobName }: CurrentStageViewProps) {
  const { data: fabData, isLoading, isError, error } = useGetFabByIdQuery(Number(fabId));
  const navigate = useNavigate();
  
  const handleNavigateToStage = () => {
    if (!fabData?.current_stage) return;
    
    // Map current stage to route
    const stageEntry = Object.values(JOB_STAGES).find(
      (stage) => stage.stage === fabData.current_stage
    );
    
    if (stageEntry) {
      navigate(stageEntry.route);
      onClose();
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <Skeleton className="h-6 w-64" />
            </DialogTitle>
            <Skeleton className="h-4 w-48" />
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Stage for FAB ID: {fabId}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">Job: {jobName}</p>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error ? `Failed to load FAB data: ${JSON.stringify(error?.message)}` : "Failed to load FAB data"}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const currentStage = fabData?.current_stage || 'sales';
  const stageEntry = Object.values(JOB_STAGES).find(
    (stage) => stage.stage === currentStage
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Current Stage for FAB ID: {fabId}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Job: {jobName}</p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Current Stage:</span>
            <span className="font-semibold">
              {stageEntry?.title || currentStage}
            </span>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleNavigateToStage}
            disabled={!stageEntry}
          >
            View Current Stage
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}