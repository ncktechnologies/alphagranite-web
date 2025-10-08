import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface IChannelStatsItem {
  logo: string;
  logoDark?: string;
  info: string;
  desc: string;
  path: string;
  title: string;
  bgColor?: string;
}
type IChannelStatsItems = Array<IChannelStatsItem>;

const ChannelStats = () => {
  const items: IChannelStatsItems = [
    { logo: 'h119.svg', info: '240', title: 'Total Jobs', path: '', desc: '+1', bgColor: 'bg-[#9CC15E]' },
    { logo: 'h131.svg', info: '24%', title: 'Pending Installations', path: '', desc: '+4', bgColor: 'bg-[#EA3DB1]' },
    {
      logo: 'h143.svg',
      info: '24%',
      title: 'Average Revisions',
      path: '',
      desc: '+4',
      bgColor: 'bg-[#51BCF4]'
    },
    {
      logo: 'h156.svg',
      logoDark: 'h156.svg',
      info: '96%',
      title: 'Completion Rate',
      path: '',
      desc: '-1',
      bgColor: 'bg-[#0BC33F]'
    },
  ];

  const renderItem = (item: IChannelStatsItem, index: number) => {
    return (
      <Card key={index} className='shadow-[#00000008] shadow-sm rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out'>
        <CardContent className="p-0 py-6 flex  justify-between items-start gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
          <div className={`${item.bgColor} size-[44px] order-2 flex items-center justify-center mr-5  rounded-[8px]`}>
            <img
              src={toAbsoluteUrl(`/images/icons/${item.logo}`)}
              className={`   `}
              alt="image w-6 h-full max-h-5"
            />
          </div>


          <div className="flex flex-col gap-1  px-5 space-y-2  order-1">
            <span className="text-sm font-semibold text-text-foreground">
              {item.title}
            </span>
            <span className="text-3xl font-semibold text-black">
              {item.info}
            </span>
            <p className="flex items-center text-xs font-normal text-[#6B7280]">
              <span>
                {item.desc.startsWith('+') ? (
                  <span className="text-[#10B981]"><TrendingUp className='w-4 h-3'/></span>
                ) : item.desc.startsWith('-') ? (
                  <span className="text-[#EF4444]"><TrendingDown className='w-4 h-3'/></span>
                ) : (
                  <span className="text-[#6B7280]">■</span>
                )}
              </span>
              <span className="">
                <span className={`${item.desc.startsWith('-') ? 'text-[#FF5F57]' : ''}`}>{item.desc}</span>
               this week
            </span>
            </p>
            
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Fragment>
      <style>
        {`
          .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3.png')}');
          }
          .dark .channel-stats-bg {
            background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3-dark.png')}');
          }
        `}
      </style>

      {items.map((item, index) => {
        return renderItem(item, index);
      })}
    </Fragment>
  );
};

export { ChannelStats, type IChannelStatsItem, type IChannelStatsItems };
