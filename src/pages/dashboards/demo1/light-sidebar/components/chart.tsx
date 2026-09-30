import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle } from '@/components/ui/card';
import { OverallStatistics } from '@/store/api/job';

interface IContributionsProps {
  title: string;
  overallStats?: OverallStatistics;
}

// Brand series order is fixed: Completed → In progress → Paused (validated palette).
const SERIES = [
  { key: 'completed', label: 'Completed', color: '#9CC15E' },
  { key: 'in_progress', label: 'In progress', color: '#51BCF4' },
  { key: 'paused', label: 'Paused', color: '#EA3DB1' },
] as const;

const numberFmt = new Intl.NumberFormat('en-US');

const Contributions = ({ title, overallStats }: IContributionsProps) => {
  if (!overallStats) {
    return (
      <Card className="h-full">
        <CardHeader className="pt-4 min-h-0">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No statistics available yet</p>
        </CardContent>
      </Card>
    );
  }

  const values = SERIES.map((s) => Number(overallStats[s.key]) || 0);
  const sum = values.reduce((a, b) => a + b, 0);
  const total = overallStats.total || sum;
  const pct = (v: number) => (sum > 0 ? Math.round((v / sum) * 100) : 0);

  const options: ApexOptions = {
    labels: SERIES.map((s) => s.label),
    colors: SERIES.map((s) => s.color),
    chart: {
      type: 'donut',
      toolbar: { show: false },
      animations: { enabled: true, speed: 450 },
      fontFamily: 'inherit',
    },
    // 2px surface gap between segments
    stroke: { show: true, width: 2, colors: ['#ffffff'] },
    dataLabels: { enabled: false },
    legend: { show: false },
    states: {
      hover: { filter: { type: 'darken' } },
      active: { filter: { type: 'none' } },
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: { size: '74%', labels: { show: false } },
      },
    },
    tooltip: {
      enabled: true,
      custom({ series, seriesIndex }) {
        const s = SERIES[seriesIndex];
        const v = series[seriesIndex] as number;
        return `<div class="px-3 py-2 text-xs">
          <div class="flex items-center gap-1.5 font-medium text-foreground"><span style="background:${s.color}" class="inline-block size-2 rounded-full"></span>${s.label}</div>
          <div class="mt-0.5 text-muted-foreground tabular-nums">${numberFmt.format(v)} jobs · ${pct(v)}%</div>
        </div>`;
      },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="pt-4 min-h-0">
        <CardHeading>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Job status breakdown</CardDescription>
        </CardHeading>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-2">
        <div className="relative mx-auto size-[220px]">
          {sum > 0 ? (
            <ApexChart id="contributions_chart" options={options} series={values} type="donut" width={220} height={220} />
          ) : (
            <div className="absolute inset-[10px] rounded-full border-[18px] border-muted" aria-hidden />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[30px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {numberFmt.format(total)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">Total jobs</span>
          </div>
        </div>

        <ul className="mt-auto divide-y divide-border/70 rounded-xl border border-border/70">
          {SERIES.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
              <span className="text-text">{s.label}</span>
              <span className="ms-auto font-semibold text-foreground tabular-nums">{numberFmt.format(values[i])}</span>
              <span className="w-10 text-end text-xs text-muted-foreground tabular-nums">{pct(values[i])}%</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export { Contributions, type IContributionsProps };
