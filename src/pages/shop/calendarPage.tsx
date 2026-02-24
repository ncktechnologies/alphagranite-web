import React from 'react';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { ShopCalendar } from './components/shopCalendar';
import ShopCalendarPages from './components/calendar';

const ShopCalendarPage = () => {
  return (
    <div>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Shop Calendar"
            description="View and manage shop events and schedules"
          />
          <ToolbarActions>
            <Link to="/shop">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Shop
              </Button>
            </Link>
          </ToolbarActions>
        </Toolbar>

        <div className="mt-6">
          {/* <ShopCalendar /> */}
            <ShopCalendarPages />
        </div>
      </Container>
    </div>
  );
};

export default ShopCalendarPage;
