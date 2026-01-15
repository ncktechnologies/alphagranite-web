import { DropdownMenu7 } from '@/partials/dropdown-menu/dropdown-menu-7';
import { ApexOptions } from 'apexcharts';
import { EllipsisVertical } from 'lucide-react';
import ApexChart from 'react-apexcharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverallStatistics } from '@/store/api/job';

interface IContributionsProps {
  title: string;
  overallStats?: OverallStatistics;
}

const Contributions = ({ title, overallStats }: IContributionsProps) => {
  // Only use backend data - no fallback values
  if (!overallStats) {
    return (
      <Card className="p-2 h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-[20px] leading-[24px]">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-1 py-2">
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">No statistics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use the actual data from backend
  // Handle zero values properly - show empty chart when all data is 0
  const hasData = overallStats.completed > 0 || overallStats.in_progress > 0 || overallStats.paused > 0;
  const data: number[] = hasData ? 
    [overallStats.completed, overallStats.in_progress, overallStats.paused] : 
    [0, 0, 0];
  
  // Verify data integrity - total should equal sum of parts
  const calculatedTotal = overallStats.completed + overallStats.in_progress + overallStats.paused;
  const dataMismatch = calculatedTotal !== overallStats.total;
  
  // Log warning if there's a mismatch (for debugging purposes)
  if (dataMismatch) {
    console.warn('Data mismatch in OverallStatistics:', {
      calculatedTotal,
      reportedTotal: overallStats.total,
      completed: overallStats.completed,
      in_progress: overallStats.in_progress,
      paused: overallStats.paused
    });
  }
  const labels: string[] = ['Completed', 'In Progress', 'Paused'];
  const colors: string[] = ['#9CC15E', '#51BCF4', '#EA3DB1'];

  // Updated for larger chart - increased radius and center
  const getLabelPosition = (index: number, radius: number = 120) => {
    const total = data.reduce((sum, value) => sum + value, 0);
    
    // Handle zero data case - position labels at center
    if (total === 0) {
      return { x: 120, y: 120 }; // Center position
    }
    
    let cumulativeAngle = -90;
    
    for (let i = 0; i < index; i++) {
      cumulativeAngle += (data[i] / total) * 360;
    }
    
    const currentSegmentAngle = (data[index] / total) * 360;
    const labelAngle = cumulativeAngle + (currentSegmentAngle / 2);
    
    const angleInRadians = (labelAngle * Math.PI) / 180;
    
    const x = Math.cos(angleInRadians) * radius;
    const y = Math.sin(angleInRadians) * radius;
    
    return { x: x + 120, y: y + 120 }; // Updated center to 150 for 300x300 chart
  };


  
  const options: ApexOptions = {
    series: data,
    labels: labels,
    colors: colors,
    // Force colors and ensure they're visible
    fill: {
      colors: colors,
      opacity: 1
    },
    // Make sure strokes don't interfere
    stroke: {
      show: false,
      width: 0,
      colors: ['transparent']
    },
    chart: {
      type: 'donut',
      toolbar: { show: false },
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '60%',
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
              width="243"  
              height="243" 
            />
            
            {/* Custom center circle with shadow - increased size */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white rounded-full shadow-lg flex items-center justify-center" 
                   style={{width: '112px', height: '112px'}}>
                <span className="text-xl font-bold text-gray-800">
                  {overallStats.total > 0 ? '100%' : '0%'}
                </span>
              </div>
            </div>

            {/* Custom percentage labels positioned at segment centers - updated for larger chart */}
            {/* Show labels for non-zero values, hide when total is 0 */}
            {overallStats.total > 0 && (
              <>
                {/* Completed label - show if value > 0 */}
                {overallStats.completed > 0 && (
                  <div 
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${getLabelPosition(0).x}px`,
                      top: `${getLabelPosition(0).y}px`
                    }}
                  >
                    <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                      {Math.round((overallStats.completed / overallStats.total) * 100)}%
                      {dataMismatch && overallStats.completion_percentage !== undefined && 
                        ` (${Math.round(overallStats.completion_percentage)}%)`}
                    </div>
                  </div>
                )}
                
                {/* In Progress label - show if value > 0 */}
                {overallStats.in_progress > 0 && (
                  <div 
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${getLabelPosition(1).x}px`,
                      top: `${getLabelPosition(1).y}px`
                    }}
                  >
                    <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                      {Math.round((overallStats.in_progress / overallStats.total) * 100)}%
                    </div>
                  </div>
                )}
                
                {/* Paused label - show if value > 0 */}
                {overallStats.paused > 0 && (
                  <div 
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${getLabelPosition(2).x}px`,
                      top: `${getLabelPosition(2).y}px`
                    }}
                  >
                    <div className="bg-white text-text rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap shadow-sm">
                      {Math.round((overallStats.paused / overallStats.total) * 100)}%
                    </div>
                  </div>
                )}
              </>
            )}
            

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