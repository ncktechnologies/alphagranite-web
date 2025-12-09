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
  Moon,
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
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { logout } from "@/store/slice";
import { useDispatch, useSelector } from "react-redux";
import { getUserInitials } from '@/utils/userUtils';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  // const { logout, user } = useAuth();
  const user = useSelector((state: any) => state.user.user);
 
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currenLanguage, changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  // Use display data from currentUser
  const displayName =
    user?.fullname ||
    (user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || 'User');

  const displayEmail = user?.email || '';
  const displayAvatar = user?.profile_picture || toAbsoluteUrl('/media/avatars/300-2.png');
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
      <DropdownMenuContent className="w-auto" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            {/* User Initials Avatar */}
            <div className="size-9 rounded-full border-2 border-green-500 flex items-center justify-center bg-green-100 text-green-800 font-semibold">
              {getUserInitials(user)}
            </div>
            <div className="flex flex-col">
              <Link
                to=""
                className="text-sm text-mono hover:text-primary font-semibold"
              >
                {displayName}
              </Link>
              <a
                href={`mailto:${displayEmail}`}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {displayEmail}
              </a>
            </div>
          </div>
          <Badge variant="primary" appearance="light" size="sm">
            {user.role}
          </Badge>
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
        <div className="p-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => logOut()}
          >
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}