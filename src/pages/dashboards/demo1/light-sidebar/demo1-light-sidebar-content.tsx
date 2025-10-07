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
          <CommunityBadges />
        </div>
         <div className="lg:col-span-1">
          <Contributions title='Overall Contributions' />
          
        </div>
        <div className='lg:col-span-1'>
           <Card className="p-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="">Finances</CardTitle>
       
      </CardHeader>
      <CardContent className="flex justify-center items-center relative py-2 ">
       <div className='h-60'></div>

      
      </CardContent>
    </Card>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-2">
          <EarningsChart />
        </div>
         <div className="lg:col-span-1">
          <CommunityBadges />
          
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
