import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

export function SidebarHeader() {
  return (
    <div className="sidebar-header hidden lg:flex items-center relative px-5 shrink-0 border-b border-white/10">
      <Link to="/" className="flex items-center" aria-label="The Odyssey Tracker — Dashboard">
        <img
          src={toAbsoluteUrl('/images/logo/ody/white-odyssey-logo.png')}
          className="default-logo h-[60px] w-auto max-w-none -ms-2"
          alt="The Odyssey Tracker"
        />
        <img
          src={toAbsoluteUrl('/images/logo/ody/Odyssey_LogoIconWhite.png')}
          className="small-logo size-9 max-w-none"
          alt="The Odyssey Tracker"
        />
      </Link>
    </div>
  );
}
