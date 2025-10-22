import { Fragment, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR, SETTINGS_NAV } from '@/config/menu.config';
import { MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';

export interface ToolbarHeadingProps {
  title?: string | ReactNode;
  description?: string | ReactNode;
}
interface ToolbarBreadcrumbsProps {
  menu: MenuItem[];
  rootTitle?: string;
  rootPath?: string;
  className?: string;
}
function Toolbar({ children, className }: { children?: ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-5 pb-7.5", className)}>
      {children}
    </div>
  );
}

function ToolbarActions({ children }: { children?: ReactNode }) {
  return <div className="flex items-center gap-2.5">{children}</div>;
}

function ToolbarBreadcrumbs({
  menu,
  rootTitle,
  rootPath,
  className = '',
}: ToolbarBreadcrumbsProps) {
  const { pathname } = useLocation();
  const { getBreadcrumb, isActive } = useMenu(pathname);

  // Add virtual root if provided
  const items: MenuItem[] = getBreadcrumb(
    rootTitle && rootPath
      ? [{ title: rootTitle, path: rootPath, children: menu }]
      : menu
  );

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs lg:text-sm font-medium mb-2.5 lg:mb-0',
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const active = item.path ? isActive(item.path) : false;

        return (
          <Fragment key={index}>
            {item.path ? (
              <Link
                to={item.path}
                className={cn(
                  'flex items-center gap-1 transition-colors',
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-primary'
                )}
              >
                {item.title}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {item.title}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function ToolbarHeading({ title = '', description }: ToolbarHeadingProps) {
  const { pathname } = useLocation();
  const { getCurrentItem } = useMenu(pathname);
  const item = getCurrentItem(MENU_SIDEBAR);

  return (
    <div className="flex flex-col justify-center gap-2">
      <h1 className="text-[28px] font-normal leading-[32px] text-black">
        {title || item?.title || 'Untitled'}
      </h1>
      {description && (
        <div className="flex items-center gap-2 text-sm font-normal text-text-foreground">
          {description}
        </div>
      )}
    </div>
  );
}

export { Toolbar, ToolbarActions, ToolbarBreadcrumbs, ToolbarHeading };
