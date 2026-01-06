/**
 * Dashboard Widget Configuration
 * 
 * This configuration defines which widgets are available and which permissions
 * are required to view them.
 */

export interface WidgetConfig {
  id: string;
  title: string;
  requiredPermission: string; // menu_code required to view this widget
  requiredAction?: 'create' | 'read' | 'update' | 'delete'; // specific action required (default: 'read')
  component: string; // Component identifier
  gridSpan?: {
    cols?: number;
    rows?: number;
  };
  order: number; // Display order
  category: 'stats' | 'chart' | 'table' | 'fab' | 'finance';
  domain?: 'job' | 'store'; // Added domain property to categorize widgets
  data?: any; // Optional data for widget configuration (icon, colors, etc.)
}

export const DASHBOARD_WIDGETS: WidgetConfig[] = [
  // Stats Widgets - Reordered according to workflow sequence
  // Template (1)
  {
    id: 'Templating',
    title: 'Templating',
    requiredPermission: 'Templating',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 1,
    data: { icon: 'tape-measure.svg', bgColor: 'bg-[#EE7575]' }
  },
  // Pre-Draft (2)
  {
    id: 'Pre-draft Review',
    title: 'Pre-draft Review',
    requiredPermission: 'Pre-draft Review',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 2,
    data: { icon: 'magnifier.svg', bgColor: 'bg-[#EA3DB1]' }
  },
  // Resurfacing (3)
  {
    id: 'Resurface Scheduling',
    title: 'Resurface Scheduling',
    requiredPermission: 'Resurface Scheduling',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 3,
    data: { icon: 'icon-4.svg', bgColor: 'bg-[#C30B7C]' }
  },
  // Draft (4)
  {
    id: 'Drafting',
    title: 'Drafting',
    requiredPermission: 'Drafting',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 4,
    data: { icon: 'icon-6.svg', bgColor: 'bg-[#51BCF4]' }
  },
  
  // SlabSmith (5)
  {
    id: 'SlabSmith Request',
    title: 'SlabSmith Request',
    requiredPermission: 'SlabSmith Request',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 5,
    data: { icon: 'package-up.svg', bgColor: 'bg-[#C1BE5E]' }
  },
  // SCT (6)
  {
    id: 'SCT',
    title: 'SCT',
    requiredPermission: 'SCT',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 6,
    data: { icon: 'money.svg', bgColor: 'bg-[#0BC33F]' }
  },
  // Revisions (7)
  {
    id: 'Revisions',
    title: 'Revisions',
    requiredPermission: 'Revisions',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 7,
    data: { icon: 'icon-3.svg', bgColor: 'bg-[#DA5D0F]' }
  },
  // Cut (8)
  {
    id: 'Cut List',
    title: 'Cut List',
    requiredPermission: 'Cut List',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 8,
    data: { icon: 'hand-saw.svg', bgColor: 'bg-[#5DD40D]' }
  },
  
  // Final Program (9)
  {
    id: 'Final Programming',
    title: 'Final Programming',
    requiredPermission: 'Final Programming',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 9,
    data: { icon: 'settings.svg', bgColor: 'bg-[#573DEA]' }
  },
  // Install to schedule (10)
  {
    id: 'Install Scheduling',
    title: 'INSTALL TO SCHEDULE',
    requiredPermission: 'Install Scheduling',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 10,
    data: { icon: 'calendar-pin.svg', bgColor: 'bg-[#CF2675]' }
  },
  // Install Scheduled (11)
  {
    id: 'Install Completion',
    title: ' INSTALL SCHEDULED',
    requiredPermission: 'Install Completion',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    domain: 'job',
    order: 11,
    data: { icon: 'icon-1.svg', bgColor: 'bg-[#13D6C6]' }
  },
  
  // FAB Widgets
  {
    id: 'newly-assigned-fab',
    title: 'Newly assigned FAB ID',
    requiredPermission: 'fab_ids',
    requiredAction: 'read',
    component: 'CommunityBadges',
    category: 'fab',
    domain: 'job', // Added domain
    gridSpan: { cols: 1 },
    order: 5,
  },
  {
    id: 'paused-jobs',
    title: 'Paused jobs',
    requiredPermission: 'jobs',
    requiredAction: 'read',
    component: 'CommunityBadges',
    category: 'fab',
    domain: 'job', // Added domain
    gridSpan: { cols: 1 },
    order: 6,
  },
  
  // Statistics and Charts
  {
    id: 'overall-statistics',
    title: 'Overall Statistics',
    requiredPermission: 'statistics',
    requiredAction: 'read',
    component: 'Contributions',
    category: 'chart',
    domain: 'job', // Added domain
    gridSpan: { cols: 1 },
    order: 7,
  },
  {
    id: 'finance-stats',
    title: 'Finance',
    requiredPermission: 'finance',
    requiredAction: 'read',
    component: 'FinanceStats',
    category: 'finance',
    domain: 'job', // Added domain
    gridSpan: { cols: 1 },
    order: 8,
  },
  {
    id: 'earnings-chart',
    title: 'Earnings Chart',
    requiredPermission: 'earnings',
    requiredAction: 'read',
    component: 'EarningsChart',
    category: 'chart',
    domain: 'job', // Added domain
    gridSpan: { cols: 2 },
    order: 9,
  },
  
  // Table Widgets
  {
    id: 'recent-jobs',
    title: 'Recent Jobs',
    requiredPermission: 'jobs',
    requiredAction: 'read',
    component: 'Teams',
    category: 'table',
    domain: 'job', // Added domain
    gridSpan: { cols: 3 },
    order: 10,
  },
  
  // Shop Widgets
  {
    id: 'shop-overview',
    title: 'Shop Overview',
    requiredPermission: 'shop',
    requiredAction: 'read',
    component: 'ShopOverview',
    category: 'stats',
    domain: 'store', // Added domain
    gridSpan: { cols: 3 },
    order: 11,
  },
  
  // Employee Widgets
  {
    id: 'employee-stats',
    title: 'Employee Statistics',
    requiredPermission: 'employees',
    requiredAction: 'read',
    component: 'EmployeeStats',
    category: 'stats',
    domain: 'job', // Added domain
    gridSpan: { cols: 2 },
    order: 12,
  },
  
  // Department Widgets
  {
    id: 'department-overview',
    title: 'Department Overview',
    requiredPermission: 'department',
    requiredAction: 'read',
    component: 'DepartmentOverview',
    category: 'stats',
    domain: 'job', // Added domain
    gridSpan: { cols: 2 },
    order: 13,
  },
];

/**
 * Widget sections configuration
 * Groups widgets by category and defines layout
 */
export const WIDGET_SECTIONS = {
  stats: {
    title: 'Statistics Overview',
    gridCols: 4,
    gap: 'gap-5 lg:gap-7.5',
  },
  fab: {
    title: 'FAB Management',
    gridCols: 3,
    gap: 'gap-5 lg:gap-7.5',
  },
  chart: {
    title: 'Charts & Analytics',
    gridCols: 3,
    gap: 'gap-5 lg:gap-7.5',
  },
  finance: {
    title: 'Financial Overview',
    gridCols: 3,
    gap: 'gap-5 lg:gap-7.5',
  },
  table: {
    title: 'Data Tables',
    gridCols: 1,
    gap: 'gap-5 lg:gap-7.5',
  },
};