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
      <Card key={index}>
        <CardContent className="p-0 py-8 flex flex items-start justify-between items-start gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
          <div className={`size-[44px] ${item.bgColor} order-2 flex items-center justify-center mr-5  rounded-[8px]`}>
            <img
              src={toAbsoluteUrl(`/images/icons/${item.logo}`)}
              className={`   `}
              alt="image"
            />
          </div>


          <div className="flex flex-col gap-1  px-5 space-y-2  order-1">
            <span className="text-sm font-semibold text-text">
              {item.title}
            </span>
            <span className="text-3xl font-semibold text-mono">
              {item.info}
            </span>
            <p className="flex items-center gap-1 text-xs font-normal text-[#6B7280]">
              <span>
                {item.desc.startsWith('+') ? (
                  <span className="text-[#10B981]"><TrendingUp/></span>
                ) : item.desc.startsWith('-') ? (
                  <span className="text-[#EF4444]"><TrendingDown/></span>
                ) : (
                  <span className="text-[#6B7280]">■</span>
                )}
              </span>
              <span className="">
              {item.desc} this week
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
