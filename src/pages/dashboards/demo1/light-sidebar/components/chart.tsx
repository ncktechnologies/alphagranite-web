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
  const colors: string[] = ['#9CC15E', '#51BCF4', '#EA3DB1'];

  // Updated for larger chart - increased radius and center
  const getLabelPosition = (index: number, radius: number = 120) => {
    const total = data.reduce((sum, value) => sum + value, 0);
    let cumulativeAngle = -90;
    
    for (let i = 0; i < index; i++) {
      cumulativeAngle += (data[i] / total) * 360;
    }
    
    const currentSegmentAngle = (data[index] / total) * 360;
    const labelAngle = cumulativeAngle + (currentSegmentAngle / 2);
    
    const angleInRadians = (labelAngle * Math.PI) / 180;
    
    const x = Math.cos(angleInRadians) * radius;
    const y = Math.sin(angleInRadians) * radius;
    
    return { x: x + 150, y: y + 150 }; // Updated center to 150 for 300x300 chart
  };

  const options: ApexOptions = {
    series: data,
    labels: labels,
    colors: colors,
    chart: {
      type: 'donut',
      toolbar: { show: false },
    },
    stroke: {
      show: false,
      width: 0,
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          background: 'transparent',
          labels: {
            show: false,
            name: { show: false },
            value: {
              show: false,
            },
            total: { 
              show: false,
            },
          },
        },
      },
    },
    legend: {
      show: false,
    },
  };

  return (
    <Card className="p-2 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-[20px] leading-[24px]">{title}</CardTitle>
        {/* <DropdownMenu7
          trigger={
            <Button variant="ghost" mode="icon" className="h-8 w-8 p-0">
              <EllipsisVertical className="w-4 h-4" />
            </Button>
          }
        /> */}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 py-2">
        {/* Chart container - will grow to fill available space */}
        <div className="flex-1 flex items-center justify-center min-h-0"> {/* Added min-h-0 for better flex behavior */}
          <div className="relative">
            <ApexChart
              id="contributions_chart"
              options={options}
              series={options.series}
              type="donut"
              width="300"  
              height="300" 
            />
            
            {/* Custom center circle with shadow - increased size */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-full shadow-lg flex items-center justify-center" 
                   style={{width: '110px', height: '110px'}}> {/* Increased from 80px to 110px */}
                <span className="text-xl font-bold text-gray-800">100%</span> {/* Increased font size */}
              </div>
            </div>

            {/* Custom percentage labels positioned at segment centers - updated for larger chart */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${getLabelPosition(0).x}px`,
                top: `${getLabelPosition(0).y}px`
              }}
            >
              <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                55%
              </div>
            </div>
            
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${getLabelPosition(1).x}px`,
                top: `${getLabelPosition(1).y}px`
              }}
            >
              <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                30%
              </div>
            </div>
            
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${getLabelPosition(2).x}px`,
                top: `${getLabelPosition(2).y}px`
              }}
            >
              <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                15%
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend - always at the bottom */}
        <div className="flex-shrink-0 mt-auto pt-6"> {/* Increased padding top */}
          <div className="flex flex-row gap-6 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#9CC15E'}}></div>
              <span className="text-sm text-text">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#51BCF4'}}></div>
              <span className="text-sm text-text">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#EA3DB1'}}></div>
              <span className="text-sm text-text">Paused</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { Contributions, type IContributionsProps };