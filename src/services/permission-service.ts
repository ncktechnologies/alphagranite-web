import { store } from '@/store';
import { updateUser } from '@/store/slice/user';
import { authApi } from '@/store/api/auth';
import type { UserResponse } from '@/interfaces/pages/auth';

export const refreshUserPermissions = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // console.log('No auth token found');
      return false;
    }

    // Use the existing RTK Query endpoint for consistency
    const response = await store.dispatch(authApi.endpoints.getProfile.initiate());
    
    if ('error' in response) {
      console.log('Failed to fetch user data', response.error);
      return false;
    }

    const userData = response.data;
    // console.log('User data fetched:', userData);
    
    // Extract permissions (handle both field names for compatibility)
    // According to memory, backend may return permissions in either 'action_permissions' or 'permissions' field
    // We need to cast to any to access dynamic properties
    const userDataAny = userData as any;
    const permissions = userDataAny.action_permissions || userDataAny.permissions || userData?.permissions || [];
    // console.log('Extracted permissions:', permissions);
    
    // Get current auth data from localStorage
    const currentAuthData = JSON.parse(localStorage.getItem('auth') || '{}');
    // console.log('Current auth data:', currentAuthData);
    
    // Update permissions in the auth data
    const updatedAuthData = {
      ...currentAuthData,
      user: {
        ...(currentAuthData.user || {}),
        ...(userData || {}),
        action_permissions: permissions,
        permissions: permissions, // Keep both for compatibility
      },
      lastPermissionUpdate: new Date().toISOString(),
    };
    
    // Save to localStorage
    localStorage.setItem('auth', JSON.stringify(updatedAuthData));
    // console.log('Updated auth data saved to localStorage');
    
    // Update Redux store
    if (currentAuthData.user || userData) {
      store.dispatch(updateUser({
        ...(currentAuthData.user || {}),
        ...(userData || {}),
        action_permissions: permissions,
        permissions: permissions,
      }));
      // console.log('Redux store updated with new user data');
    }
    
    // Dispatch a custom event to notify components
    window.dispatchEvent(new CustomEvent('permissionsUpdated', {
      detail: { permissions }
    }));
    // console.log('Permissions updated event dispatched');
    
    return true;
  } catch (error) {
    // console.error('Failed to refresh permissions:', error);
    return false;
  }
};