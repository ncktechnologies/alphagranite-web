import { Row } from '@tanstack/react-table';
import { toast } from 'sonner';
import { EllipsisVertical, Eye, MessageSquare, CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { ShopData } from './shop';

interface ActionsCellProps {
  row: Row<ShopData>;
  onView?: () => void;
  /** Navigate to the calendar page locked to this fab's ID */
  onViewCalendar?: (fabId: string) => void;
  /** Open the Create Plan page pre-filled with this fab's ID */
  onCreatePlan?: (fabId: string) => void;
  onAddNote?: (fabId: string) => void;
  /** Auto-schedule the fab based on its current cut stages and shop availability */
  onAutoSchedule?: (fabId: string) => void;
}

function ActionsCell({ row, onView, onViewCalendar, onCreatePlan, onAddNote, onAutoSchedule }: ActionsCellProps) {
  const fabId = String(row.original.id ?? row.original.fab_id ?? '');

  return (
    <div className="flex space-x-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onView && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
          )}

          {onViewCalendar && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onViewCalendar(fabId); }}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              View in Calendar
            </DropdownMenuItem>
          )}

          {onCreatePlan && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onCreatePlan(fabId); }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </DropdownMenuItem>
          )}
          {onAutoSchedule && (
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onAutoSchedule(fabId); }}
            >
                <Plus className="mr-2 h-4 w-4" />
                Auto Schedule
              </DropdownMenuItem>
          )}

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