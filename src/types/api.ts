// ── 공통 ─────────────────────────────────────────────────────────────────────

export interface IndexData {
  value: number;
  change: number;
  change_pct: number;
  date: string;
}

// ── /us-indices ───────────────────────────────────────────────────────────────
export interface UsIndicesData {
  sp500:  IndexData;
  nasdaq: IndexData;
  dow:    IndexData;
}

// ── /kospi ────────────────────────────────────────────────────────────────────
export interface KospiData {
  kospi:  IndexData;
  kosdaq: IndexData;
}

// ── /vix ─────────────────────────────────────────────────────────────────────
export interface VixData {
  value: string;
  date:  string;
}

// ── /fgi ─────────────────────────────────────────────────────────────────────
export interface FgiData {
  value:       number;
  description: string;
  last_update: string;
}

// ── /score ───────────────────────────────────────────────────────────────────
export interface ScoreData {
  score:     number;
  rsi:       number;
  ma200_pct: number;
}

// ── /kr-score ─────────────────────────────────────────────────────────────────
export interface KrScoreData {
  score:        number;
  realized_vol: number;
  momentum_pct: number;
  breadth_pct:  number;
}

// ── /sp500 ────────────────────────────────────────────────────────────────────
export interface Sp500Data {
  date:               string;
  current_value:      number;
  ma200:              number;
  deviation_percent:  number;
}

// ── /commodities ──────────────────────────────────────────────────────────────
export interface CommodityItem {
  ticker:     string;
  name:       string;
  value:      number;
  change:     number;
  change_pct: number;
  unit:       string;
}

export interface CommoditiesData {
  items:     CommodityItem[];
  fetched_at: string;
  usd_krw:   number;
}

// ── /forex ────────────────────────────────────────────────────────────────────
export interface ForexItem {
  pair:       string;
  label:      string;
  value:      number;
  change:     number;
  change_pct: number;
}

export interface ForexData {
  items:      ForexItem[];
  fetched_at: string;
}

// ── /sectors ─────────────────────────────────────────────────────────────────
export interface SectorItem {
  name:        string;
  change_rate: number;
  total:       number;
  rising:      number;
}

export interface SectorsData {
  items: SectorItem[];
}

// ── /us-sectors ───────────────────────────────────────────────────────────────
export interface UsSectorItem {
  ticker:      string;
  name:        string;
  change_rate: number;
}

export interface UsSectorsData {
  items: UsSectorItem[];
}

// ── /investor-trends ──────────────────────────────────────────────────────────
export interface InvestorTrendStock {
  rank:        number;
  ticker:      string;
  name:        string;
  price:       number;
  change_rate: number;
  marcap?:     number;
  amount?:     number;
}

export interface InvestorTrendsData {
  marcap: InvestorTrendStock[];
  hot:    InvestorTrendStock[];
}

// ── /stocks/ranking ───────────────────────────────────────────────────────────
export interface RankingStock {
  rank:        number;
  ticker:      string;
  name:        string;
  price:       number;
  change_rate: number;
}

export interface DomesticRankingData {
  items: RankingStock[];
}

// ── /stocks/us-ranking ────────────────────────────────────────────────────────
export interface UsRankingStock {
  rank:        number;
  ticker:      string;
  name:        string;
  price_usd:   number;
  price_krw:   number;
  change_rate: number;
}

export interface OverseasRankingData {
  stocks:  UsRankingStock[];
  usd_krw: number;
}

// ── /etf, /etf-kr-overseas, /etf-us ──────────────────────────────────────────
export interface EtfItem {
  rank:        number;
  ticker:      string;
  name:        string;
  price:       number;
  change_rate: number;
  marcap?:     number;
  amount?:     number;
  volume?:     number;
}

export interface EtfData {
  items:    EtfItem[];
  usd_krw?: number;
}

// ── /watchlist ────────────────────────────────────────────────────────────────
export interface WatchlistItem {
  ticker:      string;
  price:       number;
  price_usd?:  number;
  price_krw?:  number;
  change_rate: number;
}

export interface WatchlistData {
  items:   WatchlistItem[];
  usd_krw: number;
}

// ── /theme-ranking ────────────────────────────────────────────────────────────
export interface ThemeUsStock {
  rank:        number;
  ticker:      string;
  price_usd:   number;
  price_krw:   number;
  change_rate: number;
}

export interface ThemeUsData {
  stocks:  ThemeUsStock[];
  usd_krw: number;
}

// ── /ai-briefing ─────────────────────────────────────────────────────────────
export interface AiBriefingData {
  briefing:   string;
  fetched_at: string;
}

// ── /news ─────────────────────────────────────────────────────────────────────
export interface NewsItem {
  title:     string;
  link:      string;
  source:    string;
  market:    "KR" | "US";
  published: string | null;
}

export interface NewsData {
  items: NewsItem[];
}

// ── /chart ────────────────────────────────────────────────────────────────────
export interface ChartPoint {
  time:  string;
  value: number;
}

export interface ChartData {
  items: ChartPoint[];
}

// ── /portfolio/review ────────────────────────────────────────────────────────
export interface PortfolioReviewHolding {
  name: string;
  ticker: string;
  market: "KR" | "US";
  return_rate: number;
  reason: string;
  horizon: string;
}

export interface PortfolioReviewTrade {
  name: string;
  reason: string;
  thesis: string;
  created_at: string;
}

export interface PortfolioReviewRequest {
  portfolio_return: number;
  kospi_return: number | null;
  sp500_return: number | null;
  holdings: PortfolioReviewHolding[];
  recent_trades: PortfolioReviewTrade[];
}

export interface PortfolioReviewData {
  summary: string;
  best_decision: string;
  repeated_mistake: string;
  generated_at: string;
}
