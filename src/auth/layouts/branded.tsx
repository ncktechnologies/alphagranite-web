import { Link, Outlet } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

export function BrandedLayout() {
  return (
    <>
      <style>
        {`
          .branded-bg {
            background-image: url('${toAbsoluteUrl('/images/app/login-bg.svg')}');
            background-position: top bottom;
          }
          .dark .branded-bg {
            background-image: url('${toAbsoluteUrl('/images/app/login-bg.svg')}');
          }
        `}
      </style>
      <div className=" branded-bg bg-no-repeat bg-cover min-h-screen bg-blend-overlay bg-black/70">

        <div className='max-w-5xl grid lg:grid-cols-2 grow lg:gap-2 mx-auto min-h-screen items-center'>
          <div className=" hidden lg:flex flex-col justify-end ">
            <div className="flex flex-col gap-4 w-full max-w-[341px]">
              <Link to="/">
                <img
                  src={toAbsoluteUrl('/images/logo/white-alpha-logo.svg')}
                  className="h-[28px] max-w-none"
                  alt=""
                />
              </Link>

              <div className="flex flex-col ">
                <h3 className="text-2xl text-white ">
                  Welcome back!
                </h3>
                <span className='text-white/80 text-[16px]'>Please enter your login details to continue</span>
                <hr className='text-white/20 my-5' />
                <p className='text-white'>Need help?</p>
                <div className="text-white/80 flex items-center gap-2">
                  <img src="/images/icons/mail-line.svg" alt="" />
                  <span className="">
                    support@alphagranite.com
                  </span>
                </div>
                 <div className="text-white/80 flex items-center gap-2">
                  <img src="/images/icons/headphone-line.svg" alt="" />
                  <span className="">
                    +1 345 698 900
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-start items-center">
             <Link to="/">
                <img
                  src={toAbsoluteUrl('/images/logo/white-alpha-logo.svg')}
                  className=" max-w-none md:hidden mb-5"
                  alt=""
                />
              </Link>
            <Card className="w-full max-w-[398px] bg-[#FBFDF4]">
              <CardContent className="px-4 py-12 rounded-[16px]">
                <Outlet />
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </>
  );
}
