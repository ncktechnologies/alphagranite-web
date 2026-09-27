import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CornerDownLeft,
  History,
  Keyboard,
  LogOut,
  PanelLeft,
  Plus,
  Rows3,
  Rows4,
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { SETTINGS_NAV } from '@/config/menu.config';
import { MenuItem } from '@/config/types';
import { flattenMenu, useFilteredMenu } from '@/hooks/use-filtered-menu';
import { usePermission } from '@/hooks/use-permission';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { OPEN_COMMAND_PALETTE_EVENT, isTypingTarget, MOD_KEY, openShortcuts } from '@/lib/keyboard';
import { useSettings } from '@/providers/settings-provider';
import { logout } from '@/store/slice';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

function EntryIcon({ icon }: { icon?: MenuItem['icon'] }) {
  if (!icon || typeof icon === 'string') return <ArrowRight className="text-muted-foreground" />;
  const Icon = icon;
  return <Icon className="text-muted-foreground" />;
}

/**
 * Global command palette (⌘K / Ctrl+K, or "/").
 * Everything here is client-side: navigation is limited to menu entries the
 * user already has permission to see.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const { settings, storeOption } = useSettings();
  const { density, setDensity, recentPages } = useUiPreferences();
  const canCreateFab = usePermission('FAB IDs').canCreate;

  const mainMenu = useFilteredMenu();
  const settingsMenu = useFilteredMenu(SETTINGS_NAV);

  const destinations = useMemo(() => {
    const main = flattenMenu(mainMenu);
    const settingsEntries = flattenMenu(settingsMenu).map((e) => ({ ...e, parent: 'Settings' }));
    const hasProfile = settingsEntries.some((e) => e.path === '/settings/profile');
    const profile = SETTINGS_NAV.find((i) => i.path === '/settings/profile');
    const merged = [
      ...main.filter((e) => e.path !== '/settings/profile'),
      ...settingsEntries,
      ...(!hasProfile && profile
        ? [{ title: 'Profile', path: '/settings/profile', parent: 'Settings', icon: profile.icon }]
        : []),
    ];
    return merged;
  }, [mainMenu, settingsMenu]);

  const recent = useMemo(
    () => recentPages.filter((p) => p.path !== pathname).slice(0, 4),
    [recentPages, pathname],
  );

  // Keyboard entry points
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    };
  }, []);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    // Let the dialog close before navigating / opening something else.
    requestAnimationFrame(fn);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="sm:max-w-[640px] top-[12vh] translate-y-0"
    >
      <CommandInput placeholder="Search pages, actions and settings…" className="h-12 text-[15px]" />
      <CommandList className="max-h-[min(60vh,440px)] py-1">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-sm font-medium text-foreground">No matches</span>
            <span className="text-xs text-muted-foreground">Try a page name like “Shop” or “Reports”.</span>
          </div>
        </CommandEmpty>

        {canCreateFab && (
          <CommandGroup heading="Quick actions">
            <CommandItem
              value="create new fab id"
              keywords={['add', 'job', 'fab']}
              onSelect={() => run(() => navigate('/sales/new-fab-id'))}
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-primary-soft text-primary-accent">
                <Plus className="size-3.5!" />
              </span>
              New FAB ID
            </CommandItem>
          </CommandGroup>
        )}

        {recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((page) => (
              <CommandItem
                key={`recent-${page.path}`}
                value={`recent ${page.title} ${page.path}`}
                onSelect={() => run(() => navigate(page.path))}
              >
                <History className="text-muted-foreground" />
                <span className="truncate">{page.title}</span>
                <span className="ms-auto truncate text-xs text-muted-foreground">{page.path}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Go to">
          {destinations.map((entry) => (
            <CommandItem
              key={entry.path}
              value={`${entry.parent ?? ''} ${entry.title} ${entry.path}`}
              onSelect={() => run(() => navigate(entry.path))}
            >
              <EntryIcon icon={entry.icon} />
              <span className="truncate">{entry.title}</span>
              {entry.parent && (
                <span className="truncate text-xs text-muted-foreground">in {entry.parent}</span>
              )}
              {entry.path === pathname && (
                <span className="ms-auto rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-accent">
                  Current
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className="my-1" />

        <CommandGroup heading="Preferences">
          {!isMobile && (
            <CommandItem
              value="toggle sidebar collapse expand"
              onSelect={() =>
                run(() =>
                  storeOption('layouts.demo1.sidebarCollapse', !settings.layouts.demo1.sidebarCollapse),
                )
              }
            >
              <PanelLeft className="text-muted-foreground" />
              {settings.layouts.demo1.sidebarCollapse ? 'Keep sidebar expanded' : 'Collapse sidebar'}
              <CommandShortcut>{MOD_KEY} B</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem
            value="table density compact comfortable rows"
            onSelect={() => run(() => setDensity(density === 'compact' ? 'comfortable' : 'compact'))}
          >
            {density === 'compact' ? (
              <Rows3 className="text-muted-foreground" />
            ) : (
              <Rows4 className="text-muted-foreground" />
            )}
            {density === 'compact' ? 'Use comfortable table rows' : 'Use compact table rows'}
          </CommandItem>
          <CommandItem value="keyboard shortcuts help" onSelect={() => run(openShortcuts)}>
            <Keyboard className="text-muted-foreground" />
            Keyboard shortcuts
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="sign out log out logout"
            onSelect={() =>
              run(() => {
                dispatch(logout());
                navigate('/auth/signin');
              })
            }
          >
            <LogOut className="text-muted-foreground" />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <div className="flex items-center gap-4 border-t border-border bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd size="xs" className="bg-background font-sans">↑</Kbd>
          <Kbd size="xs" className="bg-background font-sans">↓</Kbd>
          to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd size="xs" className="bg-background">
            <CornerDownLeft />
          </Kbd>
          to select
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          <Kbd size="xs" className="bg-background font-sans">Esc</Kbd>
          to close
        </span>
      </div>
    </CommandDialog>
  );
}
