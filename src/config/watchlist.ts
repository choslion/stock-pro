import watchlistData from "./watchlist.json";

export type WatchlistMarket = "KR" | "US";

export interface WatchlistEntry {
  ticker: string;
  name:   string;
  market: WatchlistMarket;
}

// 관심종목은 watchlist.json 한 곳에서 관리합니다 (프론트엔드 + SS 브리핑 공용 소스).
// market: "KR" = 국내 (종목코드), "US" = 해외 (티커)
export const WATCHLIST: WatchlistEntry[] = watchlistData as WatchlistEntry[];
