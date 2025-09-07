import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: "/auth/staff/login", method: "POST", body, clientType: "web" }),
      invalidatesTags: ["Auth"]
    }),
    me: build.query({
      query: () => ({ url: "/auth/me" }),
      providesTags: ["Auth"]
    })
  })
});

export const { useLoginMutation, useMeQuery } = authApi;
