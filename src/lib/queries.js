import axiosInstance from "./axiosInstance";

const get = (url, params) =>
  axiosInstance.get(url, params ? { params } : undefined).then((r) => r.data);

// ── Query Keys ──────────────────────────────────────────────────────────────
export const Q = {
  usIndices:      () => ["us-indices"],
  kospi:          () => ["kospi"],
  vix:            () => ["vix"],
  fgi:            () => ["fgi"],
  score:          () => ["score"],
  krScore:        () => ["kr-score"],
  sp500:          () => ["sp500"],
  commodities:    () => ["commodities"],
  forex:          () => ["forex"],
  sectors:        () => ["sectors"],
  usSectors:      () => ["us-sectors"],
  investorTrends: () => ["investor-trends"],
  ranking:   (market, filter) => ["ranking",   market, filter],
  etf:       (market, filter) => ["etf",       market, filter],
  themeKr:   (themeId)        => ["theme-kr",  themeId],
  themeUs:   (themeId)        => ["theme-us",  themeId],
  watchlist: (kr, us)         => ["watchlist", kr, us],
};

// ── Fetchers ─────────────────────────────────────────────────────────────────
export const fetchers = {
  usIndices:      () => get("/us-indices"),
  kospi:          () => get("/kospi"),
  vix:            () => get("/vix"),
  fgi:            () => get("/fgi"),
  score:          () => get("/score"),
  krScore:        () => get("/kr-score"),
  sp500:          () => get("/sp500"),
  commodities:    () => get("/commodities"),
  forex:          () => get("/forex"),
  sectors:        () => get("/sectors"),
  usSectors:      () => get("/us-sectors"),
  investorTrends: () => get("/investor-trends"),

  ranking: (market, filter) =>
    get(
      market === "overseas" ? "/stocks/us-ranking" : "/stocks/ranking",
      { type: filter }
    ),

  etf: (market, filter) => {
    const ep = { kr: "/etf", kr_overseas: "/etf-kr-overseas", us: "/etf-us" };
    return get(ep[market], { type: filter });
  },

  themeKr: (tickers)         => get("/watchlist",     { kr: tickers }),
  themeUs: (tickers, limit)  => get("/theme-ranking", { tickers, limit: limit ?? 10 }),
  watchlist: (params)        => get("/watchlist",      params),
};
