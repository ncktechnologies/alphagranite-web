import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authApi } from '@/store/api';
import { AUTO_REFRESH } from '@/store/api/auto-refresh';
import { jobApi } from '@/store/api/job';
import { operatorApi } from '@/store/api/operator';
import { shopCutPlanningApi } from '@/store/api/shopCutPlanning';
import { shopRevisionApi } from '@/store/api/shopRevision';

const REFRESH_MS = 60_000;
// Coming back to the tab refreshes straight away, unless it just refreshed.
const MIN_GAP_ON_RETURN_MS = 15_000;

/** Someone mid-edit: a dialog or dropdown is open, or they're typing in a field (search boxes aside). */
function isUserBusy() {
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.matches('textarea, select')) return true;
  return (
    el.matches('input') &&
    !el.matches('[type="search"], [placeholder^="Search" i], [type="checkbox"], [type="radio"], [type="button"], [type="submit"]')
  );
}

/**
 * Keeps on-screen lists, widgets and dashboards current without a page reload: every minute,
 * and whenever the tab regains focus or the connection comes back, queries tagged AUTO_REFRESH
 * refetch in the background. Paused while the tab is hidden or the user is editing.
 * Mount once, inside the logged-in layout.
 */
export function useAutoRefresh() {
  const dispatch = useDispatch();

  useEffect(() => {
    let lastRefresh = Date.now();

    const refresh = () => {
      if (document.visibilityState !== 'visible' || isUserBusy()) return;
      lastRefresh = Date.now();
      dispatch(jobApi.util.invalidateTags([AUTO_REFRESH]));
      dispatch(authApi.util.invalidateTags([AUTO_REFRESH]));
      dispatch(shopCutPlanningApi.util.invalidateTags([AUTO_REFRESH]));
      dispatch(shopRevisionApi.util.invalidateTags([AUTO_REFRESH]));
      dispatch(operatorApi.util.invalidateTags([AUTO_REFRESH]));
    };
    const refreshOnReturn = () => {
      if (Date.now() - lastRefresh >= MIN_GAP_ON_RETURN_MS) refresh();
    };

    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshOnReturn);
    window.addEventListener('focus', refreshOnReturn);
    window.addEventListener('online', refreshOnReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshOnReturn);
      window.removeEventListener('focus', refreshOnReturn);
      window.removeEventListener('online', refreshOnReturn);
    };
  }, [dispatch]);
}
