import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const NotificationsSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Notification settings will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export { NotificationsSection };