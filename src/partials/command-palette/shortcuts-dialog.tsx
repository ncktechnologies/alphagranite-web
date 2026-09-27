import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { isTypingTarget, MOD_KEY, OPEN_SHORTCUTS_EVENT } from '@/lib/keyboard';
import { useSettings } from '@/providers/settings-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: [MOD_KEY, 'K'], label: 'Open command menu' },
  { keys: ['/'], label: 'Search pages & actions' },
  { keys: [MOD_KEY, 'B'], label: 'Collapse / expand sidebar' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close dialogs & menus' },
];

/** Global keyboard shortcuts plus the "?" cheat-sheet dialog. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { settings, storeOption } = useSettings();
  const collapsed = settings.layouts.demo1.sidebarCollapse;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === 'b' && !isMobile && !isTypingTarget(e.target)) {
        e.preventDefault();
        storeOption('layouts.demo1.sidebarCollapse', !collapsed);
        return;
      }
      if (e.key === '?' && !mod && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, onOpen);
    };
  }, [collapsed, isMobile, storeOption]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-2">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around The Odyssey Tracker without reaching for the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="text-text">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k} size="sm" className="min-w-6 bg-muted font-sans text-foreground">
                    {k}
                  </Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
