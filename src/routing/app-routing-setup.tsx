import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import ProtectedRoute from '@/lib/protectedRoutes';
import { DefaultPage } from '@/pages/dashboards';
import { DepartmentPage } from '@/pages/departments';
import { DepartmentDetailsPage } from '@/pages/departments/department-table/TablePage';
import { EmployeePage } from '@/pages/employers';
import { AfterDraftSalesPage } from '@/pages/jobs/roles/back-to-sales/BackSalesPage';
import { DraftReviewDetailsPage } from '@/pages/jobs/roles/back-to-sales/details';
import { DrafterDetailsPage } from '@/pages/jobs/roles/drafters';
import DrafterPage from '@/pages/jobs/roles/drafters/DrafterPage';
import CNCPage from '@/pages/jobs/roles/cnc/CNCPage';
import { CNCDetailsPage } from '@/pages/jobs/roles/cnc/CNCDetailsPage';
import { PreDraftDetailsPage } from '@/pages/jobs/roles/predraft/components/details';
import { PredraftPage } from '@/pages/jobs/roles/predraft/PredraftPage';
// import { PreDraftReviewPage } from '@/pages/jobs/roles/predraft/PreDraftReviewPage';
import { DraftRevisionPage } from '@/pages/jobs/roles/revisiondraft/BackSalesPage';
import { SalesPage } from '@/pages/jobs/roles/sales/SalesPage';
import { SalesDetailsPage } from '@/pages/jobs/roles/sales/Details';
import { TemplatingDetailsPage } from '@/pages/jobs/roles/technician-templater/components/TemplatingDetailsPage';
import { TechnicianPage } from '@/pages/jobs/roles/technician-templater/TechnicianPage';
import { FabIdDetailsPage } from '@/pages/jobs/roles/templating-coordinator/components/details';
import { TemplatingPage } from '@/pages/jobs/roles/templating-coordinator/templatingPage';
import { NotificationsSection, ProfileSection, RolesSection, PermissionsSection, StoneTypesSection } from '@/pages/settings';
import SettingsPage from '@/pages/shop/settings/SettingsPage';
import { JobsSection } from '@/pages/jobs/JobsSection';
import CutListPage from '@/pages/jobs/roles/production-coordinator/CutListPage';
import FinalProgrammingPage from '@/pages/jobs/roles/production-coordinator/FinalProgrammingPage';
import CutListDetailsPage from '@/pages/jobs/roles/production-coordinator/CutListDetailsPage';
import FinalProgrammingDetailsPage from '@/pages/jobs/roles/production-coordinator/FinalProgrammingDetailsPage';

import { Navigate, Route, Routes } from 'react-router';
import { NewFabIdForm } from '@/pages/jobs/roles';
import { EditFabIdForm } from '@/pages/jobs/roles/sales/EditFabIdForm';
import { SlabSmithDetailsPage, SlabSmithPage } from '@/pages/jobs/roles/slab-smith';
import { JobDashboardPage } from '@/pages/jobs';
import { JobDetailsPage } from '@/pages/jobs/JobDetailsPage';
import { NeedToInvoicePage } from '@/pages/jobs/NeedToInvoicePage';
import { StoreDashboardPage } from '@/pages/shop';
import { RevisionDetailsPage } from '@/pages/jobs/roles/revisiondraft/Revisiondetails';
import ShopPage from '@/pages/shop/ShopPage';
import ShopCalendarPage from '@/pages/shop/components/shopCalendar';
import { ResurfacingPage } from '@/pages/jobs/roles/resurfacing';
import { InstallSchedulingPage } from '@/pages/jobs/roles/install-scheduling';
import { InstallSchedulingDetailsPage } from '@/pages/jobs/roles/install-scheduling/components/details';
import { ResurfacingDetailsPage } from '@/pages/jobs/roles/resurfacing/components/details';
import CreatePlanPage from '@/pages/shop/components/createPlanePage';
import CreateAutoPlanPage from '@/pages/shop/components/autoSuggest';
import ResurfacingStatusPage from '@/pages/shop/resurfacing/page';
import { FabDetailsPage } from '@/pages/shop/components/statusDetails';
import ShopRevisionPage from '@/pages/shop/revisions/ShopRevisionPage';
import ShopRevisionDetailsPage from '@/pages/shop/revisions/ShopRevisionDetailsPage';
import { InstallCompletionPage } from '@/pages/jobs/roles/install-completion';
import { ResurfacingStatusDetailsPage } from '@/pages/jobs/roles/resurfacing-completion/components/details';
// import ShopCalendarPage from '@/pages/shop/calendarPage';
import { OperatorDashboard, OperatorTaskDetails } from '@/pages/operator';
import { TemplaterTimerPage } from '@/pages/templater/TemplaterTimerPage';
import { InstallerTimerPage } from '@/pages/installer/InstallerTimerPage';
import { JobStatusTable } from '@/pages/jobs/roles/report/JobStatus';
import JobStatusPage from '@/pages/jobs/roles/report/JobStatusPage';
import { InstallerScheduleCards } from '@/pages/installer/InstallerDashboard';
import CostOfStonePage from '@/pages/jobs/roles/cost_of_stone.tsx/CostOfStonePage';
import ReportPage from '@/pages/reports/ReportPage';
import { RedosReport } from '@/pages/reports/RedosReport';
import { WeeklyFabricationCostReport } from '@/pages/reports/WeeklyFabCost';
import { WeeklyInstallerCostReport } from '@/pages/reports/WeeklyInstallerCost';
import { InstallPerformance } from '@/pages/reports/InstallPerformance';
import { ShopStatusReport } from '@/pages/reports/ShopStatus';
import { TurnaroundTimesReport } from '@/pages/reports/TurnaroundTimes';
import { MonthlyCutCompletionReport } from '@/pages/reports/MonthlyCut';
import { DailyInstallCompletionReport } from '@/pages/reports/DailyInstallationCut';
import { MonthlyInstallCompletionReport } from '@/pages/reports/MonthlyInstallCompletion';
import { WeeklyTrendsReport } from '@/pages/reports/WeeklyTrends';
import { InstallationTemplateReport } from '@/pages/reports/InstallationTemplates';
import { OwnerOverview } from '@/pages/reports/OwnerOverview';
import { OwnerOverviewReport } from '@/pages/reports/OwnerReview';
import { RedoAnalysisReport } from '@/pages/reports/RedoAnalysis';
import { InstallerRatesReport } from '@/pages/reports/InstallerRates';
import { ServiceLevelReport } from '@/pages/reports/ServiceLevel';
import ShopStatusPage from '@/pages/shop/status/StatusPage';
import { InstallationTemplateReportCard } from '@/pages/reports/InstallationTemplateCard';
import { ShopProductionSummary } from '@/pages/reports/ShopProductionSummary';
import { DailyCompletion } from '@/pages/reports/DailyCompletion';

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
          <Route path="/settings/permissions" element={<PermissionsSection />} />
          <Route path="/settings/stone-types" element={<StoneTypesSection />} />
          <Route path="/create-jobs" element={<JobsSection />} />
          <Route path="/report-status" element={<JobStatusPage />} />
          <Route path="/need-to-invoice" element={<NeedToInvoicePage />} />

          {/* Job Dashboard Route */}
          <Route path="/job" element={<JobDashboardPage />} />

          {/* Job Details Route */}
          <Route
            path="/job/details/:job_id"
            element={
              <JobDetailsPage />
            }
          />

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
            path="/sales"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <SalesPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/sales/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <SalesDetailsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/sales/edit/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <EditFabIdForm />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/templating"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <TemplatingPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/templating-technician"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <TechnicianPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/templating/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <FabIdDetailsPage />
              // </ProtectedRoute>
            }
          />

          <Route
            path="/job/templating-details/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <TemplatingDetailsPage />
              // </ProtectedRoute>
            }
          />

          <Route
            path="/sales/new-fab-id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <NewFabIdForm />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/predraft"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <PredraftPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/predraft/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <PreDraftDetailsPage />
              // </ProtectedRoute>
            }
          />
          {/* <Route
            path="/job/predraft-review"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
                <PreDraftReviewPage/>
              // </ProtectedRoute>
            }
          /> */}
          <Route
            path="/job/draft"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <DrafterPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/draft/:id"
            element={
              <DrafterDetailsPage />
            }
          />
          <Route
            path="/job/cnc"
            element={
              <CNCPage />
            }
          />
          <Route
            path="/job/cost-of-stone"
            element={
              <CostOfStonePage />
            }
          />
          <Route
            path="/job/cnc/:id"
            element={
              <CNCDetailsPage />
            }
          />
          <Route
            path="/job/draft-review"
            element={
              <AfterDraftSalesPage />
            }
          />
          <Route
            path="/job/draft-review/:id"
            element={
              <DraftReviewDetailsPage />
            }
          />
          <Route
            path="/job/revision"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <DraftRevisionPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/revision/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <RevisionDetailsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/slab-smith"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <SlabSmithPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/slab-smith/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <SlabSmithDetailsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/cut-list"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <CutListPage />
              // </ProtectedRoute>
            }
          />

          <Route
            path="/job/cut-list/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <CutListDetailsPage />
              // </ProtectedRoute>
            }
          />

          <Route
            path="/job/final-programming"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <FinalProgrammingPage />
              // </ProtectedRoute>
            }
          />

          <Route
            path="/job/final-programming/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <FinalProgrammingDetailsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/resurfacing"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ResurfacingPage />

              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/resurfacing/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ResurfacingDetailsPage />

              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/install-to-schedule"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <InstallSchedulingPage />

              // </ProtectedRoute>
            }
          />

          <Route
            path="/job/install-scheduled"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <InstallCompletionPage />

              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/install-to-schedule/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <InstallSchedulingDetailsPage />

              // </ProtectedRoute>
            }
          />
          <Route
            path="/job/install-scheduled/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <InstallSchedulingDetailsPage />

              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ShopPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/settings"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <SettingsPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/shop/calendar"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ShopCalendarPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path='/shop/create-plan'
            element={
              <CreatePlanPage />
            }
          />
          <Route
            path="/shop/auto-schedule"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <CreateAutoPlanPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/status"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ShopStatusPage />
              // </ProtectedRoute>
            }
          />
          <Route path="/shop/fab/:fabId" element={<FabDetailsPage />} />
          <Route path="/revision" element={<ShopRevisionPage />} />
          <Route path="/revision/:fabId" element={<ShopRevisionDetailsPage />} />
          <Route
            path="/resurfacing-status"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ResurfacingStatusPage />
              // </ProtectedRoute>
            }
          />
          <Route
            path="/resurfacing-status/:id"
            element={
              // <ProtectedRoute roles={['admin', 'manager', "developer"]}>
              <ResurfacingStatusDetailsPage />
              // </ProtectedRoute>
            }
          />


          {/* Reports Route */}
          {/* <Route path="/report/:reportId" element={<ReportPage />} /> */}
          <Route path="/report/installer-rates" element={<InstallerRatesReport />} />
          <Route path="/report/redos" element={<RedosReport />} />
          <Route path="/report/weekly-fabrication-cost" element={<WeeklyFabricationCostReport />} />
          <Route path="/report/weekly-installer-cost" element={<WeeklyInstallerCostReport />} />
          <Route path="/report/install-performance" element={<InstallPerformance />} />
          <Route path="/report/shop-status" element={<ShopStatusReport />} />
          <Route path="/report/turnaround-times" element={<TurnaroundTimesReport />} />
          <Route path='/report/monthly-cut-completion' element={<MonthlyCutCompletionReport />} />
          <Route path='/report/daily-install-completion' element={<DailyInstallCompletionReport />} />
          <Route path='/report/monthly-install-completion' element={<MonthlyInstallCompletionReport />} />
          <Route path='/report/weekly-trends' element={<WeeklyTrendsReport />} />
          <Route path="/report/installation-template" element={<InstallationTemplateReport />} />
          <Route path="/report/template-card" element={<InstallationTemplateReportCard />} />
          <Route path="/report/owner-overview" element={<OwnerOverviewReport />} />
          <Route path="/report/redo-analysis" element={<RedoAnalysisReport />} />
          <Route path="/report/service-level" element={<ServiceLevelReport />} />
          <Route path='/report/shop-production-summary' element={<ShopProductionSummary/>} />
          <Route path='/report/daily-completion' element={<DailyCompletion/>} />





          {/* Operator Routes */}
          <Route
            path="/operator/dashboard"
            element={
              <OperatorDashboard />
            }
          />
          <Route
            path="/operator/task/:jobId"
            element={
              <OperatorTaskDetails />
            }
          />
          <Route
            path="/jobs/:job_id/templater/timer"
            element={<TemplaterTimerPage />}
          />
          <Route
            path='jobs/:job_id/installer/timer'
            element={
              <InstallerTimerPage />
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