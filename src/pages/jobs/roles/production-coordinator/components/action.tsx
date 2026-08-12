import { Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import { EllipsisVertical, Eye, MessageSquare, CalendarDays, Plus, Sparkles, Undo2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router';
import { useCompleteFinalProgrammingMutation } from '@/store/api/job';

interface ActionsCellProps {
  row: Row<any>;
  onView?: () => void;
  onViewCalendar?: (fabId: string) => void;
  onCreatePlan?: (fabId: string) => void;
  onAddNote?: (fabId: string) => void;
  onAutoSchedule?: (fabId: string) => void;
}

function ActionsCell({ row, onViewCalendar, onCreatePlan, onAddNote, onAutoSchedule }: ActionsCellProps) {
  const fabId = String(row.original.id ?? row.original.fab_id ?? '');
  const navigate = useNavigate();
  const [completeFinalProgramming] = useCompleteFinalProgrammingMutation();
  const rowData = row.original as any;

  // Determine current stage (normalise to lowercase for comparison)
  const currentStage = rowData?.current_stage?.toLowerCase() || '';

  // Check if already completed
  const isFinalProgrammingCompleted = Boolean(
    rowData?.final_programming_complete ||
    rowData?.final_programming_completed_date ||
    rowData?.fp_completed === 'Yes'
  );

  // Allowed stages for marking as complete
  const allowedStagesForComplete = ['cutlist', 'final_programming'];

 
  // Handler: Unmark (set back to incomplete)
  const handleUnmarkComplete = async () => {
    if (!fabId) return;

    // Stricter rule: only allow unmark if current stage is 'cutlist'
    if (currentStage !== 'cutlist') {
      toast.error('Only jobs in Cutlist stage can be unmarked as complete.');
      return;
    }

    try {
      await completeFinalProgramming({
        fab_id: Number(fabId),
        data: { final_programming_complete: false },
      }).unwrap();
      toast.success('Final programming marked as not complete');
    } catch (error) {
      console.error('Failed to unmark final programming complete:', error);
      toast.error('Failed to unmark final programming complete');
    }
  };

  return (
    <div className="flex space-x-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* View Details */}
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/job/cut-list/${fabId}`);
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          {/* View Calendar */}
          {onViewCalendar && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onViewCalendar(fabId); }}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              View in Calendar
            </DropdownMenuItem>
          )}

          {/* Create Plan */}
          {onCreatePlan && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreatePlan(fabId); }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </DropdownMenuItem>
          )}

          {/* Auto Schedule */}
          {onAutoSchedule && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onAutoSchedule(fabId); }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Auto Schedule
            </DropdownMenuItem>
          )}

          {isFinalProgrammingCompleted && currentStage === 'cutlist' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnmarkComplete();
                }}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Unmark Final Programming Complete
              </DropdownMenuItem>
            </>
          )}

          {/* Add Note (always visible) */}
          {onAddNote && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote(fabId); }}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Note
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ActionsCell;