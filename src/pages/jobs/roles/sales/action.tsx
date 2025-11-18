import { Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import { EllipsisVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState, useContext, createContext } from 'react';
import { IJob } from '../../components/job';
import { useIsSuperAdmin } from '@/hooks/use-permission';

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

interface ActionsCellProps {
  row: Row<IJob>;
  onView?: () => void;
}

function ActionsCell({ row, onView }: ActionsCellProps) {
  const bulletin = row.original;
  const isSuperAdmin = useIsSuperAdmin();
  // const { openCurrentStageView } = useCurrentStage();

  const handleViewDetails = () => {
    if (onView) onView();
  };

  const handleViewCurrentStage = () => {
    openCurrentStageView(bulletin.fab_id, bulletin.job_name || 'Unknown Job');
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
          <DropdownMenuItem onClick={handleViewDetails}>
            View details
          </DropdownMenuItem>
          {/* {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewCurrentStage}>
                <Eye className="mr-2 h-4 w-4" />
                View Current Stage
              </DropdownMenuItem>
            </>
          )} */}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ActionsCell;