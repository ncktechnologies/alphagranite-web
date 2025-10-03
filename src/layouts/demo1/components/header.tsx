import { useEffect, useState } from 'react';
// import { StoreClientTopbar } from '@/pages/store-client/components/common/topbar';
import { SearchDialog } from '@/partials/dialogs/search/search-dialog';
import { AppsDropdownMenu } from '@/partials/topbar/apps-dropdown-menu';
import { ChatSheet } from '@/partials/topbar/chat-sheet';
import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import {
  Bell,
  LayoutGrid,
  Menu,
  MessageCircleMore,
  Search,
  SquareChevronRight,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import { getInitials, toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Container } from '@/components/common/container';
import { Breadcrumb } from './breadcrumb';
import { MegaMenu } from './mega-menu';
import { MegaMenuMobile } from './mega-menu-mobile';
import { SidebarMenu } from './sidebar-menu';
// import { Avatar } from '@/common/avatar/Avatar';
import { useSelector } from 'react-redux';
import { AvatarSingle } from '@/partials/common/avatar-single';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const [isMegaMenuSheetOpen, setIsMegaMenuSheetOpen] = useState(false);
  const user = useSelector((state: any) => state.user.user);
  const name = getInitials(`${user?.first_name} ${user?.last_name}`)
  const { pathname } = useLocation();
  const mobileMode = useIsMobile();

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  // Close sheet when route changes
  useEffect(() => {
    setIsSidebarSheetOpen(false);
    setIsMegaMenuSheetOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-border',
      )}
    >
      <Container className="flex justify-between items-stretch lg:gap-4">
        {/* HeaderLogo */}
        <div className="flex gap-1 lg:hidden items-center gap-2.5">
          <Link to="/" className="shrink-0">
            <img
              src={toAbsoluteUrl('/images/logo.svg')}
              className="h-[25px] w-full"
              alt="mini-logo"
            />
          </Link>
          <div className="flex items-center ">
            {mobileMode && (
              <Sheet
                open={isSidebarSheetOpen}
                onOpenChange={setIsSidebarSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <Menu className="text-muted-foreground" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px] bg-primary "
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto bg-primary">
                    <SidebarMenu />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )}
            {/* {mobileMode && (
              <Sheet
                open={isMegaMenuSheetOpen}
                onOpenChange={setIsMegaMenuSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <SquareChevronRight className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px]"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
                    <MegaMenuMobile />
                  </SheetBody>
                </SheetContent>
              </Sheet>
            )} */}
          </div>
        </div>

        {/* Main Content (MegaMenu or Breadcrumbs) */}
        {pathname.startsWith('/account') ? (
          <Breadcrumb />
        ) : (
          !mobileMode && <MegaMenu />
        )}

        {/* HeaderTopbar */}
        <div className="flex items-center gap-3">
          {pathname.startsWith('/store-client') ? (
            // <StoreClientTopbar />
            <div></div>
          ) : (
            <>



              <UserDropdownMenu
                trigger={
                  // <img
                  //   className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer"
                  //   src={toAbsoluteUrl('/media/avatars/300-2.png')}
                  //   alt="User Avatar"
                  // />
                  // <Avatar size={40} name={`${user?.first_name} ${user?.first_name}`} />
                  // <span className="text-white font-bold uppercase bg-primary ">{`${user?.first_name} ${user?.first_name}`}</span>
                  <Button>
                    <AvatarSingle
                      // className='size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer'
                      image={user?.image}
                      // imageClass={avatar?.imageClass}
                      fallback={name}
                    // badgeClass={avatar?.badgeClass}
                    />
                  </Button>
                }
              />
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
