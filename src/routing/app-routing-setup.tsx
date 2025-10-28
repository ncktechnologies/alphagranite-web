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
import { AfterDraftSalesPage } from '@/pages/jobs/roles/back-to-sales/BackSalesPage';
import { DraftReviewDetailsPage } from '@/pages/jobs/roles/back-to-sales/details';
import { DrafterDetailsPage } from '@/pages/jobs/roles/drafters';
import DrafterPage from '@/pages/jobs/roles/drafters/DrafterPage';
import { PreDraftDetailsPage } from '@/pages/jobs/roles/predraft/components/details';
import { PredraftPage } from '@/pages/jobs/roles/predraft/PredraftPage';
import { DraftRevisionPage } from '@/pages/jobs/roles/revisiondraft/BackSalesPage';
import { ReviewDetailsPage } from '@/pages/jobs/roles/revisiondraft/details';
import { SalesPage } from '@/pages/jobs/roles/sales/SalesPage';
import { TechnicianDetailsPage } from '@/pages/jobs/roles/technician-templater/components/details';
import { TechnicianPage } from '@/pages/jobs/roles/technician-templater/TechnicianPage';
import { FabIdDetailsPage } from '@/pages/jobs/roles/templating-coordinator/components/details';
import { TemplatingPage } from '@/pages/jobs/roles/templating-coordinator/templatingPage';
import { NotificationsSection, ProfileSection, RolesSection } from '@/pages/settings';
import CuttingPlanPage from '@/pages/shop/cutting-plan/CuttingPlanPage';
import { ShopDetailsPage } from '@/pages/shop/cutting-plan/Details';
import { EdgingDetailsPage } from '@/pages/shop/edging/Details';
import EdgingPlanPage from '@/pages/shop/edging/EdgingPage';
import SettingsPage from '@/pages/shop/settings/SettingsPage';
import { WjDetailsPage } from '@/pages/shop/wj/Detail';
import WJPlanPage from '@/pages/shop/wj/WjPage';

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
            path="/job/templating-technician"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <TechnicianPage/>
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
            path="/job/technician/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <TechnicianDetailsPage/>
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
          <Route
            path="/job/predraft"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <PredraftPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/job/predraft/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <PreDraftDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/draft"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <DrafterPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/job/draft/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <DrafterDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/draft-review"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <AfterDraftSalesPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/job/draft-review/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <DraftReviewDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/revision"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <DraftRevisionPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/job/revision/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <ReviewDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <CuttingPlanPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/settings"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <SettingsPage/>
              // </ProtectedRoute>
            }
          />
           <Route
            path="/shop/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <ShopDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/wj"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <WJPlanPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/wj/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <WjDetailsPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/edging"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <EdgingPlanPage/>
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/edging/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <EdgingDetailsPage/>
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
