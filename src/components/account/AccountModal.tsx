import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Account, AccountCreate, AccountUpdate, useCreateAccountMutation, useUpdateAccountMutation } from '@/store/api/job';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

export const AccountModal = ({ open, onClose, account }: AccountModalProps) => {
  const isEdit = Boolean(account);
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateAccountMutation();

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setAccountNumber(account.account_number || '');
      setEmail(account.email || '');
      setPhone(account.phone || '');
      setContactPerson(account.contact_person || '');
      setAddress(account.address || '');
      setDescription(account.description || '');
    } else {
      setName('');
      setAccountNumber('');
      setEmail('');
      setPhone('');
      setContactPerson('');
      setAddress('');
      setDescription('');
    }
  }, [account, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (isEdit && account) {
        const payload: AccountUpdate = {
          name,
          account_number: accountNumber,
          email,
          phone,
          contact_person: contactPerson,
          address,
          description,
        };
        await updateAccount({ id: account.id, data: payload }).unwrap();
        toast.success('Account updated');
      } else {
        const payload: AccountCreate = {
          name,
          account_number: accountNumber,
          email,
          phone,
          contact_person: contactPerson,
          address,
          description,
        };
        await createAccount(payload).unwrap();
        toast.success('Account created');
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save account');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div>
            <label className="text-sm">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Account Number</label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Contact Person</label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={creating || updating}>
            {creating || updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountModal;
