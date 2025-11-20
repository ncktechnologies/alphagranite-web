import { ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MenuConfig } from '@/config/types';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar';

const NavbarMenu = ({ items }: { items: MenuConfig }) => {
  const { pathname } = useLocation();
  const { isActive, hasActiveChild } = useMenu(pathname);
  const isSuperAdmin = useIsSuperAdmin();

  // Filter menu items based on super admin status
  const filteredItems = items.filter(item => {
    // If item doesn't have superAdminOnly property, show it to everyone
    if (!item.superAdminOnly) return true;
    // If item is superAdminOnly, only show it to super admins
    return isSuperAdmin;
  });

  const buildMenu = (items: MenuConfig) => {
    return items.map((item, index) => {
      if (item.children) {
        return (
          <MenubarMenu key={index}>
            <MenubarTrigger
              className={cn(
                'flex items-center gap-1.5 px-3 py-3.5 text-sm text-secondary-foreground',
                'rounded-none border-b-2 border-transparent bg-transparent!',
                'hover:text-primary hover:bg-transparent',
                'focus:text-primary focus:bg-transparent',
                'data-[state=open]:bg-transparent data-[state=open]:text-primary',
                'data-[here=true]:text-primary data-[here=true]:border-primary',
              )}
              data-active={isActive(item.path) || undefined}
              data-here={hasActiveChild(item.children) || undefined}
            >
              {item.title}
              <ChevronDown className="ms-auto size-3.5" />
            </MenubarTrigger>
            <MenubarContent className="min-w-[175px]">
              {buildSubMenu(item.children)}
            </MenubarContent>
          </MenubarMenu>
        );
      } else {
        return (
          <MenubarMenu key={index}>
            <MenubarTrigger
              asChild
              className={cn(
                'flex items-center px-2 py-3.5 text-sm text-text-foreground px-3',
                'rounded-none border-b-2 border-transparent bg-transparent!',
                'hover:text-text hover:bg-transparent',
                'focus:text-text focus:bg-transparent',
                'data-[active=true]:text-text data-[active=true]:font-semibold data-[active=true]:border-primary',
              )}
            >
              <Link
                to={item.path || ''}
                data-active={isActive(item.path) || undefined}
                data-here={hasActiveChild(item.children) || undefined}
              >
                {item.icon && <item.icon data-slot="accordion-menu-icon" className='mr-2 h-[12px] w-[13px]'/>}
                {item.title}
              </Link>
            </MenubarTrigger>
          </MenubarMenu>
        );
      }
    });
  };

  const buildSubMenu = (items: MenuConfig) => {
    return items.map((item, index) => {
      if (item.children) {
        return (
          <MenubarSub key={index}>
            <MenubarSubTrigger
              data-active={isActive(item.path) || undefined}
              data-here={hasActiveChild(item.children) || undefined}
            >
              <span>{item.title}</span>
            </MenubarSubTrigger>
            <MenubarSubContent className="min-w-[175px]">
              {buildSubMenu(item.children)}
            </MenubarSubContent>
          </MenubarSub>
        );
      } else {
        return (
          <MenubarItem
            key={index}
            asChild
            data-active={isActive(item.path) || undefined}
            data-here={hasActiveChild(item.children) || undefined}
          >
            <Link to={item.path || ''}>{item.title}</Link>
          </MenubarItem>
        );
      }
    });
  };

  return (
    <div className="grid">
      <div className="kt-scrollable-x-auto">
        <Menubar className="flex items-stretch gap-3 bg-transparent p-0 h-auto">
          {buildMenu(filteredItems)}
        </Menubar>
      </div>
    </div>
  );
};

export { NavbarMenu };
