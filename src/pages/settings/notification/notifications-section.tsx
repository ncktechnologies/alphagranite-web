// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Fragment } from 'react';
// import { PageMenu } from '../page-menu';
// import { Container } from '@/components/common/container';

// const NotificationsSection = () => {
//   return (
//     <Fragment>
//       <PageMenu />

//       <Container>
//         <Card>
//           <CardHeader>
//             <CardTitle>Notification Settings</CardTitle>
//           </CardHeader>
//           <CardContent>
//           </CardContent>
//         </Card>
//       </Container>
//     </Fragment>
//   );
// };

// export { NotificationsSection };

import { Fragment, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/common/container';
import { PageMenu } from '../page-menu';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Briefcase, FileText, FileCheck2, FileWarning, Bell } from 'lucide-react';
import { RiBriefcaseLine, RiCheckboxCircleFill, RiCheckboxCircleLine, RiPenNibLine } from '@remixicon/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox';


const getNotificationIcon = (notification: any) => {
  const { type = '', tag = '', title = '' } = notification;
  const normalized = (type || tag || title).toLowerCase();

  if (normalized.includes('job')) return <div className='bg-[#7A9705] p-[10px] rounded-[8px]'><RiBriefcaseLine className="size-[18px] font-semibold text-white" /></div>;
  if (normalized.includes('approval')) return <div className='bg-[#16A34A] p-[10px] rounded-[8px]'><RiCheckboxCircleFill className="size-[18px] font-semibold text-white" /></div>;
  if (normalized.includes('draft')) return <div className='bg-text-foreground p-[10px] rounded-[8px]'><RiPenNibLine className="size-[18px] font-semibold text-white" /></div>;
  if (normalized.includes('revision')) return <div className='bg-[] p-[10px] rounded-[8px]'><FileWarning className="size-[18px] font-semibold text-white " /></div>;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
};

type Notification = {
  id: number;
  type?: string;
  title?: string;
  description?: string;
  date?: string;
  tag?: string;
  read?: boolean;
};

const FilteredData = ({ data }: { data: Notification[] }) => {
  return (
    <div className="space-y-6 ">
      {data.map((n) => (
        <Card
          key={n.id}
          className="flex flex-col p-3"
        >
          <div className="flex gap-5 items-start">
            {getNotificationIcon(n)}
            <div>


              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-[24px] py-0.5 px-[10px] leading-[24px] text-xs font-medium',
                      n.tag === 'JOB' && 'bg-[#7A9705] text-white',
                      n.tag === 'APPROVED' && 'bg-[#16A34A] text-white',
                      n.tag === 'DRAFT' && 'bg-text-foreground text-white',
                    )}
                  >
                    {n.tag}
                  </Badge>
                  <span className="text-xs text-text-foreground">
                    {n.date}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-sm leading-[20x] text-text font-semibold">{n.title}</h3>
                <p className="text-sm leading-[20x] text-text-foreground mt-1">
                  {n.description}
                </p>
              </div>

              <div className="flex items-center gap-4 mt-5">
                <Button
                  variant="link"
                  className="p-0 text-[#7A9705] text-sm font-semibold"
                >
                  View details
                </Button>
                <div className='flex items-center gap-1'>
                  <Checkbox className='border-text-foreground border-3' />
                  <Button
                    variant="link"
                    className="p-0 text-secondary text-sm"
                  >
                    Mark as Read
                  </Button>
                </div>

              </div>
            </div>
          </div>

        </Card>
      ))}
    </div>
  )
}

const NotificationsSection = () => {
  const [preferences, setPreferences] = useState({
    jobAssignment: true,
    revisionRequests: false,
    approvals: true,
    draftSubmission: true,
  });

  const notifications = [
    {
      id: 1,
      type: 'Job',
      title: 'New Fab ID Assigned',
      description:
        'You’ve been assigned as drafter for this fabrication job. Kitchen countertop project for residential client.',
      date: '21 January, 2024 09:15 AM',
      tag: 'JOB',
      read: true

    },
    {
      id: 2,
      type: 'Approval',
      title: 'Draft Approved',
      description:
        'Client has approved the draft design. Job is ready to proceed to cut list generation phase.',
      date: '21 January, 2024 09:15 AM',
      tag: 'APPROVED',
      read: false

    },
    {
      id: 3,
      type: 'Draft',
      title: 'Draft Revision',
      description:
        'Client requested revisions on the previous draft design for project phase two.',
      date: '21 January, 2024 09:15 AM',
      tag: 'DRAFT',
      read: true
    },
  ];

  const [tab, setTab] = useState('all')

  const all = notifications
  const unread = notifications.filter((d) => !d.read)
  const job = notifications.filter((d) => d.type === 'Job')
  const draft = notifications.filter((d) => d.type === 'Drafting')
  const approval = notifications.filter((d) => d.type === 'Approval')



  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };


  return (
    <Fragment>
      <PageMenu />

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pb-10 ">
          {/* LEFT: Notifications List */}
          <div className="lg:col-span-2 w-full space-y-4">
            <Tabs value={tab} onValueChange={setTab} className="w-full" >
              <TabsList className="gap-8 px-5 mb-2.5 border rounded-[8px] " variant="line">
                <TabsTrigger value="all" className='p-4'>All</TabsTrigger>
                <TabsTrigger value="unread" className='p-4'>
                  Unread ({unread.length}) |
                </TabsTrigger>
                <TabsTrigger value="job" className='p-4'><RiBriefcaseLine className="h-4 w-4 text-lime-600" /> Job Updates</TabsTrigger>
                <TabsTrigger value="drafts" className='p-4'><RiPenNibLine className="h-4 w-4 text-lime-600" /> Drafts</TabsTrigger>
                <TabsTrigger value="approvals" className='p-4'>
                  <RiCheckboxCircleLine className="h-4 w-4 text-lime-600" />
                  Approvals
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <FilteredData data={all} />
              </TabsContent>

              <TabsContent value="unread">
                <FilteredData data={unread} />
              </TabsContent>

              <TabsContent value="job">
                <FilteredData data={job} />
              </TabsContent>

              <TabsContent value="draft">
                <FilteredData data={draft} />
              </TabsContent>
              <TabsContent value="approval">
                <FilteredData data={approval} />
              </TabsContent>
            </Tabs>


          </div>

          {/* RIGHT: Preferences */}
          <Card className=" border-none shadow h-screen bg-[#FBFDF4] w-full max-w-[350px]">

            <CardHeader className='border-b p-3 flex-col justify-center'>
              <CardTitle className='text-[#111827] leading-[28px] text-lg  font-bold'>Notification Preferences</CardTitle>
              <p className="text-sm leading-[20px] text-[#4B5563]">
                Customize which alerts you receive
              </p>
            </CardHeader>

            <CardContent className="space-y-12 text-sm text-muted-foreground">
              <div className="flex items-center justify-between ">
                <p className='flex flex-col max-w-[147px]'>
                  <span className='text-[#111827] leading-[20px] text-base font-semibold'>Job Assignment Alerts</span>

                  <span className="text-sm leading-[20px] font-normal text-[#4B5563] pt-2">
                    New jobs assigned to you
                  </span>
                </p>
                <Switch
                  checked={preferences.jobAssignment}
                  onCheckedChange={() => handleToggle('jobAssignment')}
                  size='lg'
                  className=''
                />
              </div>
              <div className="flex items-center justify-between">
                <p className='flex flex-col max-w-[147px]'>
                  <span className='text-[#111827] leading-[20px] text-base font-semibold'>Revision Requests</span>

                  <span className="text-sm leading-[20px] pt-2 font-normal text-[#4B5563]">
                    Client revision requests
                  </span>
                </p>
                <Switch
                  checked={preferences.revisionRequests}
                  onCheckedChange={() => handleToggle('revisionRequests')}
                  size='lg'
                 className=''
                />
              </div>
              <div className="flex items-center justify-between">
                <p className='flex flex-col max-w-[147px] '>
                  <span className='text-[#111827] leading-[20px] text-base font-semibold'>Approvals Alerts</span>

                  <span className="text-sm leading-[20px] pt-2 font-normal text-[#4B5563]">
                    Approval status and deadline warnings
                  </span>
                </p>
                <Switch
                  checked={preferences.approvals}
                  onCheckedChange={() => handleToggle('approvals')}
                  size='lg'
                
                />
              </div>
              <div className="flex items-center justify-between">
                <p className='flex flex-col max-w-[147px] '>
                  <span className='text-[#111827] leading-[20px] text-base font-semibold'>Draft Submission Alerts</span>

                  <span className="text-sm leading-[20px] pt-2 font-normal text-[#4B5563]">
                    Draft deadlines and submissions
                  </span>
                </p>
                <Switch
                  checked={preferences.draftSubmission}
                  onCheckedChange={() => handleToggle('draftSubmission')}
                  size='lg'
                
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Container>
    </Fragment>
  );
};

export { NotificationsSection };
