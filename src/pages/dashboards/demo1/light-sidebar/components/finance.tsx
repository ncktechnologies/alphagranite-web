import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinanceStats as FinanceStatsData } from '@/store/api/job';

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

interface IFinanceStatsProps {
    financeData?: FinanceStatsData;
}

const FinanceStats = ({ financeData }: IFinanceStatsProps) => {
    // Only use backend data - no fallback values
    if (!financeData) {
        return (
            <Card className='h-full'>
                <CardHeader className="pt-3.5">
                    <CardTitle className="text-[20px] leading-[24px]">Finance</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-10">
                    <p className="text-gray-500">No finance data available</p>
                </CardContent>
            </Card>
        );
    }

    const items: IChannelStatsItems = [
        { 
            logo: 'dollar-exchange.svg', 
            info: `$${financeData.revenue_installed.toLocaleString()}`, 
            title: 'Revenue Installed', 
            path: '', 
            desc: '+1', 
            bgColor: 'bg-[#9CC15E]' 
        },
        { 
            logo: 'dollar-exchange.svg', 
            info: `$${financeData.revenue_templated.toLocaleString()}`, 
            title: 'Revenue Templated', 
            path: '', 
            desc: '+4', 
            bgColor: 'bg-[#EA3DB1]' 
        },
        {
            logo: 'dollar-coin.svg',
            info: `$${financeData.gross_profit.toLocaleString()}`,
            title: 'Gross profit',
            path: '',
            desc: '+4',
            bgColor: 'bg-[#51BCF4]'
        },
    ];

    const renderItem = (item: IChannelStatsItem, index: number) => {
        return (
            <div key={index} className='border-b pb-3 mr-10'>
                <div className="p-0 py-3 flex  justify-between items-start gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
                    <div className={` size-[64px] order-2 flex items-center justify-center mr-5 `}>
                        <img
                            src={toAbsoluteUrl(`/images/app/${item.logo}`)}
                            className={`   `}
                            alt="image w-6 h-full max-h-5"
                        />
                    </div>


                    <div className="flex flex-col gap-1  px-5 space-y-1  order-1">
                        <span className="text-[14px] leading-[14px] font-semibold text-text-foreground">
                            {item.title}
                        </span>
                        <div className="flex gap-2 items-end">
                            <span className="text-[32px] leading-[32px] pt-3 font-semibold text-black">
                                {item.info}
                            </span>
                            <p className="flex items-center text-[12px] leading-[16px] font-normal text-[#6B7280]">
                                <span>
                                    {item.desc.startsWith('+') ? (
                                        <span className="text-[#10B981]"><TrendingUp className='w-4 h-3' /></span>
                                    ) : item.desc.startsWith('-') ? (
                                        <span className="text-[#EF4444]"><TrendingDown className='w-4 h-3' /></span>
                                    ) : (
                                        <span className="text-[#6B7280]">■</span>
                                    )}
                                </span>
                                {/* <span className=""> */}
                                    <span className={`${item.desc.startsWith('-') ? 'text-[#FF5F57]' : ''}`}>{item.desc}</span>
                                    {/* this week */}
                                {/* </span> */}
                            </p>
                        </div>


                    </div>
                </div>
            </div>
        );
    };

    return (
        <Fragment>
            <Card className='h-full'>
                <CardHeader className="pt-3.5 ">
                    <CardTitle className="text-[20px] leading-[24px]">Finance</CardTitle>
                    <Select defaultValue="1">
                        <SelectTrigger className="w-28 h-8 text-sm">
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="w-28">
                            <SelectItem value="1">All time</SelectItem>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="6">6 months</SelectItem>
                            <SelectItem value="12">12 months</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                {items.map((item, index) => {
                    return renderItem(item, index);
                })}
            </Card>
        </Fragment >
    );
};

export { FinanceStats, type IChannelStatsItem, type IChannelStatsItems };
