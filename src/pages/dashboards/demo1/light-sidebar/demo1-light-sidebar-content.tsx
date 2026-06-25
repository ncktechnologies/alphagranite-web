import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChannelStats,
  EarningsChart,
  EntryCallout,
  Highlights,
  TeamMeeting,
  Teams,
} from './components';
import { Contributions } from './components/chart';
import { CommunityBadges } from './components/fab';
import { FinanceStats } from './components/finance';
import { useGetAdminDashboardQuery } from '@/store/api/job';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface IDemo1LightSidebarContentProps {
  timePeriod: string;
}

export function Demo1LightSidebarContent({ timePeriod: initialTimePeriod }: IDemo1LightSidebarContentProps) {
  const [timePeriod, setTimePeriod] = useState(initialTimePeriod || 'all');
  const { data: dashboardData, isLoading, isError, refetch } = useGetAdminDashboardQuery(
    { time_period: timePeriod },
    { skip: false }
  );

  const handlePeriodChange = (newPeriod: string) => {
    setTimePeriod(newPeriod);
    // The query will automatically refetch when timePeriod changes
  };
  const performanceData = dashboardData?.performance_overview;
  
  if (isLoading) {
    return (
      <div className="grid gap-5 lg:gap-7.5">
        <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-4 gap-5 lg:gap-7.5 h-full items-stretch">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-4 gap-5 lg:gap-7.5 h-full items-stretch">
            <ChannelStats dashboardData={dashboardData.kpis} />
          </div>
        </div>
        {/* <div className="lg:col-span-2">
          <EntryCallout className="h-full" />
        </div> */}
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <CommunityBadges
            cardTitle='Newly assigned FAB ID'
            newlyAssignedFabs={dashboardData.newly_assigned_fabs}
          />
        </div>
        <div className="lg:col-span-1">
          <Contributions
            title='Overall Statistics'
            overallStats={dashboardData.overall_statistics}
          />
        </div>
        <div className='lg:col-span-1'>
          <FinanceStats financeData={dashboardData.finance} />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <EarningsChart
            months={performanceData?.months}
            data={performanceData?.data}
            title="Performance Overview"
            timePeriod={timePeriod}
            onTimePeriodChange={handlePeriodChange}
          />
        </div>
        <div className="lg:col-span-1">
          <CommunityBadges
            cardTitle='Paused jobs'
            newlyAssignedFabs={dashboardData.paused_jobs}
          />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        {/* <div className="lg:col-span-1">
          <TeamMeeting />
        </div> */}
        <div className="lg:col-span-3">
          <Teams recentJobs={dashboardData?.recent_jobs} />
        </div>
      </div>
    </div>
  );
}
