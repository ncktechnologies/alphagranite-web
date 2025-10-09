import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Container } from '@/components/common/container';
import { Badge } from '@/components/ui/badge';

export interface UserHeroInfo {
  email?: string;
  label?: string;
  icon?: LucideIcon | null;
}

export interface UserHeroProps {
  image?: ReactNode;
  name?: string;
  username?: string;
  role?: string;
  info: UserHeroInfo[];
}

export function UserHero({ image, name, username, role, info }: UserHeroProps) {
  const { theme } = useTheme();
  const buildInfo = (info: UserHeroInfo[]) => {
    return info.map((item, index) => {
      return (
        <div className="flex gap-1.25 items-center" key={`info-${index}`}>
          {item.icon && (
            <item.icon size={16} className="text-muted-foreground text-sm" />
          )}
          {item.email ? (
            <Link
              to={item.email}
              target="_blank"
              className="text-secondary-foreground font-medium hover:text-primary"
              rel="noreferrer"
            >
              {item.email}
            </Link>
          ) : (
            <span className="text-secondary-foreground font-medium">
              {item.label}
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className="bg-center bg-cover bg-no-repeat hero-bg "

    >
      <Container>
        <div className="flex flex-col items-center gap-2 lg:gap-3.5 py-4 lg:pt-5  border-b">
          {image}
          <div className="flex flex-col items-center gap-1.5 ">
            <div className="text-base leading-5 font-semibold text-text">
              {name}
            </div>
            <div className="text-base leading-5  text-[#9094A4]">
              {username}
            </div>
            <Badge variant="secondary" className={` px-3 py-3 mt-3 rounded-4xl text-xs font-normal bg-[#EEEEEE] text-[#2E3A59]`}>
              {role}
            </Badge>
          </div>
          <div className="flex flex-wrap justify-center gap-1 lg:gap-4.5 text-sm ">
            {buildInfo(info)}
          </div>
        </div>
      </Container>
    </div>
  );
}
