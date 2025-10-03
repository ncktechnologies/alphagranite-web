import { Link, Outlet } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

export function ClassicLayout() {
  return (
    <>

      <div className="flex flex-col items-center justify-center h-screen overflow-hidden bg-[#FBFDF4]">
        <div className="m-2">
          <Link to="/">
            <img
              src={toAbsoluteUrl('/images/logo/alpha-logo.svg')}
              className=""
              alt=""
            />
          </Link>
          
        </div>
        <Outlet />

      </div>
    </>
  );
}
