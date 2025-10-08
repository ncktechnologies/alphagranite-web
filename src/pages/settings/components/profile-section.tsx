import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileSection = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Profile settings will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export { ProfileSection };