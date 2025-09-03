import { baseApi } from "./baseApi";

export const booksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listBooks: build.query({
      query: (q = {}) => {
        const params = new URLSearchParams();
        if (q.page) params.set("page", String(q.page));
        if (q.pageSize) params.set("pageSize", String(q.pageSize));
        if (q.q) params.set("q", q.q);
        if (q.categoryId) params.set("categoryId", q.categoryId);
        return { url: `/books?${params.toString()}` };
      },
      providesTags: (res) =>
        res
          ? [
              ...res.items.map((b) => ({ type: "Books", id: b.id })),
              { type: "Books", id: "LIST" }
            ]
          : [{ type: "Books", id: "LIST" }]
    }),
    getBook: build.query({
      query: (id) => ({ url: `/books/${id}` }),
      providesTags: (res, err, id) => [{ type: "Books", id }]
    }),
    createBook: build.mutation({
      query: (body) => ({ url: "/books", method: "POST", body }),
      invalidatesTags: [{ type: "Books", id: "LIST" }]
    }),
    updateBook: build.mutation({
      query: ({ id, data }) => ({ url: `/books/${id}`, method: "PUT", body: data }),
      invalidatesTags: (res, err, { id }) => [{ type: "Books", id }]
    }),
    deleteBook: build.mutation({
      query: (id) => ({ url: `/books/${id}`, method: "DELETE" }),
      invalidatesTags: (res, err, id) => [{ type: "Books", id }, { type: "Books", id: "LIST" }]
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
