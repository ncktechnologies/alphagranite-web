import { MenuItem } from './types';

// This config defines the parent-child relationships for the permissions table.
// It is independent of the sidebar menu – items here will not appear in the navigation.
export const PERMISSION_GROUPS: MenuItem[] = [
  {
    title: 'Jobs',
    permissionKey: 'jobs',
    children: [
      { permissionKey: 'job_widgets' },
      { permissionKey: 'manage_jobs' },
      { permissionKey: 'view_all_fabs' },
      { permissionKey: 'need_to_invoice' },
      { permissionKey: 'job_status' },
    ],
  },
  {
    title: 'Performance',
    permissionKey: 'performance',
    children: [
      { permissionKey: 'installation_template' },
      { permissionKey: 'redos' },
      { permissionKey: 'sla_settings' },
    ],
  },
  {
    title: 'Shop',
    permissionKey: 'shop',
    children: [
      { permissionKey: 'shop_planning' },
      { permissionKey: 'shop_status' },
      { permissionKey: 'shop_revision' },
      { permissionKey: 'resurfacing_status' },
    ],
  },
 {
  title: 'Reports',
  permissionKey: 'reports',  
  children: [
    { permissionKey: 'completion_report' },
    { permissionKey: 'install_completion' },
    { permissionKey: 'install_performance' },
    { permissionKey: 'shop_cut_completion_monthly' },
    { permissionKey: 'install_completion_monthly' },
    { permissionKey: 'redo_analysis' },
    { permissionKey: 'revision_analysis' },
    { permissionKey: 'service_level' },
    { permissionKey: 'shop_production_summary' },
    { permissionKey: 'stage_status' },
    { permissionKey: 'install_template_trends' },
    { permissionKey: 'turnaround_times' },
    { permissionKey: 'shop_labor_costs_weekly' },
    { permissionKey: 'installer_labor_costs_weekly' },
  ],
},
  {
    title: 'Permission',
    permissionKey: 'permissions',
    children: [
      { permissionKey: 'redos' },
      { permissionKey: 'sla_settings' },
      // add more as needed
    ],
  },
];