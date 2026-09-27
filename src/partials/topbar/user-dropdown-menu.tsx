import { ReactNode } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { I18N_LANGUAGES } from '@/i18n/config';
import { Language } from '@/i18n/types';
import {
  BetweenHorizontalStart,
  Coffee,
  CreditCard,
  FileText,
  Globe,
  IdCard,
  Keyboard,
  LogOut,
  Moon,
  Rows3,
  Settings,
  Shield,
  SquareCode,
  UserCircle,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link, useNavigate } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useLanguage } from '@/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { logout } from "@/store/slice";
import { useDispatch, useSelector } from "react-redux";
import { getUserInitials } from '@/utils/userUtils';
import { useUiPreferences, type Density } from '@/hooks/use-ui-preferences';
import { openShortcuts } from '@/lib/keyboard';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  // const { logout, user } = useAuth();
  const user = useSelector((state: any) => state.user.user);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currenLanguage, changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useUiPreferences();

  // Use display data from currentUser
  const displayName =
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User');

  const displayEmail = user?.email || '';
  const displayAvatar = user?.profile_image_url || toAbsoluteUrl('/media/avatars/300-2.png');
  // const displayAvatar = toAbsoluteUrl('/media/avatars/300-2.png');

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang);
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const logOut = () => {
    dispatch(logout());
    navigate("/auth/signin");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" side="bottom" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/70 p-3 mb-1">
          {user?.profile_image_url ? (
            <img
              src={user.profile_image_url}
              alt={displayName}
              className="size-10 rounded-full object-cover ring-2 ring-primary-light/50 ring-offset-2 ring-offset-muted shrink-0"
            />
          ) : (
            <div className="size-10 rounded-full shrink-0 flex items-center justify-center bg-primary-soft text-primary-accent font-semibold ring-2 ring-primary-light/50 ring-offset-2 ring-offset-muted">
              {getUserInitials(user)}
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{displayEmail}</span>
            {user?.role && (
              <Badge variant="primary" appearance="light" size="sm" className="mt-1.5 self-start">
                {user.role}
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem asChild>
          {/* <Link
            to="/church-profile"
            className="flex items-center gap-2"
          >
            <IdCard />
            Church Profile
          </Link> */}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/settings/profile"
            className="flex items-center gap-2"
          >
            <UserCircle />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2" onSelect={() => openShortcuts()}>
          <Keyboard />
          Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>

        {/* Table density */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Rows3 />
            Table density
            <span className="ms-auto text-xs capitalize text-muted-foreground">{density}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as Density)}>
              <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* My Account Submenu */}
        {/* <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Settings />
            My Account
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem asChild>
              <Link
                to="/account/home/get-started"
                className="flex items-center gap-2"
              >
                <Coffee />
                Get Started
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/home/user-profile"
                className="flex items-center gap-2"
              >
                <FileText />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/billing/basic"
                className="flex items-center gap-2"
              >
                <CreditCard />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/security/overview"
                className="flex items-center gap-2"
              >
                <Shield />
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/members/teams"
                className="flex items-center gap-2"
              >
                <Users />
                Members & Roles
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/account/integrations"
                className="flex items-center gap-2"
              >
                <BetweenHorizontalStart />
                Integrations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub> */}

        {/* <DropdownMenuItem asChild>
          <Link
            to="https://devs.keenthemes.com"
            className="flex items-center gap-2"
          >
            <SquareCode />
            Dev Forum
          </Link>
        </DropdownMenuItem> */}

        {/* Language Submenu with Radio Group */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Globe />
            {currenLanguage.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={currenLanguage.code}
              onValueChange={(code) => {
                const selectedLang = I18N_LANGUAGES.find(lang => lang.code === code);
                if (selectedLang) handleLanguage(selectedLang);
              }}
            >
              {I18N_LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem
                  key={lang.code}
                  value={lang.code}
                  className="flex items-center gap-2"
                >
                  <img src={lang.flag} alt={lang.label} className="w-4 h-4" />
                  {lang.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Footer */}
        {/* <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/5"
          onSelect={() => logOut()}
        >
          <LogOut className="text-destructive" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}