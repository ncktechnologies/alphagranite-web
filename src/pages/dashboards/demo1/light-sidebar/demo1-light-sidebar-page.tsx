import { Fragment, ReactNode, useState } from 'react';
import { Toolbar, ToolbarActions } from '@/layouts/demo1/components/toolbar';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { cn } from '@/lib/utils';
import { Demo1LightSidebarContent } from './';
import { RoleBasedDashboard } from './RoleBasedDashboard';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import { Link } from 'react-router';
import { Can } from '@/components/permission';
import { useSelector } from 'react-redux';
import { OperatorDashboard } from '@/pages/operator';
import { InstallerScheduleCards } from '@/pages/installer/InstallerDashboard';

// Only period values the dashboard endpoint already receives today.
const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: '12', label: '12 months' },
  { value: '6', label: '6 months' },
  { value: '3', label: '3 months' },
];

function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function DashboardHeading({ firstName, subtitle }: { firstName?: string; subtitle: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        {format(new Date(), 'EEEE, MMMM d')}
      </span>
      <h1 className="text-2xl lg:text-[29px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
        {greeting()}
        {firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function PeriodSwitcher({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Reporting period"
      className="inline-flex items-center gap-0.5 rounded-xl border border-border/80 bg-background p-1 shadow-card"
    >
      {PERIODS.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.value)}
            className={cn(
              'h-8 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-primary-soft text-primary-accent shadow-[inset_0_0_0_1px_rgb(156_193_94/0.45)]'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export function Demo1LightSidebarPage() {
  const [timePeriod, setTimePeriod] = useState('all');
  const isSuperAdmin = useIsSuperAdmin();

  const currentUser = useSelector((s: any) => s.user.user);
  const firstName: string | undefined =
    currentUser?.first_name || currentUser?.fullname?.split(' ')[0] || undefined;
  const userRoles = currentUser?.roles || [];
  const isOperator = userRoles.some((r: any) => r.name?.toLowerCase() === 'operator');
  const isInstaller = userRoles.some((r: any) => r.name === 'Installer');

  if (isOperator) {
    return <OperatorDashboard />;
  }

  // Installer view – self‑contained cards (no props needed)
  if (isInstaller) {
    return (
      <Fragment>
        <Container>
          <Toolbar>
            <DashboardHeading firstName={firstName} subtitle="Your upcoming installations" />
          </Toolbar>
        </Container>
        <Container>
          <InstallerScheduleCards />
        </Container>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <DashboardHeading
            firstName={firstName}
            subtitle={
              isSuperAdmin
                ? "Here's how production is tracking across the business."
                : "Here's where your work stands today."
            }
          />
          <ToolbarActions>
            {isSuperAdmin && <PeriodSwitcher value={timePeriod} onChange={setTimePeriod} />}
            <Can action="create" on="FAB IDs">
              <Button size="lg" asChild>
                <Link to="/sales/new-fab-id">
                  <Plus />
                  New FAB ID
                </Link>
              </Button>
            </Can>
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        {/* Super admins see the full admin dashboard, regular users see role‑based dashboard */}
        {isSuperAdmin ? <Demo1LightSidebarContent timePeriod={timePeriod} /> : <RoleBasedDashboard />}
      </Container>
    </Fragment>
  );
}
