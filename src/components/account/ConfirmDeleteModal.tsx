import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useDeleteAccountMutation } from '@/store/api/job';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  accountId?: number | null;
  accountName?: string;
}

export const ConfirmDeleteModal = ({ open, onClose, accountId, accountName }: ConfirmDeleteModalProps) => {
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {accountName ? <strong>{accountName}</strong> : 'this account'}? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteModal;
