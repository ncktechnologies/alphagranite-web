import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

export function SidebarHeader() {
  return (
    <div className="sidebar-header hidden lg:flex items-center relative px-5 shrink-0 bg-white dark:bg-transparent">
      <Link to="/" className="flex items-center" aria-label="The Odyssey Tracker — Dashboard">
        {/* Wrappers carry the collapse toggles from demo1.css; the inner images swap per theme */}
        <span className="default-logo">
          <img
            src={toAbsoluteUrl('/images/logo/ody-logo.png')}
            className="h-[78px] w-auto max-w-none -ms-2 dark:hidden"
            alt="The Odyssey Tracker"
          />
          <img
            src={toAbsoluteUrl('/images/logo/ody/white-odyssey-logo.png')}
            className="hidden h-[78px] w-auto max-w-none -ms-2 dark:block"
            alt="The Odyssey Tracker"
          />
        </span>
        <span className="small-logo">
          <img
            src={toAbsoluteUrl('/images/logo/ody/Odyssey_LogoIconNavy.png')}
            className="size-9 max-w-none dark:hidden"
            alt="The Odyssey Tracker"
          />
          <img
            src={toAbsoluteUrl('/images/logo/ody/Odyssey_LogoIconWhite.png')}
            className="hidden size-9 max-w-none dark:block"
            alt="The Odyssey Tracker"
          />
        </span>
      </Link>
    </div>
  );
}
