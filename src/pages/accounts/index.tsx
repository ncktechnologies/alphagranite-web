import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Can } from '@/components/permission';
import { AccountModal, AccountTable } from '@/components/account';

export function AccountsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div>
      <Container>
        <Toolbar>
          <ToolbarHeading title="Accounts" description="Manage all Alpha Granite customer accounts" />
          <ToolbarActions>
            <Can action="create" on="account">
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus />
                New Account
              </Button>
            </Can>
          </ToolbarActions>
        </Toolbar>
        <AccountTable />
      </Container>

      <AccountModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}

export default AccountsPage;
