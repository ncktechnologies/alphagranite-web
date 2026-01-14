import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fabId: string;
  stage?: string;
  onSubmit: (note: string, fabId: string, stage?: string) => Promise<void>;
}

export const NotesModal = ({ isOpen, onClose, fabId, stage, onSubmit }: NotesModalProps) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) {
      toast.error('Please enter a note');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(note, fabId, stage);
      setNote('');
      onClose();
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="note" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Note
            </label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              className="min-h-[100px]"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>FAB ID: {fabId}</p>
            {stage && <p>Stage: {stage}</p>}
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting || !note.trim()}
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};