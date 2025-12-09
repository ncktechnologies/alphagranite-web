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
import { toAbsoluteUrl } from '@/lib/helpers';
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
import { Input } from '@/components/ui/input';
import { useSelector } from 'react-redux';
import { getUserInitials } from '@/utils/userUtils';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);
  const [isMegaMenuSheetOpen, setIsMegaMenuSheetOpen] = useState(false);

  const { pathname } = useLocation();
  const mobileMode = useIsMobile();
  
  // Get user data from Redux store
  const user = useSelector((state: any) => state.user.user);

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
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-border bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-[#E2E4ED]',
      )}
    >
      <Container className="flex justify-between items-stretch lg:gap-4">
        {/* HeaderLogo */}
        <div className="flex gap-1 lg:hidden items-center">
          <Link to="/" className="shrink-0">
            <img
              src={toAbsoluteUrl('/images/logo/alpha-logo.svg')}
              className="h-[25px] w-full"
              alt="mini-logo"
            />
          </Link>
          <div className="flex items-center">
            {mobileMode && (
              <Sheet
                open={isSidebarSheetOpen}
                onOpenChange={setIsSidebarSheetOpen}
                
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" mode="icon">
                    <Menu className="text-muted-foreground/70" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="p-0 gap-0 w-[275px] bg-primary"
                  side="left"
                  close={false}
                >
                  <SheetHeader className="p-0 space-y-0" />
                  <SheetBody className="p-0 overflow-y-auto">
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
          !mobileMode && <div></div>
        )}

        {/* HeaderTopbar */}
        <div className="flex items-center gap-3">
          {pathname.startsWith('/store-client') ? (
            // <StoreClientTopbar />
            <div></div>
          ) : (
            <>
              {/* {!mobileMode && (
                <div className="pt-2.5 px-3.5 mb-1">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 start-3.5 -translate-y-1/2 size-4" />
                    <Input
                      placeholder="Search for anything"
                      onChange={() => {}}
                      className="px-9 min-w-0 h-10 w-[250px] border border-[#E9ECEC]  focus:border-primary focus:ring-0"
                      value=""
                    />
                    <div className="border border-[#F9F9F9] absolute p-2 rounded-md end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <img src="/images/icons/c.svg" alt="" />
                      <img src="/images/icons/k.svg" alt="" />

                    </div>
                  </div>
                </div>
              )} */}
              {/* <NotificationsSheet
                trigger={ */}
                  {/* <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 border-foreground hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <Bell className="size-5!" />
                  </Button> */}
                {/* }
              /> */}
              {/* <ChatSheet
                trigger={
                  <Button
                    variant="ghost"
                    mode="icon"
                    shape="circle"
                    className="size-9 border-foreground hover:bg-primary/10 hover:[&_svg]:text-primary"
                  >
                    <img src="/images/icons/messages.svg" alt="" />
                  </Button>
                }
              /> */}
              <UserDropdownMenu
                trigger={
                  <div className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer flex items-center justify-center bg-green-100 text-green-800 font-semibold">
                    {getUserInitials(user)}
                  </div>
                }
              />
            </>
          )}
        </div>
      </Container>
    </header>
  );
}