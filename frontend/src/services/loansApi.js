// src/services/loansApi.js
import { baseApi } from "./baseApi";

export const loansApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/loans/batches?status=ChoNhan&page=1&pageSize=10&q=...
    listBatches: build.query({
      query: ({ status, page = 1, pageSize = 10, q = "" } = {}) => {
        const p = new URLSearchParams();
        if (status) p.set("status", status);
        p.set("page", String(page));
        p.set("pageSize", String(pageSize));
        if (q) p.set("q", q);
        return { url: `/loans/batches?${p.toString()}` };
      },
      providesTags: (res) =>
        res?.items
          ? [
              ...res.items.map((b) => ({ type: "Loans", id: b.batchId })),
              { type: "Loans", id: "BATCH_LIST" },
            ]
          : [{ type: "Loans", id: "BATCH_LIST" }],
    }),

    // (tuỳ nhu cầu) GET /api/loans/batches/:batchId
    getBatch: build.query({
      query: (batchId) => ({ url: `/loans/batches/${batchId}` }),
      providesTags: (r, e, id) => [{ type: "Loans", id }],
    }),

    // POST /api/loans/batches/confirm-by-shortcode  { shortCode }
    confirmByShortCode: build.mutation({
      query: ({ shortCode }) => ({
        url: `/loans/batches/confirm-by-shortcode`,
        method: "POST",
        body: { shortCode },
      }),
      invalidatesTags: [{ type: "Loans", id: "BATCH_LIST" }],
    }),

    // POST /api/loans/batches/confirm-by-qr  { qrToken }
    confirmByQr: build.mutation({
      query: ({ qrToken }) => ({
        url: `/loans/batches/confirm-by-qr`,
        method: "POST",
        body: { qrToken },
      }),
      invalidatesTags: [{ type: "Loans", id: "BATCH_LIST" }],
    }),

    // POST /api/loans/batches/:batchId/cancel  { reason? }
    cancelHold: build.mutation({
      query: ({ batchId, reason }) => ({
        url: `/loans/batches/${batchId}/cancel`,
        method: "POST",
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: (r, e, { batchId }) => [
        { type: "Loans", id: batchId },
        { type: "Loans", id: "BATCH_LIST" },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useListBatchesQuery,
  useGetBatchQuery,
  useConfirmByShortCodeMutation,
  useConfirmByQrMutation,
  useCancelHoldMutation,
} = loansApi;
