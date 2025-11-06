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

export function Demo1LightSidebarContent() {
  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-4 gap-5 lg:gap-7.5 h-full items-stretch">
            <ChannelStats />
          </div>
        </div>
        {/* <div className="lg:col-span-2">
          <EntryCallout className="h-full" />
        </div> */}
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1">
          <CommunityBadges cardTitle='Newly assigned FAB ID' />
        </div>
        <div className="lg:col-span-1">
          <Contributions title='Overall Statistics' />

        </div>
        <div className='lg:col-span-1'>
          {/* <Card className="p-2 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[20px] leading-[24px]">Finance</CardTitle>

            </CardHeader>
            <CardContent className="flex justify-center items-center relative py-2 ">
              <div className='h-60'></div>


            </CardContent>
          </Card> */}
          <FinanceStats/>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <EarningsChart />
        </div>
        <div className="lg:col-span-1">
          <CommunityBadges cardTitle='Paused jobs' />

        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        {/* <div className="lg:col-span-1">
          <TeamMeeting />
        </div> */}
        <div className="lg:col-span-3">
          <Teams />
        </div>
      </div>
    </div>
  );
}
