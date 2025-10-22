import { Fragment, useState } from 'react';
import { UserHero } from '@/partials/common/user-hero';
import { Navbar, NavbarActions } from '@/partials/navbar/navbar';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { Card } from '@/components/ui/card';
import { toAbsoluteUrl } from '@/lib/helpers';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ViewMode } from '@/config/types';
import { ProfileFormSection } from './profileForm';

const ProfileSection = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [success, setSuccess] = useState(false);

  const image = (
    <img
      src={toAbsoluteUrl('/images/app/300-2.png')}
      className="rounded-full size-[100px] shrink-0"
      alt="image"
    />
  );

  const handleSave = (data: any) => {
    console.log('Updated profile data:', data);
    setSuccess(true);
    setViewMode('details');
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <Fragment>
      <PageMenu />
      <Container>
        {viewMode === 'details' ? (
          <Card className="p-6 space-y-6 border-none shadow w-full max-w-4xl">
            <Navbar>
              <NavbarActions>
                <div className="flex items-center justify-between w-full">
                  <h1 className="text-black font-semibold text-lg">Personal Information</h1>
                  {viewMode === 'details' ? (
                    <Button onClick={() => setViewMode('edit')}>Edit Profile</Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setViewMode('details')}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" form="profile-edit-form">
                        Save changes
                      </Button>
                    </div>
                  )}
                </div>
              </NavbarActions>
            </Navbar>

            <UserHero
              name="Badmus Edward"
              image={image}
              username="@edward"
              role="Sales Department"
              info={[]}
            />


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-4 text-text">
              {[
                { label: 'Home address', value: '1901 Thornridge Cir. Shiloh, Hawaii 81063' },
                { label: 'Personal email address', value: 'badmusedward@alphagranite.com' },
                { label: 'Phone number', value: '(239) 555-0108' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col space-y-1">
                  <span className="text-xs uppercase text-[#9094A4]">{item.label}</span>
                  <div className="font-semibold">{item.value}</div>
                </div>
              ))}
            </div>


            {/* {success && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-3">
              <CheckCircle2 className="size-4" />
              Profile updated successfully!
            </div>
          )} */}
          </Card>
        ) : (
            <ProfileFormSection onSave={handleSave} onCancel={() => setViewMode('details')} />
        )}
      </Container>
    </Fragment>
  );
};

export { ProfileSection };
