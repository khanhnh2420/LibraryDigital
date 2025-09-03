import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { baseApi } from "@/services/baseApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware)
});
