import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import ProtectedRoute from '@/lib/protectedRoutes';
import { DefaultPage } from '@/pages/dashboards';
import { DepartmentPage } from '@/pages/departments';
import { DepartmentDetailsPage } from '@/pages/departments/department-table/TablePage';
import { EmployeePage } from '@/pages/employers';
import { JobPage } from '@/pages/job-flow/job-page';
import { NewFabIdForm } from '@/pages/jobs';
import { DrafterPage } from '@/pages/jobs/roles/drafters';
import { SalesPage } from '@/pages/jobs/roles/sales/SalesPage';
import { FabIdDetailsPage } from '@/pages/jobs/roles/templating-coordinator/details';
import { TemplatingPage } from '@/pages/jobs/roles/templating-coordinator/templatingPage';
import { NotificationsSection, ProfileSection, RolesSection } from '@/pages/settings';

import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          <Route path="/" element={<DefaultPage />} />
          {/* <Route path='/settings' element={<PageMenu/>}/> */}
          <Route path="/settings/roles" element={<RolesSection />} />
          <Route path="/settings/profile" element={<ProfileSection />} />
          <Route path="/settings/notifications" element={<NotificationsSection />} />

          <Route
            path="/employees"
            element={<EmployeePage />}
          />
          <Route
            path='/departments'
            element={<DepartmentPage />}
          />
          <Route
            path='/departments/:id'
            element={<DepartmentDetailsPage />}
          />
          <Route
            path="/job/sales"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <SalesPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/templating"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <TemplatingPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/job/templating/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <FabIdDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/jobs/sales/new-fab-id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <NewFabIdForm/>
              // </ProtectedRoute>
            }
          />
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
}
