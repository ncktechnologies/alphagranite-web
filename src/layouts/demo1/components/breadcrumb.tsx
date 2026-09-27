import { Fragment, useMemo } from 'react';
import { ChevronRight, House } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { cn } from '@/lib/utils';

export function Breadcrumb({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const items = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const isHome = pathname === '/';

  return (
    <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center', className)}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        <li className="shrink-0">
          <Link
            to="/"
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-accent',
              isHome ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label="Dashboard"
          >
            <House className="size-4" />
          </Link>
        </li>
        {isHome && (
          <li className="px-1 font-semibold text-foreground" aria-current="page">
            Dashboard
          </li>
        )}
        {!isHome &&
          items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <Fragment key={`${item.title}-${index}`}>
                <li aria-hidden className="shrink-0 text-muted-foreground/60">
                  <ChevronRight className="size-3.5" />
                </li>
                <li className={cn('min-w-0', !last && 'hidden md:block')}>
                  {last || !item.path ? (
                    <span
                      className={cn(
                        'block truncate px-1',
                        last ? 'font-semibold text-foreground' : 'text-muted-foreground',
                      )}
                      aria-current={last ? 'page' : undefined}
                    >
                      {item.title}
                    </span>
                  ) : (
                    <Link
                      to={item.path}
                      className="block truncate rounded-md px-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.title}
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
      </ol>
    </nav>
  );
}
