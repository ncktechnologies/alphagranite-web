import { RefObject, useEffect, useRef } from 'react';

interface ScrollPosition {
  windowY: number;
  top: number;
  left: number;
}

/**
 * Remembers the page scroll and a table's scroll area position for this tab, and
 * restores them once `ready` (data loaded) when the user comes back to the page.
 * `containerRef` may point at a Radix ScrollArea root or the scrolling element itself.
 */
export function useScrollRestoration(key: string, containerRef: RefObject<HTMLElement | null>, ready: boolean) {
  const storageKey = `scroll-${key}`;
  const position = useRef<ScrollPosition>({ windowY: 0, top: 0, left: 0 });
  const restored = useRef(false);

  const getViewport = () =>
    containerRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]') ?? containerRef.current;

  // Track positions while mounted; refs are already detached by the time unmount cleanup runs.
  useEffect(() => {
    const viewport = getViewport();
    const record = () => {
      position.current = {
        windowY: window.scrollY,
        top: viewport?.scrollTop ?? 0,
        left: viewport?.scrollLeft ?? 0,
      };
    };
    window.addEventListener('scroll', record, { passive: true });
    viewport?.addEventListener('scroll', record, { passive: true });
    return () => {
      window.removeEventListener('scroll', record);
      viewport?.removeEventListener('scroll', record);
      if (restored.current) {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(position.current));
        } catch {
          // ignore storage errors
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, ready]);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    let saved: ScrollPosition | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      saved = raw ? (JSON.parse(raw) as ScrollPosition) : null;
    } catch {
      saved = null;
    }
    if (!saved) return;
    position.current = saved;
    // Wait a frame so the rows are laid out before scrolling.
    requestAnimationFrame(() => {
      window.scrollTo(0, saved!.windowY);
      const viewport = getViewport();
      if (viewport) {
        viewport.scrollTop = saved!.top;
        viewport.scrollLeft = saved!.left;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, storageKey]);
}
