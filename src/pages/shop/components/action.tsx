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
import { useState } from 'react';
import DialogContent, { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShopData } from './table';

interface ActionsCellProps {
// id:string
row: Row<ShopData>,
onView?: () => void,
onAddNote?: (fabId: string) => void
}

function ActionsCell({  row,onView,onAddNote}: ActionsCellProps) {
  const bulletin = row.original;
  const [selectedBulletin, setSelectedBulletin] = useState<ShopData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(); }}>
           View
          </DropdownMenuItem>
          {onAddNote && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddNote(row.original.id?.toString()); }}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Note
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
     
    </div>
  );
}

export default ActionsCell;