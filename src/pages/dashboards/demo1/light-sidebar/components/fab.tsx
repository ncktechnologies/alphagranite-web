import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ICommunityBadge {
  title: string;
  subtitle: string;
  status: 'Drafting' | 'SCT' | 'Programming';
  statusColor: string; // Tailwind classes like 'text-purple-600 bg-purple-100'
}

const CommunityBadges = () => {
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
      status: 'Programming',
      statusColor: 'text-blue-600 bg-blue-100',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">Newly Assigned FAB ID</CardTitle>
        <Button
          variant="outline"
          size="sm"
          className="text-primary text-sm font-medium hover:underline"
        >
          See all
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex justify-between items-center p-4 border border-border rounded-lg bg-white"
          >
            <div className="space-y-0.5">
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            </div>
            <Badge className={`text-xs ${item.statusColor}`}>{item.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export { CommunityBadges };
