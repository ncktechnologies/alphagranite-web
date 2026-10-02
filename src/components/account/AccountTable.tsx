import { useState } from 'react';
import { useGetAccountsAllQuery, useUpdateAccountStatusMutation } from '@/store/api/job';
import AccountModal from './AccountModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { Button } from '@/components/ui/button';
import { Account } from '@/store/api/job';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export const AccountTable = () => {
  const { data: accounts = [], isLoading } = useGetAccountsAllQuery();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateStatus] = useUpdateAccountStatusMutation();

  const handleAdd = () => {
    setSelected(null);
    setShowModal(true);
  };

  const handleEdit = (acct: Account) => {
    setSelected(acct);
    setShowModal(true);
  };

  const handleDelete = (acct: Account) => {
    setSelected(acct);
    setShowDelete(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Accounts</h3>
        <Button onClick={handleAdd}>Add Account</Button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-4">Loading…</td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4">No accounts</td>
              </tr>
            ) : (
              accounts.map((acct) => {
                const isActive = (acct as any).is_active === true || (acct as any).is_active === 1;
                return (
                  <tr key={acct.id} className="border-t">
                    <td className="px-3 py-2">{acct.name}</td>
                    <td className="px-3 py-2">{acct.contact_person || '—'}</td>
                    <td className="px-3 py-2">{acct.email || '—'}</td>
                    <td className="px-3 py-2">{acct.phone || '—'}</td>
                    <td className="px-3 py-2">
                      <Switch
                        checked={isActive}
                        onCheckedChange={async (v) => {
                          const newIsActive = !!v;
                          setUpdatingId(acct.id);
                          try {
                            await updateStatus({ account_id: acct.id, is_active: newIsActive }).unwrap();
                            toast.success('Account status updated');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to update status');
                          } finally {
                            setUpdatingId(null);
                          }
                        }}
                        aria-label="Toggle account active"
                        disabled={updatingId === acct.id}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(acct)}>Edit</Button>
                        {/* <Button size="sm" variant="destructive" onClick={() => handleDelete(acct)}>Delete</Button> */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AccountModal
          open={showModal}
          onClose={() => setShowModal(false)}
          account={selected}
        />
      )}

      {showDelete && (
        <ConfirmDeleteModal
          open={showDelete}
          onClose={() => setShowDelete(false)}
          accountId={selected?.id}
        />
      )}
    </div>
  );
};

export default AccountTable;
