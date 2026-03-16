import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import CreatePlanPage from './createPlanePage';

interface CreatePlanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date | null;
  selectedTimeSlot?: string | null;
  selectedEvent?: any | null;
  prefillFabId?: string;
  prefillPlanSectionId?: number; 
  onEventCreated?: () => void;
}

const CreatePlanSheet: React.FC<CreatePlanSheetProps> = ({
  open,
  onOpenChange,
  selectedDate,
  selectedTimeSlot,
  selectedEvent,
  prefillFabId,
  prefillPlanSectionId,  
  onEventCreated,
}) => {
  const handleBack = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-y-auto">
        <CreatePlanPage
          onBack={handleBack}
          selectedDate={selectedDate}
          selectedTimeSlot={selectedTimeSlot}
          selectedEvent={selectedEvent}
          prefillFabId={prefillFabId}
          prefillPlanSectionId={prefillPlanSectionId}  
          onEventCreated={onEventCreated}
        />
      </SheetContent>
    </Sheet>
  );
};

export default CreatePlanSheet;