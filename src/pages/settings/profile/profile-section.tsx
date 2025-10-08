import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
        </CardContent>
      </Card>
    </div>
  );
};

export { ProfileSection };