import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { DefaultPage } from '@/pages/dashboards';
import { EmployeePage } from '@/pages/employers';
import { NotificationsSection, ProfileSection, RolesSection } from '@/pages/settings';

import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<DefaultPage/>} />
          {/* <Route path='/settings' element={<PageMenu/>}/> */}
          <Route path="/settings/roles" element={<RolesSection/>} />
          <Route path="/settings/profile" element={<ProfileSection/>} />
          <Route path="/settings/notifications" element={<NotificationsSection/>} />

          <Route
            path="/employees"
            element={<EmployeePage/>}
          />
          
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
}
