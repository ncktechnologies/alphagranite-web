import { useEffect, useRef } from 'react';
import { refreshUserPermissions } from '@/services/permission-service';

export const useAutoPermissionRefresh = (intervalMinutes: number = 5) => {
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  
  useEffect(() => {
    console.log(`Setting up permission refresh interval: ${intervalMinutes} minutes`);
    
    // Set up periodic permission checks
    intervalRef.current = setInterval(async () => {
      console.log('Refreshing permissions (scheduled)');
      await refreshUserPermissions();
    }, intervalMinutes * 60 * 1000);
    
    // Also check immediately when component mounts
    console.log('Refreshing permissions (initial)');
    refreshUserPermissions();
    
    // Clean up interval on unmount
    return () => {
      console.log('Cleaning up permission refresh interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes]);
};