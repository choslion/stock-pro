export type WatchlistMarket = "KR" | "US";

export interface WatchlistEntry {
  ticker: string;
  name:   string;
  market: WatchlistMarket;
}

// 관심종목 설정 — 직접 수정하세요
// market: "KR" = 국내 (종목코드), "US" = 해외 (티커)
export const WATCHLIST: WatchlistEntry[] = [
  // ── 국내 ETF ──
  { ticker: "0117V0", name: "TIGER 코리아AI전력기기TOP3플러스", market: "KR" },
  { ticker: "0167Z0", name: "KODEX 미국우주항공 ETF",           market: "KR" },

  // ── 해외 ──
  { ticker: "IREN",  name: "아이렌",          market: "US" },
  { ticker: "NBIS",  name: "네비우스그룹",    market: "US" },
  { ticker: "ANET",  name: "아리스타 네트웍스", market: "US" },
  { ticker: "IONQ",  name: "아이온큐",         market: "US" },
  { ticker: "OKTA",  name: "옥타",             market: "US" },
];
