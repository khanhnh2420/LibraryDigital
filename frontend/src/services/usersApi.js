// src/services/usersApi.js
import { baseApi } from "./baseApi";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listUsers: build.query({
      query: ({ page = 1, pageSize = 10, q = "", role, status, sort = "createdAt", order = "desc" } = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (q) p.set("q", q);
        if (role) p.set("role", role);
        if (status) p.set("status", status);
        if (sort) p.set("sort", sort);
        if (order) p.set("order", order);
        return { url: `/admin/users?${p.toString()}` }; // <-- đổi sang /admin/users
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((u) => ({ type: "Users", id: u.userId })),
              { type: "Users", id: "LIST" },
            ]
          : [{ type: "Users", id: "LIST" }],
    }),

    getUser: build.query({
      query: (userId) => ({ url: `/admin/users/${userId}` }), // <-- path admin
      providesTags: (r, e, id) => [{ type: "Users", id }],
    }),

    createUser: build.mutation({
      query: (body) => ({ url: `/admin/users`, method: "POST", body }), // <-- path admin
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),

    updateUser: build.mutation({
      query: ({ userId, data }) => ({ url: `/admin/users/${userId}`, method: "PUT", body: data }), // <-- path admin
      invalidatesTags: (r, e, { userId }) => [{ type: "Users", id: userId }],
    }),

    setUserStatus: build.mutation({
      query: ({ userId, status }) => ({ url: `/admin/users/${userId}/status`, method: "PATCH", body: { status } }), // <-- path admin
      invalidatesTags: (r, e, { userId }) => [{ type: "Users", id: userId }, { type: "Users", id: "LIST" }],
    }),

    resetPassword: build.mutation({
      query: ({ userId, newPassword }) => ({
        url: `/admin/users/${userId}/reset-password`, // <-- path admin
        method: "POST",
        body: { newPassword },
      }),
    }),

    deleteUser: build.mutation({
      query: (userId) => ({ url: `/admin/users/${userId}`, method: "DELETE" }), // <-- path admin
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useResetPasswordMutation,
  useDeleteUserMutation,
} = usersApi;
