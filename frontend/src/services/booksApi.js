// src/services/booksApi.js
import { baseApi } from "./baseApi";

export const booksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listBooks: build.query({
      // params: { page, pageSize, q, categoryId, sort, order }
      query: (q = {}) => {
        const params = new URLSearchParams();
        if (q.page) params.set("page", String(q.page));
        if (q.pageSize) params.set("pageSize", String(q.pageSize));
        if (q.q) params.set("q", q.q);
        if (q.categoryId) params.set("categoryId", q.categoryId);
        if (q.sort) params.set("sort", q.sort);               // "title" | "year" | "available" | "createdAt"
        if (q.order) params.set("order", q.order);             // "asc" | "desc"
        return { url: `/books?${params.toString()}` };
      },
      transformResponse: (res) => ({
        items: Array.isArray(res?.items)
          ? res.items.map((b) => ({ ...b, id: b.bookId }))     // map id = bookId để FE dùng thống nhất
          : [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 10
      }),
      providesTags: (result) =>
        result?.items?.length
          ? [
              ...result.items.map((b) => ({ type: "Books", id: b.id })), // id đã map = bookId
              { type: "Books", id: "LIST" }
            ]
          : [{ type: "Books", id: "LIST" }]
    }),

    getBook: build.query({
      query: (id) => ({ url: `/books/${id}` }),                // id chính là bookId
      transformResponse: (b) => (b ? { ...b, id: b.bookId } : b),
      providesTags: (_res, _err, id) => [{ type: "Books", id }]
    }),

    createBook: build.mutation({
      query: (body) => ({ url: "/books", method: "POST", body }),
      invalidatesTags: [{ type: "Books", id: "LIST" }]
    }),

    updateBook: build.mutation({
      // id là bookId
      query: ({ id, data }) => ({ url: `/books/${id}`, method: "PUT", body: data }),
      invalidatesTags: (_res, _err, { id }) => [{ type: "Books", id }, { type: "Books", id: "LIST" }]
    }),

    deleteBook: build.mutation({
      // id là bookId
      query: (id) => ({ url: `/books/${id}`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [{ type: "Books", id }, { type: "Books", id: "LIST" }]
    })
  })
});

export const {
  useListBooksQuery,
  useGetBookQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation
} = booksApi;
