import { Inbox } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { NewlyAssignedFab } from '@/store/api/job';
import { StagePill } from './stage-pill';

interface IFABProps {
  cardTitle: string;
  description?: string;
  emptyMessage?: string;
  newlyAssignedFabs?: NewlyAssignedFab[];
  pausedJobs?: any[];
  limit?: number;
}

const initials = (name?: string) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '—';

const CommunityBadges = ({
  cardTitle,
  description,
  emptyMessage = 'Nothing here right now',
  newlyAssignedFabs,
  pausedJobs,
  limit = 5,
}: IFABProps) => {
  const source: NewlyAssignedFab[] = newlyAssignedFabs ?? pausedJobs ?? [];
  const items = source.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader className="pt-4 pb-1 min-h-0">
        <CardHeading>
          <CardTitle>{cardTitle}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeading>
        {source.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
            {source.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted ring-1 ring-border">
              <Inbox className="size-5 text-muted-foreground" />
            </span>
            <span className="text-sm text-muted-foreground">{emptyMessage}</span>
          </div>
        ) : (
          <ul className="-mx-2 divide-y divide-border/70">
            {items.map((fab, index) => (
              <li
                key={`${fab.fab_id}-${index}`}
                className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/70"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary-accent">
                  {initials(fab.job_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{fab.job_name || 'Untitled job'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    FAB <span className="tabular-nums">#{fab.fab_id}</span>
                    {fab.assigned_to && <> · {fab.assigned_to}</>}
                  </p>
                </div>
                <StagePill stage={fab.stage} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export { CommunityBadges, type IFABProps };
