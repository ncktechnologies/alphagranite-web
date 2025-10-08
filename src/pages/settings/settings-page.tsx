import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RolesSection } from './components/roles-section';
import { UsersSection } from './components/users-section';
import { ProfileSection } from './components/profile-section';
import { NotificationsSection } from './components/notifications-section';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Settings</span>
          <span>/</span>
          <span>Roles & permissions</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesSection />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { SettingsPage };