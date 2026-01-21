import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewlyAssignedFab } from '@/store/api/job';

interface ICommunityBadge {
  title: string;
  subtitle: string;
  status: 'Drafting' | 'SCT' | 'Programming' | string;
  statusColor: string; // Tailwind classes like 'text-purple-600 bg-purple-100'
}

interface IFABProps {
  cardTitle: string;
  newlyAssignedFabs?: NewlyAssignedFab[];
  pausedJobs?: any[];
}

const CommunityBadges = ({ cardTitle, newlyAssignedFabs, pausedJobs }: IFABProps) => {
  // Function to get status color based on stage
  const getStatusColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'drafting': 'text-purple-600 bg-purple-100',
      'slab_smith_request': 'text-orange-600 bg-orange-100',
      'cut_list': 'text-blue-600 bg-blue-100',
      'templating': 'text-green-600 bg-green-100',
      'cost_of_stones': 'text-yellow-600 bg-yellow-100',
      'default': 'bg-[#E2E4ED] text-[#4B5675]'
    };
    
    return stageColors[stage] || stageColors.default;
  };

  // Transform dashboard data to badge items
  const items: ICommunityBadge[] = newlyAssignedFabs ? 
    newlyAssignedFabs.slice(0, 4).map(fab => ({
      title: fab.job_name,
      subtitle: `FAB ID: ${fab.fab_id}`,
      status: fab.stage.replace('_', ' ').replace(/w/g, l => l.toUpperCase()),
      statusColor: getStatusColor(fab.stage)
    })) : [];

  return (
    <Card className='h-full'>
      <CardHeader className="flex flex-row items-center justify-between ">
        <CardTitle className="text-[20px] leading-[24px]">{cardTitle}</CardTitle>
        {/* <Button
          variant="inverse"
          size="lg"
          className="text-primary font-semibold text-[16px] font-[24px] underline"
        >
          See all
        </Button> */}
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center py-3 px-4 border-0 rounded-lg bg-gradient-to-b from-[#EEEEEE] to-[#FCFCFC]"
          >
            <div className="space-y-1">
              <h3 className="font-medium text-base text-[#111827]">{item.title}</h3>
              <p className="text-xs text-text-foreground">{item.subtitle}</p>
            </div>
            <Badge 
              variant="secondary" 
              className={`text-xs px-2 py-1 rounded-full font-medium ${item.statusColor}`}
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export { CommunityBadges, type IFABProps };
