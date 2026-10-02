import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Account, AccountCreate, useCreateAccountMutation, useUpdateAccountMutation } from '@/store/api/job';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  account?: Account | null;
}

type AccountForm = Required<AccountCreate>;

const EMPTY_FORM: AccountForm = {
  name: '',
  account_number: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccountModal = ({ open, onClose, account }: AccountModalProps) => {
  const isEdit = Boolean(account);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountForm, string>>>({});

  const [createAccount, { isLoading: creating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: updating }] = useUpdateAccountMutation();
  const isSaving = creating || updating;

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      account
        ? {
            name: account.name || '',
            account_number: account.account_number || '',
            contact_person: account.contact_person || '',
            email: account.email || '',
            phone: account.phone || '',
            address: account.address || '',
            description: account.description || '',
          }
        : EMPTY_FORM,
    );
  }, [account, open]);

  const setField = (field: keyof AccountForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (payload: AccountForm) => {
    const next: typeof errors = {};
    if (!payload.name) next.name = 'Account name is required';
    if (payload.email && !EMAIL_PATTERN.test(payload.email)) next.email = 'Enter a valid email address';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]),
    ) as AccountForm;
    if (!validate(payload)) return;

    try {
      if (isEdit && account) {
        await updateAccount({ id: account.id, data: payload }).unwrap();
        toast.success('Account updated');
      } else {
        await createAccount(payload).unwrap();
        toast.success('Account created');
      }
      onClose();
    } catch (err) {
      console.error(err);
      const data = (err as { data?: { message?: string; detail?: string } })?.data;
      toast.error(data?.message || data?.detail || 'Failed to save account');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'New Account'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Update the details for ${account?.name}.` : 'Add a new customer account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <DialogBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-name">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={(e) => setField('name')(e.target.value)}
                aria-invalid={Boolean(errors.name)}
                autoFocus
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-number">Account Number</Label>
              <Input
                id="account-number"
                value={form.account_number}
                onChange={(e) => setField('account_number')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-contact">Contact Person</Label>
              <Input
                id="account-contact"
                value={form.contact_person}
                onChange={(e) => setField('contact_person')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-phone">Phone</Label>
              <Input
                id="account-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email')(e.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="account-address">Address</Label>
              <Input
                id="account-address"
                value={form.address}
                onChange={(e) => setField('address')(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="account-description">Description</Label>
              <Textarea
                id="account-description"
                rows={3}
                value={form.description}
                onChange={(e) => setField('description')(e.target.value)}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountModal;
