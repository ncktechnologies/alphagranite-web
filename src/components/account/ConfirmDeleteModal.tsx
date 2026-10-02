import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useDeleteAccountMutation } from '@/store/api/job';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  accountId?: number | null;
}

export const ConfirmDeleteModal = ({ open, onClose, accountId }: ConfirmDeleteModalProps) => {
  const [deleteAccount, { isLoading }] = useDeleteAccountMutation();

  const handleDelete = async () => {
    if (!accountId) return;
    try {
      await deleteAccount(accountId).unwrap();
      toast.success('Account deleted');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete account');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
        </DialogHeader>

        <div className="py-2">Are you sure you want to delete this account? This action cannot be undone.</div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteModal;
