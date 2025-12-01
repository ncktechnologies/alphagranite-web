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
import { useState } from 'react';
import DialogContent, { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalculatedCutListData } from './CutListTableWithCalculations';

interface ActionsCellProps {
// id:string
row: Row<CalculatedCutListData>,
onView?: () => void
}

function ActionsCell({  row, onView}: ActionsCellProps) {
  const bulletin = row.original;
  const [selectedBulletin, setSelectedBulletin] = useState<CalculatedCutListData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleViewDetails = () => {
    setSelectedBulletin(bulletin);
    // setDetailsOpen(true);
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
          {/* <DropdownMenuLabel>Actions</DropdownMenuLabel> */}
          <DropdownMenuItem onClick={onView}>
           View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
     
    </div>
  );
}

export default ActionsCell;