import { ReactNode } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { DashboardKPIs } from '@/store/api/job';

interface IKpiTileProps {
  icon: string;
  iconBg: string;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  className?: string;
  interactive?: boolean;
}

/** Stat tile: label, headline value, optional real context line. */
export function KpiTile({ icon, iconBg, label, value, footer, className, interactive }: IKpiTileProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 gap-4 h-full transition-[box-shadow,transform,border-color] duration-200',
        interactive && 'group hover:-translate-y-0.5 hover:shadow-card-hover hover:border-primary-light/50',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-text-foreground leading-5">{label}</span>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm', iconBg)}>
          <img src={toAbsoluteUrl(`/images/icons/${icon}`)} className="size-5" alt="" />
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <span className="text-[30px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
      </div>
    </Card>
  );
}

interface IChannelStatsProps {
  dashboardData?: DashboardKPIs;
}

const numberFmt = new Intl.NumberFormat('en-US');

const ChannelStats = ({ dashboardData }: IChannelStatsProps) => {
  if (!dashboardData) return null;

  const completion = Math.max(0, Math.min(100, Number(dashboardData.completion_rate) || 0));

  return (
    <>
      <KpiTile
        icon="h119.svg"
        iconBg="bg-[#9CC15E]"
        label="Total jobs"
        value={numberFmt.format(dashboardData.total_jobs)}
        footer={
          dashboardData.total_fabs != null && (
            <span>
              <span className="font-semibold text-text tabular-nums">{numberFmt.format(dashboardData.total_fabs)}</span> FABs across all jobs
            </span>
          )
        }
      />
      <KpiTile
        icon="h131.svg"
        iconBg="bg-[#EA3DB1]"
        label="Pending installations"
        value={numberFmt.format(dashboardData.pending_installations)}
        footer="Awaiting install scheduling or completion"
      />
      <KpiTile
        icon="h143.svg"
        iconBg="bg-[#51BCF4]"
        label="Average revisions"
        value={(Number(dashboardData.average_revisions) || 0).toFixed(1)}
        footer="Revisions per job"
      />
      <KpiTile
        icon="h156.svg"
        iconBg="bg-[#0BC33F]"
        label="Completion rate"
        value={`${completion}%`}
        footer={
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[#0BC33F]/15"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
            aria-label="Completion rate"
          >
            <div className="h-full rounded-full bg-[#0BC33F]" style={{ width: `${completion}%` }} />
          </div>
        }
      />
    </>
  );
};

export { ChannelStats };
