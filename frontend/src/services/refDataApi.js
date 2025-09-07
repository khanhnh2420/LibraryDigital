// src/services/refDataApi.js
import { baseApi } from "./baseApi";

export const refDataApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCategories: build.query({
      query: ({ limit = 200, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("limit", String(limit));
        if (q) p.set("q", q);
        return { url: `/categories?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: "Categories", id: c.categoryId })),
              { type: "Categories", id: "DROPDOWN" },
            ]
          : [{ type: "Categories", id: "DROPDOWN" }],
    }),

    listAuthors: build.query({
      query: ({ limit = 200, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("limit", String(limit));
        if (q) p.set("q", q);
        return { url: `/authors?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((a) => ({ type: "Authors", id: a.authorId })),
              { type: "Authors", id: "DROPDOWN" },
            ]
          : [{ type: "Authors", id: "DROPDOWN" }],
    }),

    listPublishers: build.query({
      query: ({ limit = 200, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("limit", String(limit));
        if (q) p.set("q", q);
        return { url: `/publishers?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((p) => ({ type: "Publishers", id: p.publisherId })),
              { type: "Publishers", id: "DROPDOWN" },
            ]
          : [{ type: "Publishers", id: "DROPDOWN" }],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useListAuthorsQuery,
  useListPublishersQuery,
} = refDataApi;
