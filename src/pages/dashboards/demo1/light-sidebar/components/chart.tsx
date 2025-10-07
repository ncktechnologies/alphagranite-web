import { DropdownMenu7 } from '@/partials/dropdown-menu/dropdown-menu-7';
import { ApexOptions } from 'apexcharts';
import { EllipsisVertical } from 'lucide-react';
import ApexChart from 'react-apexcharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IContributionsProps {
  title: string;
}

const Contributions = ({ title }: IContributionsProps) => {
  const data: number[] = [55, 30, 15];
  const labels: string[] = ['Completed', 'In Progress', 'Paused'];
  const colors: string[] = ['#9CC15E', '#51BCF4', '#EA3DB1']; // matches Figma’s green, blue, pink

  const options: ApexOptions = {
    series: data,
    labels: labels,
    colors: colors,
    chart: {
      type: 'donut',
      toolbar: { show: true },
    },
     stroke: {
      show: true,
      width: 2,
    },
    dataLabels: {
      enabled: true,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '80%',
          background: 'transparent',
          labels: {
            show: true,
            name: { show: false },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 600,
              color: '#000',
              offsetY: 6,
              formatter: () => '100%',
            },
            total: { show: false },
          },
        },
      },
    },
    
    legend: {
      show: false,
    },
  };

  return (
    <Card className="p-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="">{title}</CardTitle>
        {/* <DropdownMenu7
          trigger={
            <Button variant="ghost" mode="icon" className="h-8 w-8 p-0">
              <EllipsisVertical className="w-4 h-4" />
            </Button>
          }
        /> */}
      </CardHeader>
      <CardContent className="flex justify-center items-center relative py-2">
        <ApexChart
          id="contributions_chart"
          options={options}
          series={options.series}
          type="donut"
          width="250"
          height="250"
        />

        {/* Floating labels (to mimic Figma’s % bubbles) */}
        {/* <div className="absolute top-[15%] left-[55%] flex flex-col gap-3 text-sm font-medium">
          <span className="bg-white px-2 py-1 rounded-full border border-[#6CD34C] text-[#6CD34C]">
            55%
          </span>
          <span className="bg-white px-2 py-1 rounded-full border border-[#2AA7FF] text-[#2AA7FF]">
            30%
          </span>
          <span className="bg-white px-2 py-1 rounded-full border border-[#E454E2] text-[#E454E2]">
            15%
          </span>
        </div> */}
      </CardContent>
    </Card>
  );
};

export { Contributions, type IContributionsProps };
