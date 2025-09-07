// src/services/baseApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { loginSuccess, logout } from "@/store/authSlice";
import { getToken, getUser, saveAuth, clearAuth } from "@/utils/token";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include", // gửi cookie refreshToken
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token || getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const shouldSkipReauth = (args) => {
  const url = typeof args === "string" ? args : args?.url || "";

  return url.includes("/auth/refresh") || url.includes("/auth/login") || url.includes("/auth/staff/login");
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401 && !shouldSkipReauth(args)) {
    // Thử refresh access token bằng cookie refreshToken
    const refreshRes = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions
    );

    const newToken = refreshRes?.data?.accessToken;
    if (newToken) {
      const stateUser = api.getState()?.auth?.user || getUser();
      api.dispatch(loginSuccess({ token: newToken, user: stateUser }));
      saveAuth(newToken, stateUser);

      // retry request gốc sau khi đã cập nhật token vào store
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // refresh fail → đăng xuất
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
