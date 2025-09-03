// src/services/dashboardApi.js
import { baseApi } from "./baseApi";

// GET /dashboard/summary -> {
//   books: 1240,
//   users: 512,
//   activeLoans: 83,
// }
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    dashboardSummary: build.query({
      query: () => ({ url: "/dashboard/summary" }),
      transformResponse: (res) => ({
        books: res.books ?? 0,
        users: res.users ?? 0,
        activeLoans: res.activeLoans ?? 0,
        overdue: res.overdue ?? 0,
        recentLoans: Array.isArray(res.recentLoans) ? res.recentLoans : [],
        loansTrend: Array.isArray(res.loansTrend) ? res.loansTrend : [],
        topBooks: Array.isArray(res.topBooks) ? res.topBooks : [],
        topCategories: Array.isArray(res.topCategories) ? res.topCategories : [],
        lowStock: Array.isArray(res.lowStock) ? res.lowStock : [],
        conversionRate: res.conversionRate ?? 0,
        nearExpireBatches: res.nearExpireBatches ?? 0
      }),
      providesTags: ["Loans", "Books", "Users"]
    })
  })
});

export const { useDashboardSummaryQuery } = dashboardApi;
