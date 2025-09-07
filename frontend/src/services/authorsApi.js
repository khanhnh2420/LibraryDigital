// src/services/authorsApi.js
import { baseApi } from "./baseApi";

export const authorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuthorsPaged: build.query({
      query: ({ page = 1, pageSize = 10, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (q) p.set("q", q);
        return { url: `/authors?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((a) => ({ type: "Authors", id: a.authorId })),
              { type: "Authors", id: "LIST" }
            ]
          : [{ type: "Authors", id: "LIST" }]
    }),

    createAuthor: build.mutation({
      query: (body) => ({ url: "/authors", method: "POST", body }),
      invalidatesTags: [{ type: "Authors", id: "LIST" }, { type: "Authors", id: "DROPDOWN" }]
    }),

    updateAuthor: build.mutation({
      query: ({ authorId, data }) => ({ url: `/authors/${authorId}`, method: "PUT", body: data }),
      invalidatesTags: (res, err, { authorId }) => [
        { type: "Authors", id: authorId },
        { type: "Authors", id: "LIST" },
        { type: "Authors", id: "DROPDOWN" }
      ]
    }),

    deleteAuthor: build.mutation({
      query: (authorId) => ({ url: `/authors/${authorId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Authors", id: "LIST" }, { type: "Authors", id: "DROPDOWN" }]
    })
  })
});

export const {
  useListAuthorsPagedQuery,
  useCreateAuthorMutation,
  useUpdateAuthorMutation,
  useDeleteAuthorMutation
} = authorsApi;
