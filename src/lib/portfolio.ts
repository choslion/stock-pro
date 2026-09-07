import type { ChartPoint } from "../types/api";

export const INITIAL_PAPER_CASH = 10_000_000;

export type StockMarket = "KR" | "US";
export type TradeSide = "buy" | "sell";

export interface PaperTrade {
  id: string;
  ticker: string;
  name: string;
  market: StockMarket;
  side: TradeSide;
  quantity: number;
  unitPriceKrw: number;
  unitPriceOriginal: number;
  exchangeRate: number;
  totalKrw: number;
  createdAt: string;
}

export interface HoldingSummary {
  ticker: string;
  name: string;
  market: StockMarket;
  quantity: number;
  invested: number;          // 남은 수량의 취득원가 (이동평균)
  averagePriceKrw: number;
  currentPriceKrw: number | null;
  currentValue: number;
  profit: number;            // 평가손익 (미실현)
  returnRate: number;
  realized: number;          // 이 종목에서 확정된 손익
}

export interface PortfolioSummary {
  initialCash: number;
  cash: number;
  invested: number;
  holdingsValue: number;
  totalAssets: number;
  profit: number;
  returnRate: number;
  realizedProfit: number;
  holdings: HoldingSummary[];
}

function isUsableTrade(trade: PaperTrade): boolean {
  return (
    Number.isFinite(trade.totalKrw) && trade.totalKrw > 0
    && Number.isFinite(trade.quantity) && trade.quantity > 0
  );
}

function byCreatedAt(a: PaperTrade, b: PaperTrade): number {
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * 이동평균법으로 보유 수량·취득원가·실현손익을 계산한다.
 * 매도는 보유 수량을 넘지 못하도록 잘라내고, 잘린 만큼 매도 금액도 비례 축소한다.
 */
function accumulate(items: PaperTrade[]) {
  let quantity = 0;
  let cost = 0;
  let realized = 0;
  let buyCash = 0;
  let sellCash = 0;

  for (const trade of [...items].sort(byCreatedAt)) {
    if (trade.side === "sell") {
      const sellQty = Math.min(trade.quantity, quantity);
      if (sellQty <= 0) continue;
      const proceeds = trade.totalKrw * (sellQty / trade.quantity);
      const costOfSold = quantity > 0 ? (cost / quantity) * sellQty : 0;
      realized += proceeds - costOfSold;
      quantity -= sellQty;
      cost -= costOfSold;
      sellCash += proceeds;
    } else {
      quantity += trade.quantity;
      cost += trade.totalKrw;
      buyCash += trade.totalKrw;
    }
  }

  // 부동소수점 잔재 정리 — 전량 매도했는데 원가가 남아 있으면 안 된다.
  if (quantity <= 1e-9) {
    quantity = 0;
    cost = 0;
  }
  return { quantity, cost, realized, buyCash, sellCash };
}

export function calculatePortfolio(
  trades: PaperTrade[],
  currentPrices: Record<string, number>,
  initialCash = INITIAL_PAPER_CASH,
): PortfolioSummary {
  const grouped = new Map<string, PaperTrade[]>();
  for (const trade of trades) {
    if (!isUsableTrade(trade)) continue;
    const key = `${trade.market}:${trade.ticker}`;
    grouped.set(key, [...(grouped.get(key) ?? []), trade]);
  }

  let cash = initialCash;
  let realizedProfit = 0;
  const holdings: HoldingSummary[] = [];

  for (const items of grouped.values()) {
    const latest = [...items].sort(byCreatedAt)[items.length - 1];
    const { quantity, cost, realized, buyCash, sellCash } = accumulate(items);

    cash += sellCash - buyCash;
    realizedProfit += realized;
    if (quantity <= 0) continue;   // 전량 매도한 종목은 보유 목록에서 빠진다

    const current = currentPrices[`${latest.market}:${latest.ticker}`];
    const currentPriceKrw = Number.isFinite(current) && current > 0 ? current : null;
    const currentValue = currentPriceKrw === null ? cost : quantity * currentPriceKrw;
    const profit = currentValue - cost;

    holdings.push({
      ticker: latest.ticker,
      name: latest.name,
      market: latest.market,
      quantity,
      invested: cost,
      averagePriceKrw: quantity > 0 ? cost / quantity : 0,
      currentPriceKrw,
      currentValue,
      profit,
      returnRate: cost > 0 ? (profit / cost) * 100 : 0,
      realized,
    });
  }

  cash = Math.max(0, cash);
  const invested = holdings.reduce((sum, holding) => sum + holding.invested, 0);
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
    realizedProfit,
    holdings: holdings.sort((a, b) => b.currentValue - a.currentValue),
  };
}

/** 특정 종목에서 지금 팔 수 있는 수량. */
export function getOwnedQuantity(
  trades: PaperTrade[],
  market: StockMarket,
  ticker: string,
): number {
  const items = trades.filter(
    (trade) => isUsableTrade(trade) && trade.market === market && trade.ticker === ticker,
  );
  return items.length ? accumulate(items).quantity : 0;
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
 * 같은 날 같은 금액을 지수에 넣고 뺐다면 어땠을지 계산한 벤치마크 수익률.
 * 매수하면 그 금액만큼 지수를 사고, 매도하면 회수한 금액만큼 지수를 판다.
 * fxItems를 전달하면 지수와 환율을 곱해 원화 기준으로 계산한다.
 */
export function calculateMatchedBenchmarkReturn(
  trades: PaperTrade[],
  indexItems: ChartPoint[] | undefined,
  fxItems?: ChartPoint[],
  initialCash = INITIAL_PAPER_CASH,
): number | null {
  const indexPoints = normalizeChartPoints(indexItems);
  const fxPoints = fxItems ? normalizeChartPoints(fxItems) : [];
  const validTrades = trades.filter(isUsableTrade).sort(byCreatedAt);
  if (indexPoints.length < 2 || validTrades.length === 0 || (fxItems && fxPoints.length < 2)) return null;

  const priceAt = (date: string) => {
    const index = valueAtDate(indexPoints, date);
    const fx = fxItems ? valueAtDate(fxPoints, date) : 1;
    return index * fx;
  };

  let cash = initialCash;
  let units = 0;

  for (const trade of validTrades) {
    const price = priceAt(trade.createdAt.slice(0, 10));
    if (!(price > 0)) continue;

    if (trade.side === "sell") {
      // 회수한 금액만큼 지수를 판다 (보유분을 넘지 않도록)
      const wanted = trade.totalKrw / price;
      const soldUnits = Math.min(units, wanted);
      units -= soldUnits;
      cash += soldUnits * price;
    } else {
      units += trade.totalKrw / price;
      cash -= trade.totalKrw;
    }
  }

  const lastIndex = indexPoints[indexPoints.length - 1].value;
  const lastFx = fxItems ? fxPoints[fxPoints.length - 1].value : 1;
  const finalAssets = Math.max(0, cash) + units * lastIndex * lastFx;
  return initialCash > 0 ? ((finalAssets - initialCash) / initialCash) * 100 : null;
}

/** 수량 표기. 새 거래는 항상 정수지만, 소수점 매수를 허용하던 시절의
 *  기록도 읽을 수 있어야 해서 둘째 자리까지는 남긴다. */
export function formatQuantity(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
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
