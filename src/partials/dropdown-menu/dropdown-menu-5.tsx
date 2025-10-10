import { ReactNode } from 'react';
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

export function DropdownMenu5({ trigger, onView }: { trigger: ReactNode, onView?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-[157px]" side="bottom" align="end">
        <DropdownMenuItem onClick={onView} asChild>
          {/* <Link to={`/department/${id}` } className='flex items-center gap-2'> */}
            
            <span>View</span>
          {/* </Link> */}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          
            <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          
            <span className='text-[#FF383C]'>Delete</span>
        </DropdownMenuItem>
       
       
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
