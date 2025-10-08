import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { DefaultPage } from '@/pages/dashboards';
import { NotificationsSection, ProfileSection, RolesSection } from '@/pages/settings';
import { SettingsPage } from '@/pages/settings/settings-page';

import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<DefaultPage/>} />
          <Route path="/settings" element={<SettingsPage/>} />
          <Route path="/settings/role" element={<RolesSection/>} />
          <Route path="/settings/profile" element={<ProfileSection/>} />
          <Route path="/settings/notification" element={<NotificationsSection/>} />
          {/* <Route
            path="/user-profile"
            element={<ProfileUserPage/>}
          /> */}
          
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
}
