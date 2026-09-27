import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Outlet, useLocation } from 'react-router-dom';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { useMenu } from '@/hooks/use-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { titleForPath } from '@/lib/breadcrumbs';
import { OfflineBanner } from '@/components/common/offline-banner';
import { CommandPalette } from '@/partials/command-palette/command-palette';
import { ShortcutsDialog } from '@/partials/command-palette/shortcuts-dialog';
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';

export function Demo1Layout() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { getCurrentItem } = useMenu(pathname);
  const item = getCurrentItem(MENU_SIDEBAR);
  const { settings, setOption } = useSettings();
  const { addRecentPage } = useUiPreferences();

  // Remember visited pages for the command menu's "Recent" group
  useEffect(() => {
    addRecentPage({ path: pathname, title: titleForPath(pathname) });
  }, [pathname, addRecentPage]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    if (settings.layouts.demo1.sidebarCollapse) {
      bodyClass.add('sidebar-collapse');
    } else {
      bodyClass.remove('sidebar-collapse');
    }
  }, [settings]); // Runs only on settings update

  useEffect(() => {
    // Set current layout
    setOption('layout', 'demo1');
  }, [setOption]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    // Add a class to the body element
    bodyClass.add('demo1');
    bodyClass.add('sidebar-fixed');
    bodyClass.add('header-fixed');

    const timer = setTimeout(() => {
      bodyClass.add('layout-initialized');
    }, 1000); // 1000 milliseconds

    // Remove the class when the component is unmounted
    return () => {
      bodyClass.remove('demo1');
      bodyClass.remove('sidebar-fixed');
      bodyClass.remove('sidebar-collapse');
      bodyClass.remove('header-fixed');
      bodyClass.remove('layout-initialized');
      clearTimeout(timer);
    };
  }, []); // Runs only once on mount

  return (
    <>
      <Helmet>
        <title>{item?.title}</title>
      </Helmet>

      {!isMobile && <Sidebar />}

      <div className="wrapper flex grow flex-col min-w-0">
        <Header />
        <OfflineBanner />

        <main className="grow pt-6 pb-10 animate-fade-up" role="main">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
      <ShortcutsDialog />
    </>
  );
}
