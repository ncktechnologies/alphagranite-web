import { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Hardcoded dummy data for the performance overview chart
const dummyChartData = {
  inProgress: [32, 28, 35, 42, 38, 45, 40, 48, 52, 58, 62, 68],
  paused: [12, 8, 10, 15, 18, 12, 8, 10, 8, 12, 15, 18],
  completed: [24, 28, 22, 18, 20, 25, 24, 28, 30, 32, 35, 38],
};

const EarningsChart = () => {
  const [chartData, setChartData] = useState(dummyChartData);
  const categories: string[] = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  useEffect(() => {
    // No need to fetch data, just use the dummy data directly
    setChartData(dummyChartData);
  }, []);

  const options: ApexOptions = {
    series: [
      {
        name: 'Performance',
        data: chartData.inProgress ?? [],
      },
    ],
    chart: {
      height: 250,
      type: 'area',
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: ['#EA3DB1'],
    },
    xaxis: {
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: true,
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
      },
      crosshairs: {
        position: 'front',
        stroke: {
          color: 'var(--color-primary)',
          width: 1,
          dashArray: 3,
        },
      },
      tooltip: {
        enabled: false,
        formatter: undefined,
        offsetY: 0,
        style: {
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      min: 0,
      max: 80,
      tickAmount: 4,
      axisTicks: {
        show: false,
      },
      labels: {
        show: false,
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
        formatter: (defaultValue) => {
          return `${defaultValue}`;
        },
      },
    },
    tooltip: {
      enabled: true,
      custom({ series, seriesIndex, dataPointIndex, w }) {
        const month = w.globals.seriesX[seriesIndex][dataPointIndex];
        const monthName = categories[month];

        // Get values for this specific month from our data
        const inProgress = chartData.inProgress[dataPointIndex];
        const paused = chartData.paused[dataPointIndex];
        const completed = chartData.completed[dataPointIndex];

        return `
          <div class="flex flex-col gap-2 p-6.5">
            <div class="flex flex-col gap-1 space-y-3 pr-12">
              <div class="flex items-center gap-2">
                <span class="text-sm">In Progress: ${inProgress}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm">Paused: ${paused}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm">Completed: ${completed}</span>
              </div>
            </div>
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
      strokeDashArray: 0,
      fillOpacity: 1,
      discrete: [],
      shape: 'circle',
      offsetX: 0,
      offsetY: 0,
      onClick: undefined,
      onDblClick: undefined,
      showNullDataPoints: true,
      hover: {
        size: 8,
        sizeOffset: 0,
      },
    },
    fill: {
      type: 'gradient',
      colors:['#EA3DB1'],
      gradient: {
        shade: 'vertical',
        // type: 'linear',
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
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Performance Overview</CardTitle>
        <div className="flex gap-5">
          {/* <div className="flex items-center gap-2">
            <Label htmlFor="auto-update" className="text-sm">
              Referrals only
            </Label>
            <Switch id="auto-update" defaultChecked size="sm" />
          </div> */}
          <Select defaultValue="1">
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

export { EarningsChart };
