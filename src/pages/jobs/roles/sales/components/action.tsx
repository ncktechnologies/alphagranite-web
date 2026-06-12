import { Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import { EllipsisVertical, Eye, MessageSquare, Clock, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useContext, createContext, lazy, Suspense } from 'react';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { useCreateFabNoteMutation, useUnMarkInstallCompletedMutation } from '@/store/api/job';
import { IJob } from '@/pages/jobs/components/job';
import { useNavigate } from 'react-router-dom';

// Create a context to manage the current stage view state at a higher level
interface CurrentStageContextType {
  currentStage: string | null;
  openCurrentStageView: (fabId: string, jobName: string) => void;
}

const CurrentStageContext = createContext<CurrentStageContextType | null>(null);

// Export context provider component to be used at a higher level
export const CurrentStageProvider = CurrentStageContext.Provider;

// Hook to access the current stage context
export const useCurrentStage = () => {
  const context = useContext(CurrentStageContext);
  return context; // might be null
};

const LazyNotesModal = lazy(() => import('@/components/common/NotesModal').then(module => ({ default: module.NotesModal })));
const LazyMoveStageModal = lazy(() => import('./MoveStageModal').then(module => ({ default: module.MoveStageModal })));

interface ActionsCellProps {
  row: Row<IJob>;
  onView?: () => void;
  pageRole?: 'templater' | 'installer';
  canAddNote?: boolean; // 👈 new prop
}

function ActionsCell({ row, onView, pageRole, canAddNote = false }: ActionsCellProps) {
  const bulletin = row.original;
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isMoveStageModalOpen, setIsMoveStageModalOpen] = useState(false);
  const [createFabNote, { isLoading: isSubmittingNote }] = useCreateFabNoteMutation();
  const [unMarkInstallCompleted, { isLoading: isUnmarking }] = useUnMarkInstallCompletedMutation();


  const handleViewDetails = () => {
    if (onView) onView();
  };

  const handleAddNote = () => {
    setIsNotesModalOpen(true);
  };

  const handleGoToClock = () => {
    if (bulletin.job_id) {
      navigate(`/jobs/${bulletin.job_id}/installer/timer`);
    }
  };

  const handleUnmarkInstallCompletion = async () => {
    try {
      await unMarkInstallCompleted({ fab_id: bulletin.id }).unwrap();
      toast.success('Install completion unmarked successfully');
      // Optionally refresh the page or refetch data
    } catch (error) {
      console.error('Error unmarking install completion:', error);
      toast.error('Failed to unmark install completion');
    }
  };

  const context = useCurrentStage();
  const currentStage = context?.currentStage ?? undefined;

  const handleNoteSubmit = async (note: string, fabId: string, stage?: string) => {
    try {
      await createFabNote({
        fab_id: parseInt(fabId),
        note,
        stage: currentStage
      }).unwrap();
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };

  return (
    <>
      <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails}>
              View details
            </DropdownMenuItem>
            {/* 👇 Only show Add Note if user has permission */}
            {canAddNote && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                handleAddNote();
              }}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
            )}

            {/* Super admin items remain unchanged */}
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsMoveStageModalOpen(true);
                }}>
                  <Eye className="mr-2 h-4 w-4" />
                  Move Stage
                </DropdownMenuItem>
                {bulletin.install_details?.is_completed && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnmarkInstallCompletion();
                    }}
                    disabled={isUnmarking}
                  >
                    <Undo className="mr-2 h-4 w-4" />
                    Unmark Install Completion
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isNotesModalOpen && (
        <Suspense fallback={null}>
          <LazyNotesModal
            isOpen={isNotesModalOpen}
            onClose={() => setIsNotesModalOpen(false)}
            fabId={bulletin.fab_id}
            onSubmit={handleNoteSubmit}
          />
        </Suspense>
      )}

      {isMoveStageModalOpen && (
        <Suspense fallback={null}>
          <LazyMoveStageModal
            open={isMoveStageModalOpen}
            onClose={() => setIsMoveStageModalOpen(false)}
            fabId={bulletin.id}
          />
        </Suspense>
      )}
    </>
  );
}

export default ActionsCell;