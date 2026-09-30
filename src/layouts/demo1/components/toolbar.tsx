import { Fragment, ReactNode, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR } from '@/config/menu.config';
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
    <div className={cn("flex flex-wrap items-end justify-between gap-x-5 gap-y-4 pb-6", className)}>
      {children}
    </div>
  );
}

function ToolbarActions({ children }: { children?: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
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
  const resolvedTitle = (typeof title === 'string' ? title.trim() : title) || item?.title || 'Untitled';

  // Depend on the resulting string, not the (possibly JSX) title, so this doesn't rewrite
  // document.title on every render and clobber other title updates (e.g. a running timer).
  const docTitle =
    typeof resolvedTitle === 'string' ? resolvedTitle.trim() || item?.title || 'Alpha Granite' : 'Alpha Granite';

  useEffect(() => {
    document.title = `${docTitle} | The Odyssey Tracker`;

    return () => {
      document.title = 'Alpha Granite';
    };
  }, [docTitle]);

  return (
    <div className="flex flex-col justify-center gap-1.5 min-w-0">
      <h1 className="text-2xl lg:text-[29px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
        {resolvedTitle}
      </h1>
      {description && (
        <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
}

export { Toolbar, ToolbarActions, ToolbarBreadcrumbs, ToolbarHeading };
