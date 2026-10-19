import { Link, Outlet, useLocation } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';

export function BrandedLayout() {
  const { pathname } = useLocation();
  const isSignIn = pathname.endsWith('/signin');

  return (
    <>
      <style>
        {`
          .branded-bg {
            background-image: url('${toAbsoluteUrl('/images/app/login-bg.svg')}');
          }
        `}
      </style>

      <div className="min-h-screen grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] bg-background">
        {/* ── Brand panel (desktop) ── */}
        <aside className="branded-bg relative hidden lg:flex flex-col justify-between overflow-hidden bg-cover bg-center p-10 xl:p-14 text-white">
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/80" aria-hidden />
          <div
            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_100%,rgb(102_127_1/0.55),transparent_60%)]"
            aria-hidden
          />

          <Link to="/" className="relative z-10 self-start">
            <img
              src={toAbsoluteUrl('/images/logo/ody/white-odyssey-logo.png')}
              className="h-[120px] w-auto -ms-4"
              alt="The Odyssey Tracker"
            />
          </Link>

          <div className="relative z-10 max-w-md space-y-6">
            <img
              src={toAbsoluteUrl('/images/logo/white-alpha-logo.svg')}
              className="h-[40px] w-auto"
              alt="Alpha Granite"
            />
            <div className="h-px w-full bg-white/20" />
            <div className="space-y-3 text-sm">
              <p className="font-semibold text-white">Need help?</p>
              <a
                href="mailto:odyssey@alphagraniteaustin.com"
                className="flex items-center gap-2.5 text-white/80 transition-colors hover:text-white"
              >
                <img src="/images/icons/mail-line.svg" alt="" className="size-5" />
                odyssey@alphagraniteaustin.com
              </a>
              <a
                href="tel:+15128348746"
                className="flex items-center gap-2.5 text-white/80 transition-colors hover:text-white"
              >
                <img src="/images/icons/headphone-line.svg" alt="" className="size-5" />
                +512 834 8746
              </a>
            </div>
          </div>
        </aside>

        {/* ── Form panel ── */}
        <main className="flex min-h-screen flex-col px-6 py-8 sm:px-10">
          <div className="flex justify-center lg:hidden">
            <Link to="/">
              <img
                src={toAbsoluteUrl('/images/logo/ody-logo.png')}
                className="h-[88px] w-auto"
                alt="The Odyssey Tracker"
              />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className="w-full max-w-[400px] animate-fade-in [&_button[type=submit]]:h-11 [&_button[type=submit]]:text-[16px]">
              {isSignIn && (
                <div className="mb-8 space-y-2">
                  <h1 className="text-[29px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
                    Welcome back!
                  </h1>
                  <p className="text-sm text-muted-foreground">Please enter your login details to continue</p>
                </div>
              )}
              <Outlet />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground lg:hidden">
            <span>Need help?</span>
            <a href="mailto:odyssey@alphagraniteaustin.com" className="text-primary hover:underline">
              odyssey@alphagraniteaustin.com
            </a>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Alpha Granite · The Odyssey Tracker
          </p>
        </main>
      </div>
    </>
  );
}
