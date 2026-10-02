import { AccountTable } from '@/components/account';

export function AccountsPage() {
  return (
    <div>
      <div className="border-b border-[#e5e7eb] pb-[24px]">
        <h1 className="font-proxima font-semibold text-[29px] leading-[32px] text-black px-[32px]">Accounts</h1>
      </div>
      <div className="p-6">
        <AccountTable />
      </div>
    </div>
  );
}

export default AccountsPage;
