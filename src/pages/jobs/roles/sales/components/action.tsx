import { Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import { EllipsisVertical, Eye, MessageSquare } from 'lucide-react';
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
import { IJob } from '../../components/job';
import { useIsSuperAdmin } from '@/hooks/use-permission';
// import { NotesModal } from '@/components/common/NotesModal';
import { useCreateFabNoteMutation } from '@/store/api/job';

// Create a context to manage the current stage view state at a higher level
interface CurrentStageContextType {
  openCurrentStageView: (fabId: string, jobName: string) => void;
}

const CurrentStageContext = createContext<CurrentStageContextType | null>(null);

// Export context provider component to be used at a higher level
export const CurrentStageProvider = CurrentStageContext.Provider;

// Hook to access the current stage context
// export const useCurrentStage = () => {
//   const context = useContext(CurrentStageContext);
//   if (!context) {
//     throw new Error('useCurrentStage must be used within a CurrentStageProvider');
//   }
//   return context;
// };

// import { MoveStageModal } from './components/MoveStageModal';

const LazyNotesModal = lazy(() => import('@/components/common/NotesModal').then(module => ({ default: module.NotesModal })));
const LazyMoveStageModal = lazy(() => import('./MoveStageModal').then(module => ({ default: module.MoveStageModal })));

// ... (keep existing imports)

interface ActionsCellProps {
  row: Row<IJob>;
  onView?: () => void;
}

function ActionsCell({ row, onView }: ActionsCellProps) {
  const bulletin = row.original;
  const isSuperAdmin = useIsSuperAdmin();

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isMoveStageModalOpen, setIsMoveStageModalOpen] = useState(false);
  const [createFabNote, { isLoading: isSubmittingNote }] = useCreateFabNoteMutation();

  const handleViewDetails = () => {
    if (onView) onView();
  };

  const handleAddNote = () => {
    setIsNotesModalOpen(true);
  };

  const handleNoteSubmit = async (note: string, fabId: string, stage?: string) => {
    try {
      await createFabNote({
        fab_id: parseInt(fabId),
        note,
        stage
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
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleAddNote();
            }}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Note
            </DropdownMenuItem>

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