import { type LucideIcon, BadgeDollarSign, Ruler, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { FinanceStats as FinanceStatsData } from '@/store/api/job';
import { deltaToneClass, formatCurrency, formatSignedCurrency } from '@/lib/report-format';
import { cn } from '@/lib/utils';

interface IFinanceStatsProps {
  financeData?: FinanceStatsData;
}

const DELTA_PERIOD_LABELS: Record<FinanceStatsData['delta_period'], string> = {
  today: 'today',
  this_week: 'this week',
  this_month: 'this month',
};

const FinanceStats = ({ financeData }: IFinanceStatsProps) => {
  const rows: { icon: LucideIcon; label: string; value?: number; chip: string }[] = [
    { icon: BadgeDollarSign, label: 'Revenue installed', value: financeData?.revenue_installed, chip: 'bg-[#9CC15E]/15 text-[#5E7504]' },
    { icon: Ruler, label: 'Revenue templated', value: financeData?.revenue_templated, chip: 'bg-[#EA3DB1]/12 text-[#B0237F]' },
    { icon: TrendingUp, label: 'Gross profit', value: financeData?.gross_profit, chip: 'bg-[#51BCF4]/15 text-[#1F7FB0]' },
  ];
  const delta = financeData?.gross_profit_delta ?? null;
  const deltaPeriod = financeData ? DELTA_PERIOD_LABELS[financeData.delta_period] ?? 'this month' : '';

  return (
    <Card className="h-full">
      <CardHeader className="pt-4 min-h-0">
        <CardHeading>
          <CardTitle>Finance</CardTitle>
          <CardDescription>Revenue and gross profit for the period</CardDescription>
        </CardHeading>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-2">
        {!financeData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No finance data available</p>
        ) : (
          <>
            {/* Main figure: gross profit against breakeven. */}
            <div className="rounded-xl border border-border/70 px-4 py-4">
              <p className="text-sm font-medium text-text-foreground">Gross profit delta · {deltaPeriod}</p>
              <p
                className={cn('mt-1 truncate text-4xl font-semibold tracking-tight tabular-nums', deltaToneClass(delta))}
                data-testid="gross-profit-delta"
              >
                {delta === null ? '—' : formatSignedCurrency(delta)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {delta === null
                  ? 'Enter Total Expenses in Performance › Static Data to compare against breakeven.'
                  : `Gross profit ${formatCurrency(financeData.delta_gross_profit, 0)} vs breakeven ${formatCurrency(financeData.breakeven_gross_profit, 0)}`}
              </p>
            </div>
            {rows.map(({ icon: Icon, label, value, chip }) => (
              <div
                key={label}
                className="flex flex-1 items-center gap-4 rounded-xl border border-border/70 bg-gradient-to-b from-background to-muted/60 px-4 py-4"
              >
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                  <Icon className="size-5" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-foreground">{label}</p>
                  <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                    {formatCurrency(Number(value) || 0, 0)}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { FinanceStats };
