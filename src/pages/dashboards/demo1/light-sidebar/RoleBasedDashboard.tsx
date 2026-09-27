import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAllPermissions, useIsSuperAdmin } from '@/hooks/use-permission';
import { DASHBOARD_WIDGETS, WIDGET_SECTIONS, type WidgetConfig } from '@/config/dashboard-widgets.config';
import { CommunityBadges } from './components/fab';
import { Contributions } from './components/chart';
import { FinanceStats } from './components/finance';
import { EarningsChart } from './components/earnings-chart';
import { Teams } from './components/teams';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiTile } from './components/channel-stats';
import { useGetStagesQuery } from '@/store/api/job';

/**
 * Role-Based Dashboard Component
 * 
 * This component dynamically renders dashboard widgets based on the user's
 * role permissions. It checks each widget's required permission and only
 * displays widgets the user has access to.
 */
export function RoleBasedDashboard() {
  const permissions = useAllPermissions();
  const isSuperAdmin = useIsSuperAdmin();
  
  // Fetch stage statistics
  const { data: stagesData, isLoading: isStagesLoading, isError: isStagesError } = useGetStagesQuery();

  /**
   * Map widget IDs to their specific job stage routes
   */
  const getRouteForWidget = (widgetId: string): string => {
    const routeMap: Record<string, string> = {
      'FAB IDs': '/sales',
      'Templating': '/job/templating',
      'Pre-Draft Review': '/job/predraft',
      'Drafting': '/job/draft',
      'SCT': '/job/draft-review',
      'SlabSmith Request': '/job/slab-smith',
      'Final Programming': '/job/final-programming',
      'Cut List': '/job/cut-list',
      'Resurface Scheduling': '/job/resurfacing',
      'Revisions': '/job/revision',
      'Install to Schedule': '/job/install-to-schedule',
      'Install Scheduled': '/job/install-scheduled',
      'shop-overview': '/shop',
      'CNC Programming': '/job/cnc',
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
      'Pre-Draft Review': 'pre_draft_review',
      'Drafting': 'drafting',
      'SCT': 'sales_ct',
      'SlabSmith Request': 'slab_smith_request',
      'Final Programming': 'final_programming',
      'Cut List': 'cut_list',
      'Resurface Scheduling': 'resurface_scheduling',
      'Revisions': 'revision',
      'Install to Schedule': 'install_scheduling',
      'Install Scheduled': 'install_completion',
      'FAB IDs': 'fab_created',
      'shop-overview': 'shop_overview',
      'CNC Programming': 'cnc',
    };
    
    const stageName = stageNameMap[widgetId] || widgetId.toLowerCase().replace(/ /g, '_');
    const stage = stagesData.find(s => s.stage_name === stageName);
    return stage ? stage.fab_count : 0;
  };

  /**
   * Filter widgets based on user permissions
   */
  const accessibleWidgets = useMemo(() => {
    // Super admin sees all widgets
    if (isSuperAdmin) {
      return DASHBOARD_WIDGETS;
    }

    // Filter widgets based on permissions
    return DASHBOARD_WIDGETS.filter((widget) => {
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

    accessibleWidgets
      .sort((a, b) => a.order - b.order)
      .forEach((widget) => {
        if (grouped[widget.category]) {
          grouped[widget.category].push(widget);
        }
      });

    return grouped;
  }, [accessibleWidgets]);

  /**
   * Render a single stat widget
   */
  const renderStatWidget = (widget: WidgetConfig) => {
    const data = widget.data;
    const icon = data?.icon || 'h119.svg';
    const bgColor = data?.bgColor || 'bg-[#9CC15E]';
    const fabCount = getFabCountForStage(widget.id);

    return (
      <Link
        key={widget.id}
        to={getRouteForWidget(widget.id)}
        className="rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        aria-label={`${widget.title}: ${isStagesLoading ? 'loading' : fabCount} FABs`}
      >
        <KpiTile
          interactive
          icon={icon}
          iconBg={bgColor}
          label={widget.title}
          value={isStagesLoading ? <Skeleton className="h-[30px] w-14" /> : fabCount}
          footer={
            <span className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors group-hover:text-primary-accent">
              {fabCount === 1 ? 'FAB in queue' : 'FABs in queue'}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          }
        />
      </Link>
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

  /**
   * Render widgets with optional section title for store widgets (for non-super-admins)
   */
  const renderWidgetsWithTitles = () => {
    // Separate job and store widgets
    const jobWidgets = accessibleWidgets.filter(widget => widget.domain !== 'store');
    const storeWidgets = accessibleWidgets.filter(widget => widget.domain === 'store');
    
    const elements = [];
    
    // Render job widgets
    if (jobWidgets.length > 0) {
      elements.push(
        <div key="job-widgets">
          {renderWidgetSection(jobWidgets)}
        </div>
      );
    }
    
    
    
    return elements;
  };
  
  /**
   * Render a section of widgets
   */
  const renderWidgetSection = (widgets: WidgetConfig[]) => {
    // Group widgets by category for this section
    const sectionWidgetsByCategory: Record<string, WidgetConfig[]> = {
      stats: [],
      fab: [],
      chart: [],
      finance: [],
      table: [],
    };

    widgets
      .sort((a, b) => a.order - b.order)
      .forEach((widget) => {
        if (sectionWidgetsByCategory[widget.category]) {
          sectionWidgetsByCategory[widget.category].push(widget);
        }
      });

    return (
      <>
        {/* Stats Section - 4 columns grid for all stat widgets */}
        {sectionWidgetsByCategory.stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
            {sectionWidgetsByCategory.stats.map(renderWidget)}
          </div>
        )}

      
      </>
    );
  };

  // Show message if no widgets are accessible
  if (accessibleWidgets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background px-8 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted ring-1 ring-border">
            <LayoutGrid className="size-5 text-muted-foreground" />
          </span>
          <p className="text-base font-semibold text-foreground">No dashboard widgets yet</p>
          <p className="text-sm text-muted-foreground">
            You don't have permission to view any dashboard widgets. Ask your administrator to grant access to the
            stages you work on.
          </p>
        </div>
      </div>
    );
  }

  // Show error message if stages failed to load
  // if (isStagesError) {
  //   return (
  //     <div className="flex items-center justify-center min-h-[400px]">
  //       <Alert variant="destructive" className="max-w-md">
  //         <InfoIcon className="h-4 w-4" />
  //         <AlertTitle>Error Loading Dashboard</AlertTitle>
  //         <AlertDescription>
  //           Failed to load stage statistics. Please try refreshing the page.
  //         </AlertDescription>
  //       </Alert>
  //     </div>
  //   );
  // }

  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-6">
      {renderWidgetsWithTitles()}
    </div>
  );
}