import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import LoadingBar, { LoadingBarRef } from 'react-top-loading-bar';
import { isLoadingNewData } from '@/lib/query-loading';

// Requests answered faster than this never show the bar, so quick loads don't flicker.
const SHOW_DELAY_MS = 150;

/**
 * Bar along the top of the page while any API request is loading new data,
 * e.g. switching a report to another month. Same look as the route-change bar
 * in app-routing.tsx, but its own instance so the two never finish each other.
 */
export function DataLoadingBar() {
  const loading = useSelector(isLoadingNewData);
  const bar = useRef<LoadingBarRef>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!loading) {
      // complete() on a bar that never started animates a full-width flash.
      if (started.current) bar.current?.complete();
      started.current = false;
      return;
    }
    const timer = setTimeout(() => {
      started.current = true;
      bar.current?.continuousStart();
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  return <LoadingBar ref={bar} color="var(--color-primary)" height={3} shadow={false} />;
}
