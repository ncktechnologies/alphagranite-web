import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ICommunityBadge {
  title: string;
  subtitle: string;
  status: 'Drafting' | 'SCT' | 'Programming';
  statusColor: string; // Tailwind classes like 'text-purple-600 bg-purple-100'
}

interface IFABProps {
  cardTitle: string;
}

const CommunityBadges = ({ cardTitle }: IFABProps) => {
  const items: ICommunityBadge[] = [
    {
      title: 'Preston kitchen floor',
      subtitle: 'FAB ID: 34567',
      status: 'Drafting',
      statusColor: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Preston kitchen floor',
      subtitle: 'FAB ID: 34567',
      status: 'SCT',
      statusColor: 'text-red-600 bg-red-100',
    },
    {
      title: 'Preston kitchen floor',
      subtitle: 'FAB ID: 34567',
      status: 'Drafting',
      statusColor: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Preston kitchen floor',
      subtitle: 'FAB ID: 34567',
      status: 'Programming',
      statusColor: 'bg-[#E2E4ED] text-[#4B5675]',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between ">
        <CardTitle className="">{cardTitle}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="text-primary text-sm font-medium hover:underline"
        >
          See all
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center py-3 px-4 border-0 rounded-lg bg-gradient-to-b from-[#EEEEEE] to-[#FCFCFC]"
          >
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-gray-900">{item.title}</h3>
              <p className="text-xs text-gray-600">{item.subtitle}</p>
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
