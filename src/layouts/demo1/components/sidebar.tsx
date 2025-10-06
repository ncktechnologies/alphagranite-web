import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';
import { SidebarFooter } from './sidebar-footer';

export function Sidebar() {
  const { settings } = useSettings();
  const { pathname } = useLocation();

  return (
    <div
      className={cn(
        'sidebar bg-primary lg:border-e lg:border-border lg:fixed lg:top-10 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (settings.layouts.demo1.sidebarTheme === 'dark' ||
          pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      {/* <SidebarHeader /> */}
      <div className="overflow-hidden">
        <div className="w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
      
    </div>
  // <div className="flex-col fixed top-0 bottom-0 z-20 lg:flex items-stretch shrink-0 w-(--sidebar-width)  bg-primary lg:border-e lg:border-border  ">
  //     {/* <SidebarHeader /> */}
  //     <SidebarMenu />
  //     {/* <SidebarFooter /> */}
  //   </div>
  );
}
