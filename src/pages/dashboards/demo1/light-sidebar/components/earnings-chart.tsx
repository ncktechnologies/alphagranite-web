import { ReactNode } from 'react';
import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardDescription, CardHeader, CardHeading, CardTitle, CardToolbar } from '@/components/ui/card';

interface EarningsChartProps {
  months?: string[];
  data?: number[];
  title?: string;
  description?: string;
  toolbar?: ReactNode;
}

const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const defaultData = Array(12).fill(0);

const SERIES_COLOR = '#EA3DB1';
const numberFmt = new Intl.NumberFormat('en-US');
/**
 * Clean axis: steps of 1, 2, 2.5 or 5 × 10ⁿ over 4–6 intervals, choosing the
 * tightest range that still clears the data (e.g. 0 / 25 / 50 / 75 / 100).
 */
function niceAxis(max: number): { max: number; ticks: number } {
  if (max <= 0) return { max: 4, ticks: 4 };
  const target = max * 1.05;
  let best = { max: Infinity, ticks: 4 };
  for (const ticks of [4, 5, 6]) {
    const magnitude = 10 ** Math.floor(Math.log10(target / ticks));
    for (const m of [1, 2, 2.5, 5, 10]) {
      const top = m * magnitude * ticks;
      if (top >= target && top < best.max) best = { max: top, ticks };
    }
  }
  return best;
}

export const EarningsChart = ({
  months = defaultMonths,
  data = defaultData,
  title = 'Performance overview',
  description = 'Monthly performance for the selected period',
  toolbar,
}: EarningsChartProps) => {
  const axis = niceAxis(Math.max(...data, 0));
  const latestIndex = data.length - 1;
  const latest = data[latestIndex];

  const options: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'inherit',
      parentHeightOffset: 0,
      animations: { enabled: true, speed: 450 },
    },
    colors: [SERIES_COLOR],
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { curve: 'smooth', width: 2, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0,
        opacityFrom: 0.16,
        opacityTo: 0,
        stops: [0, 95],
      },
    },
    markers: {
      size: 0,
      colors: [SERIES_COLOR],
      strokeColors: '#ffffff',
      strokeWidth: 2,
      hover: { size: 5 },
    },
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: {
        show: true,
        stroke: { color: '#C9CDD4', width: 1, dashArray: 0 },
      },
      tooltip: { enabled: false },
      labels: {
        style: { colors: '#6F777B', fontSize: '12px' },
      },
    },
    yaxis: {
      min: 0,
      max: axis.max,
      tickAmount: axis.ticks,
      labels: {
        style: { colors: '#6F777B', fontSize: '12px' },
        formatter: (v) => numberFmt.format(Math.round(v)),
      },
    },
    grid: {
      borderColor: '#EEF0F2',
      strokeDashArray: 0,
      padding: { left: 4, right: 8, top: -8 },
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.categoryLabels?.[dataPointIndex] ?? w.globals.labels?.[dataPointIndex] ?? months[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return `<div class="px-3 py-2 text-xs">
          <div class="font-medium text-foreground">${month}</div>
          <div class="mt-0.5 flex items-center gap-1.5 text-muted-foreground"><span style="background:${SERIES_COLOR}" class="inline-block h-0.5 w-3 rounded-full"></span>Performance <span class="ms-2 font-semibold text-foreground tabular-nums">${numberFmt.format(value)}</span></div>
        </div>`;
      },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="pt-4 min-h-0 items-start">
        <CardHeading>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeading>
        <CardToolbar>
          {toolbar}
          {latest !== undefined && (
            <div className="text-end">
              <div className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
                {numberFmt.format(latest)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Latest · {months[latestIndex]}</div>
            </div>
          )}
        </CardToolbar>
      </CardHeader>
      <CardContent className="relative grow min-h-[300px] px-3 pt-0 pb-2 overflow-hidden">
        <div className="absolute inset-x-3 top-0 bottom-2">
          <ApexChart
            id="earnings_chart"
            options={options}
            series={[{ name: 'Performance', data }]}
            type="area"
            width="100%"
            height="100%"
          />
        </div>
      </CardContent>
    </Card>
  );
};
