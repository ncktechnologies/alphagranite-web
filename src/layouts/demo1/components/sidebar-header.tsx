import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

export function SidebarHeader() {
  return (
    <div className="sidebar-header hidden lg:flex items-center relative px-5 shrink-0 bg-white">
      <Link to="/" className="flex items-center" aria-label="The Odyssey Tracker — Dashboard">
        <img
          src={toAbsoluteUrl('/images/logo/ody-logo.png')}
          className="default-logo h-[78px] w-auto max-w-none -ms-2"
          alt="The Odyssey Tracker"
        />
        <img
          src={toAbsoluteUrl('/images/logo/ody/Odyssey_LogoIconNavy.png')}
          className="small-logo size-9 max-w-none"
          alt="The Odyssey Tracker"
        />
      </Link>
    </div>
  );
}
