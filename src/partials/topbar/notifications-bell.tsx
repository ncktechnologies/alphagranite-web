import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  AppNotification,
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/store/api/notification';

// How often the bell checks for new alerts (silently; no sound by design).
const POLL_MS = 30_000;

// Where each alert takes the recipient.
function linkFor(notification: AppNotification): string | null {
  const fabId = notification.fab_id;
  if (!fabId) return null;
  switch (notification.event) {
    case 'draft_submitted':
    case 'sales_revision_completed':
    case 'slabsmith_completed':
      return `/job/draft-review/${fabId}`;
    case 'sales_revision_requested':
      return `/job/revision/${fabId}`;
    case 'shop_revision_requested':
      return `/revision/${fabId}`;
    default:
      return `/shop/fab/${fabId}`;
  }
}

function NotificationList({
  items,
  isLoading,
  emptyText,
  onOpen,
}: {
  items: AppNotification[];
  isLoading: boolean;
  emptyText: string;
  onOpen: (notification: AppNotification) => void;
}) {
  if (isLoading) return <p className="p-5 text-sm text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="p-5 text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((notification) => (
        <li key={notification.id}>
          <button
            type="button"
            onClick={() => onOpen(notification)}
            className={cn(
              'w-full text-left px-5 py-3 hover:bg-muted/60 transition-colors',
              !notification.is_read && 'bg-primary/5',
            )}
          >
            <div className="flex items-start gap-2">
              {!notification.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{notification.message}</p>
                {notification.created_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'unread' | 'all'>('unread');

  const { data: countData } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: POLL_MS,
    refetchOnFocus: true,
  });
  const { data: listData, isFetching } = useGetNotificationsQuery({ status: tab }, { skip: !open });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isClearing }] = useMarkAllNotificationsReadMutation();

  const unread = countData?.data?.count ?? 0;
  const items = listData?.data?.items ?? [];

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.is_read) {
      try {
        await markRead(notification.id).unwrap();
      } catch {
        // Navigation still matters more than the read flag.
      }
    }
    const link = linkFor(notification);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" mode="icon" shape="circle" className="relative size-9" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="size-[18px]! text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold leading-4 text-white text-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="p-0 gap-0 sm:w-[440px] sm:max-w-none inset-5 start-auto h-auto rounded-lg">
        <SheetHeader className="mb-0 border-b border-border">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>
        <SheetBody className="grow p-0">
          <Tabs value={tab} onValueChange={(value) => setTab(value as 'unread' | 'all')}>
            <TabsList variant="line" className="px-5">
              <TabsTrigger value="unread">Unread{unread > 0 ? ` (${unread})` : ''}</TabsTrigger>
              <TabsTrigger value="all">History</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <TabsContent value="unread">
                <NotificationList items={items} isLoading={isFetching && !listData} emptyText="You're all caught up." onOpen={handleOpen} />
              </TabsContent>
              <TabsContent value="all">
                <NotificationList items={items} isLoading={isFetching && !listData} emptyText="No notifications yet." onOpen={handleOpen} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetBody>
        <SheetFooter className="border-t border-border p-4">
          {/* Clears the tray; everything stays under History. */}
          <Button variant="outline" className="w-full" disabled={unread === 0 || isClearing} onClick={() => markAllRead()}>
            Mark all as read
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
