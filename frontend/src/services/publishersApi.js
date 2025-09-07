// src/services/publishersApi.js
import { baseApi } from "./baseApi";

export const publishersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPublishersPaged: build.query({
      query: ({ page = 1, pageSize = 10, q = "" } = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (q) p.set("q", q);
        return { url: `/publishers?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((x) => ({ type: "Publishers", id: x.publisherId })),
              { type: "Publishers", id: "LIST" },
            ]
          : [{ type: "Publishers", id: "LIST" }],
    }),

    createPublisher: build.mutation({
      query: (body) => ({ url: "/publishers", method: "POST", body }),
      invalidatesTags: [{ type: "Publishers", id: "LIST" }, { type: "Publishers", id: "DROPDOWN" }],
    }),

    updatePublisher: build.mutation({
      query: ({ publisherId, data }) => ({ url: `/publishers/${publisherId}`, method: "PUT", body: data }),
      invalidatesTags: (res, err, { publisherId }) => [
        { type: "Publishers", id: publisherId },
        { type: "Publishers", id: "LIST" },
        { type: "Publishers", id: "DROPDOWN" },
      ],
    }),

    deletePublisher: build.mutation({
      query: (publisherId) => ({ url: `/publishers/${publisherId}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Publishers", id: "LIST" }, { type: "Publishers", id: "DROPDOWN" }],
    }),
  }),
});

export const {
  useListPublishersPagedQuery,
  useCreatePublisherMutation,
  useUpdatePublisherMutation,
  useDeletePublisherMutation,
} = publishersApi;
