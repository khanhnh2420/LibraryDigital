import { createSlice } from "@reduxjs/toolkit";

const initialState = { user: null, token: null, isLoggedIn: false };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
    },
    loadFromStorage: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = !!action.payload.token;
    }
  }
});

export const { loginSuccess, logout, loadFromStorage } = authSlice.actions;
export default authSlice.reducer;
