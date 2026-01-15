import { Fragment, useState } from 'react';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { addDays, format } from 'date-fns';
import { CalendarDays, Plus } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Container } from '@/components/common/container';
import { Demo1LightSidebarContent } from './';
import { RoleBasedDashboard } from './RoleBasedDashboard';
import { useIsSuperAdmin } from '@/hooks/use-permission';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router';
import { Can } from '@/components/permission';
export function Demo1LightSidebarPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 0, 20),
    to: addDays(new Date(2025, 0, 20), 20),
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    date,
  );
  const [timePeriod, setTimePeriod] = useState('all');
  const isSuperAdmin = useIsSuperAdmin();

  const handleDateRangeApply = () => {
    setDate(tempDateRange); // Save the temporary date range to the main state
    setIsOpen(false); // Close the popover
  };

  const handleDateRangeReset = () => {
    setTempDateRange(undefined); // Reset the temporary date range
  };

  const handleTimePeriodChange = (newTimePeriod: string) => {
    setTimePeriod(newTimePeriod);
  };

  const defaultStartDate = new Date(); // Default start date fallback
  const isUserSuperAdmin = useIsSuperAdmin();

  return (
    <Fragment>
      <Container>
        {isUserSuperAdmin ?
          <Toolbar>
            <ToolbarHeading
              title="Dashboard"
            // description="Central Hub for Personal Customization"
            />
            <ToolbarActions>
              <Select value={timePeriod} onValueChange={handleTimePeriodChange}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-32">
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </ToolbarActions>
          </Toolbar>
          :
          <Toolbar className=' '>
            <ToolbarHeading title="Dashboard" description="" />
            <ToolbarActions>
              <Can action="create" on="FAB IDs">
                <Link to="/jobs/sales/new-fab-id">
                  <Button className="">
                    <Plus />
                    New FAB ID
                  </Button>
                </Link>
              </Can>

            </ToolbarActions>
          </Toolbar>
        }
      </Container>
      <Container>
        {/* Super admins see the full admin dashboard, regular users see role-based dashboard */}
        {isSuperAdmin ? 
          <Demo1LightSidebarContent timePeriod={timePeriod} /> 
          : 
          <RoleBasedDashboard />
        }
      </Container>
    </Fragment>
  );
}
