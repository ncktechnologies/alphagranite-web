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

        <div className='max-w-5xl grid lg:grid-cols-3 grow  mx-auto min-h-screen items-center'>
          <div className=" hidden lg:flex flex-col justify-end w-full max-w-[341px]">
            <div className="flex flex-col ">
              <Link to="/">
                <img
                  src={toAbsoluteUrl('/images/logo/white-alpha-logo.svg')}
                  className="h-[43px] max-w-none "
                  alt=""
                />
              </Link>

              <div className="flex flex-col space-y-2 mt-4 ">
                <h3 className="text-4xl text-white ">
                  Welcome back!
                </h3>
                <span className='text-white/80 text-[16px]'>Please enter your login details to continue</span>
                {/* <hr className='text-[#FFFFFF33] my-5 h-[1px]' /> */}
                <div className='h-[1px] bg-[#FFFFFF33] w-full my-5'></div>
                <p className='text-white pb-2'>Need help?</p>
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
          <div className="flex flex-col justify-start items-center lg:col-span-2 ">
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
