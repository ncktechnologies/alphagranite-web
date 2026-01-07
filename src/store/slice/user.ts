/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice } from "@reduxjs/toolkit"
import type { MenuPermission } from "@/interfaces/pages/auth";

let storedUser = null;
try {
  const raw = localStorage.getItem("user");
  if (raw) storedUser = JSON.parse(raw);
} catch (e) {
  localStorage.removeItem("user"); // optional cleanup
}

let storedPermissions = {};
try {
  const raw = localStorage.getItem("permissions");
  if (raw) storedPermissions = JSON.parse(raw);
} catch (e) {
  localStorage.removeItem("permissions"); // optional cleanup
}

const userSlice = createSlice({
  name: "userSlice",
  initialState: {
    user: storedUser || null,
    isAuth: !!storedUser,
    permissions: storedPermissions as Record<string, {
      can_create: boolean;
      can_read: boolean;
      can_update: boolean;
      can_delete: boolean;
    }>,
  },
  reducers: {
    setCredentials: (state, action) => {
      const { admin, access_token, permissions } = action.payload;
      state.user = admin;
      state.isAuth = true;
      
      // Transform permissions array to lookup object
      if (permissions && Array.isArray(permissions)) {
        state.permissions = permissions.reduce((acc: any, perm: MenuPermission) => {
          // Use menu_name as the key for widget matching
          const key = perm.menu_name;
          acc[key] = {
            can_create: perm.can_create,
            can_read: perm.can_read,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
          };
          return acc;
        }, {});
        
        // Store permissions in localStorage
        localStorage.setItem('permissions', JSON.stringify(state.permissions));
      }
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(admin));
      localStorage.setItem('token', access_token);
    },
    logout: (state) => {
      state.user = null;
      state.isAuth = false;
      state.permissions = {};
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('permissions');
      
      // Clear all table state entries from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('table-state-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    },
    updateCredentials: (state, action) => {
      Object.assign(state, action.payload)
    },
    updateUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
    // New reducer for updating permissions
    updatePermissions: (state, action) => {
      console.log('updatePermissions reducer called with:', action.payload);
      // Update permissions in state
      if (action.payload && Array.isArray(action.payload)) {
        state.permissions = action.payload.reduce((acc: any, perm: MenuPermission) => {
          const key = perm.menu_name;
          acc[key] = {
            can_create: perm.can_create,
            can_read: perm.can_read,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
          };
          return acc;
        }, {});
        
        // Store updated permissions in localStorage
        localStorage.setItem('permissions', JSON.stringify(state.permissions));
        console.log('Permissions updated in localStorage:', state.permissions);
      } else {
        console.log('Invalid permissions payload:', action.payload);
      }
    },
  },
})

export const { setCredentials, logout, updateCredentials, updateUser, updatePermissions } = userSlice.actions
export const userSliceReducer = userSlice.reducer
export default userSlice.reducer