// src/services/baseApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { loginSuccess, logout } from "@/store/authSlice";
import { getToken, getUser, saveAuth, clearAuth } from "@/utils/token";

// ✅ Lấy từ ENV, mặc định dùng '/api' (đi qua Netlify proxy)
const raw = import.meta.env.VITE_API_BASE_URL || "/api";
const baseUrl = raw.replace(/\/$/, ""); // bỏ dấu '/' cuối nếu có

const rawBaseQuery = fetchBaseQuery({
  baseUrl,                     // ví dụ: '/api'
  credentials: "include",      // nếu dùng refreshToken qua cookie, giữ include
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token || getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const shouldSkipReauth = (args) => {
  const url = typeof args === "string" ? args : args?.url || "";
  // giữ nguyên: không reauth cho các đường auth
  return url.includes("/auth/refresh") || url.includes("/auth/login") || url.includes("/auth/staff/login");
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401 && !shouldSkipReauth(args)) {
    // Thử refresh bằng cookie (được set khi login)
    const refreshRes = await rawBaseQuery({ url: "/auth/refresh", method: "POST" }, api, extraOptions);
    const newToken = refreshRes?.data?.accessToken;

    if (newToken) {
      const stateUser = api.getState()?.auth?.user || getUser();
      api.dispatch(loginSuccess({ token: newToken, user: stateUser }));
      saveAuth(newToken, stateUser);
      result = await rawBaseQuery(args, api, extraOptions); // retry
    } else {
      api.dispatch(logout());
      clearAuth();
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Books", "Auth", "Categories", "Users", "Loans", "Publishers", "Authors"],
  endpoints: () => ({}),
});
