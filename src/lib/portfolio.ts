import type { ChartPoint } from "../types/api";

export const INITIAL_PAPER_CASH = 10_000_000;

export type StockMarket = "KR" | "US";
export type TradeReason = "earnings" | "news" | "theme" | "technical" | "impulse";
export type InvestmentHorizon = "1m" | "3m" | "6m" | "1y";

export const TRADE_REASON_LABELS: Record<TradeReason, string> = {
  earnings: "실적",
  news: "뉴스",
  theme: "테마",
  technical: "기술적 흐름",
  impulse: "충동",
};

export const HORIZON_LABELS: Record<InvestmentHorizon, string> = {
  "1m": "1개월",
  "3m": "3개월",
  "6m": "6개월",
  "1y": "1년 이상",
};

export interface PaperTrade {
  id: string;
  ticker: string;
  name: string;
  market: StockMarket;
  quantity: number;
  unitPriceKrw: number;
  unitPriceOriginal: number;
  exchangeRate: number;
  totalKrw: number;
  reason: TradeReason;
  horizon: InvestmentHorizon;
  thesis: string;
  createdAt: string;
}

export interface HoldingSummary {
  ticker: string;
  name: string;
  market: StockMarket;
  quantity: number;
  invested: number;
  averagePriceKrw: number;
  currentPriceKrw: number | null;
  currentValue: number;
  profit: number;
  returnRate: number;
  latestReason: TradeReason;
  latestHorizon: InvestmentHorizon;
}

export interface PortfolioSummary {
  initialCash: number;
  cash: number;
  invested: number;
  holdingsValue: number;
  totalAssets: number;
  profit: number;
  returnRate: number;
  holdings: HoldingSummary[];
}

export function calculatePortfolio(
  trades: PaperTrade[],
  currentPrices: Record<string, number>,
  initialCash = INITIAL_PAPER_CASH,
): PortfolioSummary {
  const grouped = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    if (!Number.isFinite(trade.totalKrw) || trade.totalKrw <= 0) continue;
    const key = `${trade.market}:${trade.ticker}`;
    grouped.set(key, [...(grouped.get(key) ?? []), trade]);
  }

  const holdings = [...grouped.values()].map((items): HoldingSummary => {
    const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latest = sorted[sorted.length - 1];
    const quantity = sorted.reduce((sum, item) => sum + item.quantity, 0);
    const invested = sorted.reduce((sum, item) => sum + item.totalKrw, 0);
    const current = currentPrices[`${latest.market}:${latest.ticker}`];
    const currentPriceKrw = Number.isFinite(current) && current > 0 ? current : null;
    const currentValue = currentPriceKrw === null ? invested : quantity * currentPriceKrw;
    const profit = currentValue - invested;

    return {
      ticker: latest.ticker,
      name: latest.name,
      market: latest.market,
      quantity,
      invested,
      averagePriceKrw: quantity > 0 ? invested / quantity : 0,
      currentPriceKrw,
      currentValue,
      profit,
      returnRate: invested > 0 ? (profit / invested) * 100 : 0,
      latestReason: latest.reason,
      latestHorizon: latest.horizon,
    };
  });

  const invested = trades.reduce(
    (sum, trade) => sum + (Number.isFinite(trade.totalKrw) ? Math.max(0, trade.totalKrw) : 0),
    0,
  );
  const cash = Math.max(0, initialCash - invested);
  const holdingsValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalAssets = cash + holdingsValue;
  const profit = totalAssets - initialCash;

  return {
    initialCash,
    cash,
    invested,
    holdingsValue,
    totalAssets,
    profit,
    returnRate: initialCash > 0 ? (profit / initialCash) * 100 : 0,
    holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
  };
}

function normalizeChartPoints(items: ChartPoint[] | undefined): ChartPoint[] {
  return (items ?? [])
    .filter((item) => item.time && Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** 해당 날짜의 종가를 우선 사용하고, 휴장일이면 가장 가까운 이전 영업일 값을 사용한다. */
function valueAtDate(items: ChartPoint[], date: string): number {
  const candidates = items.filter((item) => item.time <= date);
  const previous = candidates[candidates.length - 1];
  return (previous ?? items[0]).value;
}

/**
 * 실제 매수와 같은 날짜·금액만 지수에 투자하고 남은 금액은 현금으로 둔 벤치마크 수익률.
 * fxItems를 전달하면 지수와 환율을 곱해 원화 기준 성과를 계산한다.
 */
export function calculateMatchedBenchmarkReturn(
  trades: PaperTrade[],
  indexItems: ChartPoint[] | undefined,
  fxItems?: ChartPoint[],
  initialCash = INITIAL_PAPER_CASH,
): number | null {
  const indexPoints = normalizeChartPoints(indexItems);
  const fxPoints = fxItems ? normalizeChartPoints(fxItems) : [];
  const validTrades = trades.filter((trade) => Number.isFinite(trade.totalKrw) && trade.totalKrw > 0);
  if (indexPoints.length < 2 || validTrades.length === 0 || (fxItems && fxPoints.length < 2)) return null;

  const finalIndex = indexPoints[indexPoints.length - 1].value;
  const finalFx = fxItems ? fxPoints[fxPoints.length - 1].value : 1;
  const spent = validTrades.reduce((sum, trade) => sum + trade.totalKrw, 0);
  const benchmarkHoldingsValue = validTrades.reduce((sum, trade) => {
    const tradeDate = trade.createdAt.slice(0, 10);
    const entryIndex = valueAtDate(indexPoints, tradeDate);
    const entryFx = fxItems ? valueAtDate(fxPoints, tradeDate) : 1;
    const growth = (finalIndex * finalFx) / (entryIndex * entryFx);
    return sum + trade.totalKrw * growth;
  }, 0);
  const benchmarkAssets = Math.max(0, initialCash - spent) + benchmarkHoldingsValue;
  return initialCash > 0 ? ((benchmarkAssets - initialCash) / initialCash) * 100 : null;
}

/** AI 복기에는 극단값을 놓치지 않도록 수익률 상·하위 종목을 절반씩 전달한다. */
export function selectReviewHoldings(holdings: HoldingSummary[], limit = 30): HoldingSummary[] {
  if (limit <= 0) return [];
  if (holdings.length <= limit) return holdings;
  const lowerCount = Math.floor(limit / 2);
  const upperCount = limit - lowerCount;
  const ascending = [...holdings].sort((a, b) => a.returnRate - b.returnRate);
  const lower = ascending.slice(0, lowerCount);
  const upper = ascending.slice(-upperCount).reverse();
  return [...upper, ...lower];
}

export function getTradeVersion(trades: PaperTrade[]): string {
  if (!trades.length) return "0";
  const latest = [...trades].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return `${trades.length}:${latest.id}:${latest.createdAt}`;
}

export function getWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatKrwCompact(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 100_000_000) {
    const billions = Math.floor(Math.abs(rounded) / 100_000_000);
    const remainder = Math.floor((Math.abs(rounded) % 100_000_000) / 10_000);
    const sign = rounded < 0 ? "-" : "";
    return `${sign}${billions}억${remainder ? ` ${remainder.toLocaleString("ko-KR")}만원` : "원"}`;
  }
  return `${rounded.toLocaleString("ko-KR")}원`;
}
