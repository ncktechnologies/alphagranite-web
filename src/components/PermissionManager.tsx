import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updatePermissions } from '@/store/slice/user';
import { useAutoPermissionRefresh } from '@/hooks/useAutoPermissionRefresh';

export const PermissionManager = ({ checkInterval = 1 }: { checkInterval?: number }) => {
  const dispatch = useDispatch();
  
  // Automatically refresh permissions at the specified interval
  useAutoPermissionRefresh(checkInterval);
  
  useEffect(() => {
    const handlePermissionsUpdated = (event: CustomEvent) => {
      console.log('Permissions updated event received:', event.detail);
      const { permissions } = event.detail;
      console.log('Dispatching updatePermissions with:', permissions);
      // Pass the permissions array directly as the payload
      dispatch(updatePermissions(permissions));
    };
    
    console.log('Adding permissionsUpdated event listener');
    window.addEventListener('permissionsUpdated', handlePermissionsUpdated as EventListener);
    
    return () => {
      console.log('Removing permissionsUpdated event listener');
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated as EventListener);
    };
  }, [dispatch]);
  
  return null; // This component doesn't render anything
};