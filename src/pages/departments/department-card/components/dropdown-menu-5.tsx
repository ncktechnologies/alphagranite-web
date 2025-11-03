import { ReactNode, useState } from 'react';
import { FileDown, FilePlus, FileUp, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DepartmentFormSheet from './departmentSheet';
import { DeleteDepartmentModal } from './delete-department-modal';
import type { Department } from '@/store/api/department';
import { Button } from '@/components/ui/button';


export function DropdownMenu5({ trigger, onView, department }: { trigger: ReactNode, onView?: () => void, department?: Department }) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-[157px]" side="bottom" align="end">
          <DropdownMenuItem onClick={onView}>
            <span>View</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
            <span>Edit</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            // onClick={() => setDeleteModalOpen(true)} 
            variant='destructive'
          >
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Sheet */}
      <DepartmentFormSheet
        trigger={<div className="hidden" />} 
        department={department}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSubmitSuccess={() => {
          setEditSheetOpen(false);
        }}
      />

      {/* Delete Modal */}
      <DeleteDepartmentModal 
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        department={department || null}
      />
    </>
  );
}
