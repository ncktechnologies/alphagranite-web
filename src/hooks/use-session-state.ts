import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * useState that survives navigating away and back within the same tab
 * (e.g. list → detail → Back). Cleared when the tab closes.
 */
export function useSessionState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode / quota); state still works in memory.
    }
  }, [key, value]);

  return [value, setValue];
}
