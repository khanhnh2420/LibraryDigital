// src/services/booksApi.js
import { baseApi } from "./baseApi";

// bỏ các key có giá trị undefined / null / "" (nhưng giữ 0)
const isNilOrEmpty = (v) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const buildParams = (q = {}) => {
  const p = new URLSearchParams();

  // phân trang
  if (!isNilOrEmpty(q.page)) p.set("page", String(q.page));
  if (!isNilOrEmpty(q.pageSize)) p.set("pageSize", String(q.pageSize));

  // search text
  if (!isNilOrEmpty(q.q)) p.set("q", String(q.q).trim());

  // categoryId / authorId / publisherId có thể là string hoặc array
  const appendId = (key, val) => {
    if (Array.isArray(val)) {
      val.filter(Boolean).forEach((v) => p.append(key, String(v)));
    } else if (!isNilOrEmpty(val)) {
      p.set(key, String(val));
    }
  };
  appendId("categoryId", q.categoryId);
  appendId("authorId", q.authorId);
  appendId("publisherId", q.publisherId);

  // year (number) – giữ 0 nếu có
  if (!isNilOrEmpty(q.year)) p.set("year", String(Number(q.year)));

  // sort/order
  if (!isNilOrEmpty(q.sort)) p.set("sort", String(q.sort));
  if (!isNilOrEmpty(q.order)) p.set("order", String(q.order));

  return p;
};

export const booksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listBooks: build.query({
      // nhận: { page, pageSize, q, categoryId, authorId, publisherId, year, sort, order }
      query: (q = {}) => {
        const params = buildParams(q);
        // dùng 'params' của fetchBaseQuery để tự encode & nối query string
        return { url: "/books", params };
      },
      transformResponse: (res) => ({
        items: Array.isArray(res?.items)
          ? res.items.map((b) => ({ ...b, id: b.bookId }))
          : [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 10,
      }),
      providesTags: (result) =>
        result?.items?.length
          ? [
              ...result.items.map((b) => ({ type: "Books", id: b.id })),
              { type: "Books", id: "LIST" },
            ]
          : [{ type: "Books", id: "LIST" }],
    }),

    getBook: build.query({
      query: (id) => ({ url: `/books/${encodeURIComponent(id)}` }),
      transformResponse: (b) => (b ? { ...b, id: b.bookId } : b),
      providesTags: (_res, _err, id) => [{ type: "Books", id }],
    }),

    createBook: build.mutation({
      query: (body) => ({ url: "/books", method: "POST", body }),
      invalidatesTags: [{ type: "Books", id: "LIST" }],
    }),

    updateBook: build.mutation({
      query: ({ id, data }) => ({
        url: `/books/${encodeURIComponent(id)}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Books", id },
        { type: "Books", id: "LIST" },
      ],
    }),

    deleteBook: build.mutation({
      query: (id) => ({
        url: `/books/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Books", id },
        { type: "Books", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListBooksQuery,
  useGetBookQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation,
} = booksApi;
