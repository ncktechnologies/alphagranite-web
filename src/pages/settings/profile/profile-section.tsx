import { Fragment, useState } from 'react';
import { UserHero } from '@/partials/common/user-hero';
import { DropdownMenu9 } from '@/partials/dropdown-menu/dropdown-menu-9';
import { Navbar, NavbarActions } from '@/partials/navbar/navbar';
import {
  EllipsisVertical,
  Mail,
  MapPin,
  MessagesSquare,
  Users,
  Zap,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { Breadcrumb } from '@/layouts/demo1/components/breadcrumb';
import { Card } from '@/components/ui/card';
import { ViewMode } from '@/config/types';

const ProfileSection = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('details');
  const image = (
    <img
      src={toAbsoluteUrl('/images/app/300-2.png')}
      className="rounded-full  size-[100px] shrink-0"
      alt="image"
    />
  );
  const contactInfo = [
    {
      label: 'Home address',
      value: '1901 Thornridge Cir. Shiloh, Hawaii 81063',
    },
    {
      label: 'Personal email address',
      value: 'badmusedward@alphagranite.com',
    },
    {
      label: 'Phone number',
      value: '(239) 555-0108',
    },
   
  ];
  return (
    <Fragment>
      <PageMenu />

      <Container >
        <Card className='p-6 space-y-6 border-none shadow w-full max-w-4xl'>
        <Navbar>
          <NavbarActions>
            <div className='flex items-center justify-between w-full'>
              <h1 className='text-black font-semibold text-lg'>Personal information</h1>
              <Button>
                Edit Profile
              </Button>
            </div>


          </NavbarActions>
        </Navbar>
        <UserHero
          name="Badmus Edward"
          image={image}
          username='@edward'
          role='Sales department'
          info={[]}
        />
        {/* contact info */}
        {/* <div className=' grid grid-cols-2 gap-2  '></div> */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-4 text-text ">
            {contactInfo.map((item, idx) => (
              <div key={idx} className="flex flex-col space-y-1">
                <span className="text-xs uppercase text-[#9094A4]">{item.label}</span>
                <div className=" font-semibold">
                  <span>{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </Fragment>
  );
};

export { ProfileSection };