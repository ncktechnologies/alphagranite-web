import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAllPermissions, useIsSuperAdmin } from '@/hooks/use-permission';
import { DASHBOARD_WIDGETS, WIDGET_SECTIONS, type WidgetConfig } from '@/config/dashboard-widgets.config';
import { CommunityBadges } from '@/pages/dashboards/demo1/light-sidebar/components/fab';
import { Contributions } from '@/pages/dashboards/demo1/light-sidebar/components/chart';
import { FinanceStats } from '@/pages/dashboards/demo1/light-sidebar/components/finance';
import { EarningsChart } from '@/pages/dashboards/demo1/light-sidebar/components/earnings-chart';
import { Teams } from '@/pages/dashboards/demo1/light-sidebar/components/teams';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, InfoIcon, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useGetStagesQuery } from '@/store/api/job';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Can } from '@/components/permission';
import { Button } from '@/components/ui/button';

/**
 * Job Dashboard Component
 * 
 * This component displays a dashboard specifically for job-related widgets.
 * It shows clickable widgets that navigate to different job sections.
 */
export function JobDashboardPage() {
  const permissions = useAllPermissions();
  const isSuperAdmin = useIsSuperAdmin();
  const navigate = useNavigate();

  // Fetch stage statistics
  const { data: stagesData, isLoading: isStagesLoading, isError: isStagesError } = useGetStagesQuery();

  /**
   * Map widget IDs to their specific job stage routes
   */
  const getRouteForWidget = (widgetId: string): string => {
    const routeMap: Record<string, string> = {
      'FAB IDs': '/job/sales',
      'Templating': '/job/templating',
      'Pre-draft Review': '/job/predraft',
      'Drafting': '/job/draft',
      'SCT': '/job/draft-review',
      'SlabSmith Request': '/job/slab-smith',
      'Final Programming': '/job/final-programming',
      'Cut List': '/job/cut-list',
      'Resurface Scheduling': '/job/final-programming',
      'Revisions': '/job/revision',
      'Install Scheduling': '/job/install-scheduling',
      'Install Completion': '/job/install-completion',
    };
    return routeMap[widgetId] || '/job';
  };

  /**
   * Get FAB count for a specific stage
   */
  const getFabCountForStage = (widgetId: string): number => {
    if (!stagesData) return 0;

    // Create a mapping of widget IDs to stage names
    const stageNameMap: Record<string, string> = {
      'Templating': 'templating',
      'Pre-draft Review': 'pre_draft_review',
      'Drafting': 'drafting',
      'SCT': 'sales_ct',
      'SlabSmith Request': 'slab_smith_request',
      'Final Programming': 'final_programming',
      'Cut List': 'cut_list',
      'Resurface Scheduling': 'resurface_scheduling',
      'Revisions': 'revision',
      'Install Scheduling': 'install_scheduling',
      'Install Completion': 'install_completion',
      'FAB IDs': 'fab_created'
    };

    const stageName = stageNameMap[widgetId] || widgetId.toLowerCase().replace(/ /g, '_');
    const stage = stagesData.find(s => s.stage_name === stageName);
    return stage ? stage.fab_count : 0;
  };

  /**
   * Filter widgets to only show job-related widgets
   */
  const jobWidgets = useMemo(() => {
    // Filter widgets to only include job-related ones (domain === 'job')
    const filteredWidgets = DASHBOARD_WIDGETS.filter(widget =>
      widget.domain === 'job'
    );

    // Super admin sees all job widgets
    if (isSuperAdmin) {
      return filteredWidgets;
    }

    // Filter widgets based on permissions
    return filteredWidgets.filter((widget) => {
      const menuPermissions = permissions[widget.requiredPermission];

      if (!menuPermissions) return false;

      // Check specific action permission if required
      const action = widget.requiredAction || 'read';
      return menuPermissions[`can_${action}`] === true;
    });
  }, [permissions, isSuperAdmin]);

  /**
   * Group widgets by category
   */
  const widgetsByCategory = useMemo(() => {
    const grouped: Record<string, WidgetConfig[]> = {
      stats: [],
      fab: [],
      chart: [],
      finance: [],
      table: [],
    };

    jobWidgets
      .sort((a, b) => a.order - b.order)
      .forEach((widget) => {
        if (grouped[widget.category]) {
          grouped[widget.category].push(widget);
        }
      });

    return grouped;
  }, [jobWidgets]);

  /**
   * Render a single stat widget
   */
  const renderStatWidget = (widget: WidgetConfig) => {
    // Extract data properties safely
    const data = widget.data;
    const icon = data?.icon || 'h119.svg';
    const bgColor = data?.bgColor || 'bg-[#9CC15E]';

    // Get FAB count for this widget's stage
    const fabCount = getFabCountForStage(widget.id);

    return (
      <Card
        key={widget.id}
        className='shadow-[#00000008] shadow-sm rounded-lg hover:shadow-lg transition-shadow duration-300 ease-in-out cursor-pointer'
        onClick={() => navigate(getRouteForWidget(widget.id))}
      >
        <CardContent className="p-0 pt-6 pb-8 flex justify-between items-start gap-6 h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
          <div className={`${bgColor} size-[44px] order-2 flex items-center justify-center mr-5 rounded-[8px]`}>
            <img
              src={toAbsoluteUrl(`/images/icons/${icon}`)}
              className="w-6 h-full max-h-5"
              alt={widget.title}
            />
          </div>

          <div className="flex flex-col gap-1 px-5 space-y-1 order-1">
            <span className="text-[14px] leading-[14px] font-semibold text-text-foreground">
              {widget.title}
            </span>
            <span className="text-[32px] leading-[32px] pt-3 font-semibold text-black">
              {isStagesLoading ? '...' : fabCount}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  /**
   * Render a widget component based on its type
   */
  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.component) {
      case 'StatWidget':
        return renderStatWidget(widget);

      case 'ChannelStats':
        return renderStatWidget(widget);

      case 'CommunityBadges':
        return (
          <div key={widget.id} className="lg:col-span-1">
            <CommunityBadges cardTitle={widget.title} />
          </div>
        );

      case 'Contributions':
        return (
          <div key={widget.id} className="lg:col-span-1">
            <Contributions title={widget.title} />
          </div>
        );

      case 'FinanceStats':
        return (
          <div key={widget.id} className="lg:col-span-1">
            <FinanceStats />
          </div>
        );

      case 'EarningsChart':
        return (
          <div key={widget.id} className="lg:col-span-2">
            <EarningsChart />
          </div>
        );

      case 'Teams':
        return (
          <div key={widget.id} className="lg:col-span-3">
            <Teams />
          </div>
        );

      default:
        return null;
    }
  };

  // Show message if no widgets are accessible
  if (jobWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>No Job Dashboard Access</AlertTitle>
          <AlertDescription>
            You don't have permission to view any job dashboard widgets. Please contact your administrator
            to grant you the necessary permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Container className="grid gap-5 lg:gap-7.5">
      <Toolbar className=' '>
        <ToolbarHeading title="View All FABs" description="View & track all Alpha granite FAB ID'S" />
        <ToolbarActions>
          <Can action="create" on="FAB IDs">
            <Link to="/jobs/sales/new-fab-id">
              <Button className="">
                <Plus/>
                New FAB ID
              </Button>
            </Link>
          </Can>
          <Can action="create" on="Jobs">
            <Link to="/create-jobs">
              <Button className="">
                <Eye />
                View Jobs
              </Button>
            </Link>
          </Can>
        </ToolbarActions>
      </Toolbar>
      {/* Stats Section - 4 columns grid for all stat widgets */}
      {widgetsByCategory.stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
          {widgetsByCategory.stats.map(renderWidget)}
        </div>
      )}


    </Container>
  );
}