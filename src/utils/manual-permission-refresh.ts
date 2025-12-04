import { refreshUserPermissions } from '@/services/permission-service';

// Call this function when you know permissions have been updated on the backend
export const triggerPermissionRefresh = async () => {
  const success = await refreshUserPermissions();
  if (success) {
    // Optionally show a notification
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success('Permissions updated successfully');
    }
  }
  return success;
};