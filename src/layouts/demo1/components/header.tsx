import { useEffect, useState } from 'react';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { ChevronDown, Keyboard, Menu, Search } from 'lucide-react';
import { useLocation } from 'react-router';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toAbsoluteUrl } from '@/lib/helpers';
import { MOD_KEY, openCommandPalette, openShortcuts } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { getUserInitials } from '@/utils/userUtils';
import { TemplaterTimerWidget } from '@/pages/templater/TemplaterTimerWidget';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Container } from '@/components/common/container';
import { Breadcrumb } from './breadcrumb';
import { SIDEBAR_GRADIENT } from './sidebar';
import { SidebarMenu } from './sidebar-menu';

export function Header() {
  const [isSidebarSheetOpen, setIsSidebarSheetOpen] = useState(false);

  const { pathname } = useLocation();
  const mobileMode = useIsMobile();

  const user = useSelector((state: any) => state.user.user);
  const displayName =
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User');
  const roleLabel = user?.role || user?.roles?.[0]?.name;

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  // Close sheet when route changes
  useEffect(() => {
    setIsSidebarSheetOpen(false);
  }, [pathname]);

  const avatar = user?.profile_image_url ? (
    <img
      src={user.profile_image_url}
      alt={displayName}
      className="size-9 rounded-full object-cover ring-2 ring-primary-light/50 ring-offset-2 ring-offset-background shrink-0"
    />
  ) : (
    <span className="size-9 rounded-full shrink-0 flex items-center justify-center bg-primary-soft text-primary-accent text-sm font-semibold ring-2 ring-primary-light/50 ring-offset-2 ring-offset-background">
      {getUserInitials(user)}
    </span>
  );

  const triggerNode = (
    <button
      type="button"
      className="flex items-center gap-2.5 rounded-full p-0.5 xl:pe-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Account menu"
    >
      {avatar}
      <span className="hidden xl:flex flex-col items-start leading-tight max-w-[160px]">
        <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
        {roleLabel && <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>}
      </span>
      <ChevronDown className="hidden xl:block size-3.5 text-muted-foreground" />
    </button>
  );

  return (
    <header
      className={cn(
        'header fixed top-0 z-20 start-0 end-0 flex items-stretch shrink-0 border-b bg-background/75 backdrop-blur-xl backdrop-saturate-150 pe-[var(--removed-body-scroll-bar-size,0px)] transition-[border-color,box-shadow]',
        headerSticky ? 'border-border shadow-[0_1px_12px_-6px_rgb(20_28_12/0.12)]' : 'border-transparent',
      )}
    >
      <Container className="flex items-center justify-between gap-3">
        {/* Left: mobile brand + menu, desktop breadcrumbs */}
        <div className="flex min-w-0 items-center gap-2">
          {mobileMode && (
            <Sheet open={isSidebarSheetOpen} onOpenChange={setIsSidebarSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" mode="icon" aria-label="Open navigation">
                  <Menu className="size-5! text-foreground/70" />
                </Button>
              </SheetTrigger>
              <SheetContent
                className={cn('p-0 gap-0 w-[280px] border-0 text-white', SIDEBAR_GRADIENT)}
                side="left"
                close={false}
              >
                <SheetHeader className="p-0 space-y-0">
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <div className="flex h-16 items-center border-b border-white/10 px-5">
                    <img
                      src={toAbsoluteUrl('/images/logo/ody/white-odyssey-logo.png')}
                      className="h-[56px] w-auto -ms-2"
                      alt="The Odyssey Tracker"
                    />
                  </div>
                </SheetHeader>
                <SheetBody className="p-0 overflow-y-auto">
                  <SidebarMenu />
                </SheetBody>
              </SheetContent>
            </Sheet>
          )}
          {mobileMode ? (
            <Link to="/" className="shrink-0" aria-label="The Odyssey Tracker — Dashboard">
              <img
                src={toAbsoluteUrl('/images/logo/mini-logo.png')}
                className="h-8 w-auto sm:hidden"
                alt="The Odyssey Tracker"
              />
              <img
                src={toAbsoluteUrl('/images/logo/ody-logo.png')}
                className="hidden sm:block h-[44px] w-auto"
                alt="The Odyssey Tracker"
              />
            </Link>
          ) : (
            <Breadcrumb />
          )}
        </div>

        {/* Right: search, live widgets, help, account */}
        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={openCommandPalette}
            className="group hidden md:flex h-9 w-[240px] lg:w-[300px] items-center gap-2 rounded-lg border border-input bg-muted/70 ps-3 pe-1.5 text-sm text-muted-foreground transition-colors hover:border-[#CDD2C6] hover:bg-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
          >
            <Search className="size-4" />
            <span className="truncate">Search or jump to…</span>
            <Kbd size="xs" className="ms-auto bg-background font-sans text-muted-foreground">
              {MOD_KEY} K
            </Kbd>
          </button>
          <Button
            variant="ghost"
            mode="icon"
            className="md:hidden"
            onClick={openCommandPalette}
            aria-label="Search"
          >
            <Search className="size-[18px]!" />
          </Button>

          <TemplaterTimerWidget />

          {!mobileMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  mode="icon"
                  shape="circle"
                  onClick={openShortcuts}
                  aria-label="Keyboard shortcuts"
                  className="size-9"
                >
                  <Keyboard className="size-[18px]! text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
            </Tooltip>
          )}

          <span className="hidden lg:block h-6 w-px bg-border" aria-hidden />

          <UserDropdownMenu trigger={triggerNode} />
        </div>
      </Container>
    </header>
  );
}
