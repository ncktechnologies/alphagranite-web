/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice } from "@reduxjs/toolkit"

let storedUser = null;
try {
  const raw = localStorage.getItem("user");
  if (raw) storedUser = JSON.parse(raw);
} catch (e) {
  localStorage.removeItem("user"); // optional cleanup
}

const userSlice = createSlice({
  name: "userSlice",
  initialState: {
    user: storedUser || null,
    isAuth: !!storedUser,
  },
  reducers: {
    setCredentials: (state, action) => {
      const { admin, access_token } = action.payload;
      state.user = admin;
      state.isAuth = true;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(admin));
      localStorage.setItem('token', access_token);
    },
    logout: (state) => {
      state.user = null;
      state.isAuth = false;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    updateCredentials: (state, action) => {
      Object.assign(state, action.payload)
    },
    updateUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
})

export const { setCredentials, logout, updateCredentials, updateUser } = userSlice.actions
export const userSliceReducer = userSlice.reducer
export default userSlice.reducer