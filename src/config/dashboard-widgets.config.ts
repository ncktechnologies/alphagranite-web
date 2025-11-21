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
  data?: any; // Optional data for widget configuration (icon, colors, etc.)
}

export const DASHBOARD_WIDGETS: WidgetConfig[] = [
  // Stats Widgets - These match the menu_name from permissions
  {
    id: 'fab-ids',
    title: 'FAB IDs',
    requiredPermission: 'fab_ids',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 1,
    data: { icon: 'h119.svg', bgColor: 'bg-[#9CC15E]' }
  },
  {
    id: 'templating',
    title: 'Templating',
    requiredPermission: 'templating',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 2,
    data: { icon: 'h131.svg', bgColor: 'bg-[#EA3DB1]' }
  },
  {
    id: 'Pre-draft Review',
    title: 'Pre-draft Review',
    requiredPermission: 'Pre-draft Review',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 3,
    data: { icon: 'h143.svg', bgColor: 'bg-[#EA3DB1]' }
  },
  {
    id: 'drafting',
    title: 'Drafting',
    requiredPermission: 'drafting',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 4,
    data: { icon: 'h156.svg', bgColor: 'bg-[#51BCF4]' }
  },
  
  // Stats Widgets - Row 2: SCT, SlabSmith Request, Final Programming, Cut List
  {
    id: 'sct',
    title: 'SCT',
    requiredPermission: 'sct',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 5,
    data: { icon: 'h119.svg', bgColor: 'bg-[#9CC15E]' }
  },
  {
    id: 'slabsmith-request',
    title: 'SlabSmith Request',
    requiredPermission: 'slabsmith_request',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 6,
    data: { icon: 'h131.svg', bgColor: 'bg-[#FFA500]' }
  },
  {
    id: 'final-programming',
    title: 'Final Programming',
    requiredPermission: 'final_programming',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 7,
    data: { icon: 'h143.svg', bgColor: 'bg-[#FFA500]' }
  },
  {
    id: 'cut-list',
    title: 'Cut List',
    requiredPermission: 'cut_list',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 8,
    data: { icon: 'h156.svg', bgColor: 'bg-[#9CC15E]' }
  },
  
  // Stats Widgets - Row 3: Retrofit Scheduling, Retrofit, Install Scheduling, Install Completion
  {
    id: 'resurface-scheduling',
    title: 'Resurface Scheduling',
    requiredPermission: 'resurface-scheduling',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 9,
    data: { icon: 'h119.svg', bgColor: 'bg-[#EA3DB1]' }
  },
  {
    id: 'revisions',
    title: 'Revisions',
    requiredPermission: 'revisions',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 10,
    data: { icon: 'h131.svg', bgColor: 'bg-[#FFA500]' }
  },
  {
    id: 'install-scheduling',
    title: 'Install Scheduling',
    requiredPermission: 'install_scheduling',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 11,
    data: { icon: 'h143.svg', bgColor: 'bg-[#9370DB]' }
  },
  {
    id: 'install-completion',
    title: 'Install Completion',
    requiredPermission: 'install_completion',
    requiredAction: 'read',
    component: 'StatWidget',
    category: 'stats',
    order: 12,
    data: { icon: 'h156.svg', bgColor: 'bg-[#51BCF4]' }
  },
  
  // FAB Widgets
  {
    id: 'newly-assigned-fab',
    title: 'Newly assigned FAB ID',
    requiredPermission: 'fab_ids',
    requiredAction: 'read',
    component: 'CommunityBadges',
    category: 'fab',
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
