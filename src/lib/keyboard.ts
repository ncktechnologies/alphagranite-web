/** Platform-aware modifier label: ⌘ on Apple devices, Ctrl elsewhere. */
export const isApplePlatform =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const MOD_KEY = isApplePlatform ? '⌘' : 'Ctrl';

/** True when the key event originates from a text-entry element. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export const OPEN_COMMAND_PALETTE_EVENT = 'app:open-command-palette';
export const OPEN_SHORTCUTS_EVENT = 'app:open-shortcuts';

export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));
export const openShortcuts = () => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
