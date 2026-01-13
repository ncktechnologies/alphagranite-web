import { useEffect, useRef } from 'react';

interface UseTabClosingWarningProps {
  isActive: boolean;
  warningMessage?: string;
  onBeforeUnload?: (event: BeforeUnloadEvent) => void;
}

/**
 * Custom hook to show warning when user tries to close/refresh tab while drafting
 * @param isActive - Whether to enable the warning (typically when isDrafting is true)
 * @param warningMessage - Custom warning message to show
 * @param onBeforeUnload - Optional callback for additional cleanup logic
 */
export function useTabClosingWarning({
  isActive,
  warningMessage = 'You have an active drafting session. Are you sure you want to leave? Your progress may be lost.',
  onBeforeUnload
}: UseTabClosingWarningProps) {
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Call custom callback if provided
      if (onBeforeUnload) {
        onBeforeUnload(event);
      }

      // Modern browsers require returnValue to be set
      event.preventDefault();
      event.returnValue = warningMessage;
      
      // Return the message for older browsers
      return warningMessage;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isActiveRef.current) {
        // Tab is being hidden/minimized - could be user switching away
        console.log('Drafting tab is being hidden - potential abandonment detected');
        // We could send a "user away" signal to backend here if needed
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, warningMessage, onBeforeUnload]);
}