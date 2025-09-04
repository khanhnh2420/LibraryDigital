// src/services/refDataApi.js
import { baseApi } from "./baseApi";

// helper build query string
function buildQS(params = {}) {
  const p = new URLSearchParams();
  if (params.q) p.set("q", params.q);
  if (params.limit) p.set("limit", String(params.limit));
  if (params.page) p.set("page", String(params.page));
  if (Array.isArray(params.ids) && params.ids.length) {
    p.set("ids", params.ids.join(",")); // server sẽ split(',')
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const refDataApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAuthors: build.query({
      // params: { q?, limit?, page?, ids?: string[] }
      query: (params = {}) => ({ url: `/authors${buildQS(params)}` }),
      transformResponse: (res) => ({
        items: res?.items ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? (res?.items?.length ?? 0),
      }),
      // dropdown chỉ đọc → không cần tags
    }),

    listPublishers: build.query({
      query: (params = {}) => ({ url: `/publishers${buildQS(params)}` }),
      transformResponse: (res) => ({
        items: res?.items ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? (res?.items?.length ?? 0),
      }),
    }),

    listCategories: build.query({
      query: (params = {}) => ({ url: `/categories${buildQS(params)}` }),
      transformResponse: (res) => ({
        items: res?.items ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? (res?.items?.length ?? 0),
      }),
    }),
  }),
});

export const {
  useListAuthorsQuery,
  useListPublishersQuery,
  useListCategoriesQuery,
} = refDataApi;
