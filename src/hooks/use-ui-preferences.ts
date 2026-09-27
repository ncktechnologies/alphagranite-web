import { useCallback, useSyncExternalStore } from 'react';

/**
 * Lightweight, per-browser UI preferences (no backend involvement).
 * Values live in localStorage; every read/write is guarded because storage
 * can be unavailable (private mode, blocked site data).
 */

export type Density = 'comfortable' | 'compact';

export interface RecentPage {
  path: string;
  title: string;
  visitedAt: number;
}

interface UiPreferences {
  density: Density;
  recentPages: RecentPage[];
  pinnedMenu: string[];
}

const STORAGE_KEY = 'ui_preferences_v1';
const MAX_RECENT = 6;

const defaults: UiPreferences = {
  density: 'comfortable',
  recentPages: [],
  pinnedMenu: [],
};

function read(): UiPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      recentPages: Array.isArray(parsed.recentPages) ? parsed.recentPages : [],
      pinnedMenu: Array.isArray(parsed.pinnedMenu) ? parsed.pinnedMenu : [],
    };
  } catch {
    return defaults;
  }
}

let state: UiPreferences = read();
const listeners = new Set<() => void>();

function applyDensity(density: Density) {
  try {
    document.documentElement.dataset.density = density;
  } catch {
    /* no DOM */
  }
}
applyDensity(state.density);

function setState(patch: Partial<UiPreferences>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in-memory state */
  }
  if (patch.density) applyDensity(patch.density);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useUiPreferences() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setDensity = useCallback((density: Density) => setState({ density }), []);

  const toggleDensity = useCallback(
    () => setState({ density: state.density === 'compact' ? 'comfortable' : 'compact' }),
    [],
  );

  const addRecentPage = useCallback((page: Omit<RecentPage, 'visitedAt'>) => {
    if (!page.path || !page.title) return;
    const next = [
      { ...page, visitedAt: Date.now() },
      ...state.recentPages.filter((p) => p.path !== page.path),
    ].slice(0, MAX_RECENT);
    setState({ recentPages: next });
  }, []);

  const setPinnedMenu = useCallback((pinnedMenu: string[]) => setState({ pinnedMenu }), []);

  return { ...prefs, setDensity, toggleDensity, addRecentPage, setPinnedMenu };
}
