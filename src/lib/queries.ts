import axiosInstance from "./axiosInstance";
import type {
  UsIndicesData, KospiData, VixData, FgiData, ScoreData, KrScoreData,
  Sp500Data, CommoditiesData, ForexData, SectorsData, UsSectorsData,
  InvestorTrendsData, DomesticRankingData, OverseasRankingData,
  EtfData, WatchlistData, ThemeUsData,
} from "../types/api";

type Market  = "domestic" | "overseas";
type EtfMarket = "kr" | "kr_overseas" | "us";

const get = <T>(url: string, params?: Record<string, unknown>) =>
  axiosInstance.get<T>(url, params ? { params } : undefined).then((r) => r.data);

// ── Query Keys ──────────────────────────────────────────────────────────────
export const Q = {
  usIndices:      () => ["us-indices"]               as const,
  kospi:          () => ["kospi"]                    as const,
  vix:            () => ["vix"]                      as const,
  fgi:            () => ["fgi"]                      as const,
  score:          () => ["score"]                    as const,
  krScore:        () => ["kr-score"]                 as const,
  sp500:          () => ["sp500"]                    as const,
  commodities:    () => ["commodities"]              as const,
  forex:          () => ["forex"]                    as const,
  sectors:        () => ["sectors"]                  as const,
  usSectors:      () => ["us-sectors"]               as const,
  investorTrends: () => ["investor-trends"]          as const,
  ranking:   (market: Market,    filter: string) => ["ranking",   market, filter] as const,
  etf:       (market: EtfMarket, filter: string) => ["etf",       market, filter] as const,
  themeKr:   (themeId: string)                   => ["theme-kr",  themeId]        as const,
  themeUs:   (themeId: string)                   => ["theme-us",  themeId]        as const,
  watchlist: (kr: string, us: string)            => ["watchlist", kr, us]         as const,
};

// ── Fetchers ─────────────────────────────────────────────────────────────────
export const fetchers = {
  usIndices:      () => get<UsIndicesData>("/us-indices"),
  kospi:          () => get<KospiData>("/kospi"),
  vix:            () => get<VixData>("/vix"),
  fgi:            () => get<FgiData>("/fgi"),
  score:          () => get<ScoreData>("/score"),
  krScore:        () => get<KrScoreData>("/kr-score"),
  sp500:          () => get<Sp500Data>("/sp500"),
  commodities:    () => get<CommoditiesData>("/commodities"),
  forex:          () => get<ForexData>("/forex"),
  sectors:        () => get<SectorsData>("/sectors"),
  usSectors:      () => get<UsSectorsData>("/us-sectors"),
  investorTrends: () => get<InvestorTrendsData>("/investor-trends"),

  ranking: (market: Market, filter: string) =>
    get<DomesticRankingData | OverseasRankingData>(
      market === "overseas" ? "/stocks/us-ranking" : "/stocks/ranking",
      { type: filter },
    ),

  etf: (market: EtfMarket, filter: string) => {
    const ep: Record<EtfMarket, string> = {
      kr:          "/etf",
      kr_overseas: "/etf-kr-overseas",
      us:          "/etf-us",
    };
    return get<EtfData>(ep[market], { type: filter });
  },

  themeKr: (tickers: string)              => get<WatchlistData>("/watchlist",     { kr: tickers }),
  themeUs: (tickers: string, limit: number) => get<ThemeUsData>("/theme-ranking", { tickers, limit }),
  watchlist: (params: Record<string, string>) => get<WatchlistData>("/watchlist", params),
};
