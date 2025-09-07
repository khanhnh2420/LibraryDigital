// src/services/categoriesApi.js
import { baseApi } from "./baseApi";

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCategoriesPaged: build.query({
      query: ({ page = 1, pageSize = 10, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (q) p.set("q", q);
        return { url: `/categories?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((c) => ({ type: "Categories", id: c.categoryId })),
              { type: "Categories", id: "LIST" },
            ]
          : [{ type: "Categories", id: "LIST" }],
    }),

    createCategory: build.mutation({
      query: (body) => ({ url: "/categories", method: "POST", body }),
      invalidatesTags: [{ type: "Categories", id: "LIST" }, { type: "Categories", id: "DROPDOWN" }],
    }),

    updateCategory: build.mutation({
      query: ({ categoryId, data }) => ({
        url: `/categories/${categoryId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (res, err, { categoryId }) => [
        { type: "Categories", id: categoryId },
        { type: "Categories", id: "LIST" },
        { type: "Categories", id: "DROPDOWN" },
      ],
    }),

    deleteCategory: build.mutation({
      query: (categoryId) => ({ url: `/categories/${categoryId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Categories", id: "LIST" }, { type: "Categories", id: "DROPDOWN" }],
    }),
  }),
});

export const {
  useListCategoriesPagedQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
