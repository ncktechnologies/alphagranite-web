import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EarningsChartProps {
  months?: string[];
  data?: number[];
  title?: string;
  timePeriod?: string;
  onTimePeriodChange?: (value: string) => void;
}

const defaultMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const defaultData = Array(12).fill(0);

export const EarningsChart = ({ 
  months = defaultMonths, 
  data = defaultData,
  title = 'Performance Overview',
  timePeriod = 'all',
  onTimePeriodChange,
}: EarningsChartProps) => {
  // Map period to dropdown value
  const periodMap: Record<string, string> = {
    'all': '1',
    '3': '3',
    '6': '6',
    '12': '12',
  };
  const value = periodMap[timePeriod] || '1';

  const handlePeriodChange = (val: string) => {
    if (onTimePeriodChange) {
      // Convert dropdown value back to period key
      const map: Record<string, string> = {
        '1': 'all',
        '3': '3',
        '6': '6',
        '12': '12',
      };
      onTimePeriodChange(map[val] || 'all');
    }
  };

  // Calculate max for yaxis (auto-scale)
  const maxValue = Math.max(...data, 1);
  const yMax = Math.ceil(maxValue / 10) * 10 + 5; // round up to nearest 10 + padding

  const options: ApexOptions = {
    series: [
      {
        name: 'Performance',
        data: data,
      },
    ],
    chart: {
      height: 250,
      type: 'area',
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: ['#EA3DB1'],
    },
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: 4,
      axisTicks: { show: false },
      labels: {
        show: false,
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
      },
    },
    tooltip: {
      enabled: true,
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.seriesX[seriesIndex][dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        return `
          <div class="flex flex-col gap-2 p-4">
            <div class="font-semibold">${month}</div>
            <div>Performance: ${value}</div>
          </div>
        `;
      },
    },
    markers: {
      size: 0,
      colors: 'var(--color-white)',
      strokeColors: '#EA3DB1',
      strokeWidth: 4,
      strokeOpacity: 1,
      hover: { size: 8 },
    },
    fill: {
      type: 'gradient',
      colors: ['#EA3DB1'],
      gradient: {
        shade: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#ffffff'],
        inverseColors: false,
        opacityFrom: 0.70,
        opacityTo: 0.12,
        stops: [0, 100],
      },
    },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-[20px] leading-[24px]">{title}</CardTitle>
        <div className="flex gap-5">
          <Select value={value} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="w-28">
              <SelectItem value="1">All time</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-end items-stretch grow px-3 py-1 overflow-hidden">
        <div className="w-full overflow-hidden">
          <ApexChart
            id="earnings_chart"
            options={options}
            series={options.series}
            type="area"
            width="100%"
            height="250"
          />
        </div>
      </CardContent>
    </Card>
  );
};