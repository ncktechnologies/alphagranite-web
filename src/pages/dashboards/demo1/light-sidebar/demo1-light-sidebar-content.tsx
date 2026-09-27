import { AlertTriangle, RotateCw } from 'lucide-react';
import { ChannelStats, EarningsChart, Teams } from './components';
import { Contributions } from './components/chart';
import { CommunityBadges } from './components/fab';
import { FinanceStats } from './components/finance';
import { useGetAdminDashboardQuery } from '@/store/api/job';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface IDemo1LightSidebarContentProps {
  timePeriod: string;
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[138px] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6">
        <Skeleton className="h-[380px] w-full rounded-xl xl:col-span-2" />
        <Skeleton className="h-[380px] w-full rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function Demo1LightSidebarContent({ timePeriod }: IDemo1LightSidebarContentProps) {
  const { data: dashboardData, isLoading, isFetching, isError, refetch } = useGetAdminDashboardQuery(
    { time_period: timePeriod || 'all' },
    { skip: false },
  );

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !dashboardData) {
    return (
      <Card className="items-center justify-center gap-3 py-16 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">We couldn't load the dashboard</p>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
        </div>
        <Button variant="outline" size="md" onClick={() => refetch()}>
          <RotateCw />
          Try again
        </Button>
      </Card>
    );
  }

  const performanceData = dashboardData.performance_overview;

  return (
    <div
      className="grid grid-cols-1 gap-5 lg:gap-6 transition-opacity duration-200 data-[fetching=true]:opacity-60"
      data-fetching={isFetching || undefined}
      aria-busy={isFetching}
    >
      {/* Headline KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
        <ChannelStats dashboardData={dashboardData.kpis} />
      </div>

      {/* Trend + status mix */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        <div className="xl:col-span-2 min-w-0">
          <EarningsChart months={performanceData?.months} data={performanceData?.data} />
        </div>
        <Contributions title="Overall statistics" overallStats={dashboardData.overall_statistics} />
      </div>

      {/* Work queues + finance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-stretch">
        <CommunityBadges
          cardTitle="Newly assigned FABs"
          description="Most recent assignments"
          emptyMessage="No new assignments"
          newlyAssignedFabs={dashboardData.newly_assigned_fabs}
        />
        <CommunityBadges
          cardTitle="Paused jobs"
          description="Waiting to be picked back up"
          emptyMessage="Nothing is paused"
          newlyAssignedFabs={dashboardData.paused_jobs}
        />
        <FinanceStats financeData={dashboardData.finance} />
      </div>

      {/* Recent jobs */}
      <Teams recentJobs={dashboardData?.recent_jobs} />
    </div>
  );
}
