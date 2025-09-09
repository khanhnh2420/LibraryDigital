// src/services/baseApi.js
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { loginSuccess, logout } from "@/store/authSlice";
import { getToken, getUser, saveAuth, clearAuth } from "@/utils/token";

// Lấy base URL từ ENV, fallback '/api' (Netlify proxy)
const raw = import.meta.env.VITE_API_BASE_URL || "/api";
const baseUrl = raw.replace(/\/$/, "");

// --- fetch gốc ---
const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include", // QUAN TRỌNG: gửi cookie refresh
  prepareHeaders: (headers, { getState }) => {
    const token = getState()?.auth?.token || getToken();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return headers;
  },
});

// Bỏ qua reauth cho các đường dẫn auth
const shouldSkipReauth = (args) => {
  const url = typeof args === "string" ? args : (args?.url || "");
  return [
    "/auth/refresh",
    "/auth/login",
    "/auth/staff/login",
    "/auth/logout",
    "/auth/register",
  ].some((p) => url.includes(p));
};

// Ngăn bão refresh: mọi request 401/403 sẽ "đợi" chung 1 promise refresh
let refreshingPromise = null;

const doRefreshOnce = async (api, extraOptions) => {
  if (!refreshingPromise) {
    refreshingPromise = rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions
    ).finally(() => {
      // clear sau khi xong (thành công hay thất bại)
      refreshingPromise = null;
    });
  }
  return refreshingPromise;
};

// --- wrapper có re-auth ---
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const status = result?.error?.status;
  const needReauth =
    (status === 401 || status === 403) && !shouldSkipReauth(args);

  if (needReauth) {
    // gọi refresh (single-flight)
    const refreshRes = await doRefreshOnce(api, extraOptions);
    const newToken = refreshRes?.data?.accessToken;

    if (newToken) {
      const stateUser = api.getState()?.auth?.user || getUser();
      api.dispatch(loginSuccess({ token: newToken, user: stateUser }));
      saveAuth(newToken, stateUser);

      // retry request cũ
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // refresh thất bại -> đăng xuất
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
