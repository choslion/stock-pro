import type { ChartPoint } from "../types/api";

export interface WhatIfResult {
  buyDate:    string;
  lastDate:   string;
  buyPrice:   number;
  lastPrice:  number;
  buyFx:      number;
  lastFx:     number;
  shares:     number;
  cash:       number;
  fxApplied:  boolean;
  finalValue: number;      // 현재 평가액 (원)
  profit:     number;      // 손익 (원)
  rate:       number;      // 수익률 (%)
  series:     ChartPoint[]; // 평가액 시계열 (원)
}

export type PurchaseMode = "fractional" | "whole";

interface WhatIfOptions {
  fxItems?:      ChartPoint[];
  purchaseMode?: PurchaseMode;
}

function normalizePoints(items: ChartPoint[]): ChartPoint[] {
  return items
    .filter((p) => p.time && Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** 해당 날짜 또는 가장 가까운 이전 영업일의 값을 반환한다. */
function valueAt(points: ChartPoint[], time: string): number {
  let lo = 0;
  let hi = points.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].time <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return points[found].value;
}

/** 과거 시세(items)에 amount(원)를 첫 시점에 투자했을 때의 결과를 계산 */
export function computeWhatIf(
  items: ChartPoint[],
  amount: number,
  options: WhatIfOptions = {},
): WhatIfResult | null {
  const pts = normalizePoints(items);
  const fxPts = options.fxItems ? normalizePoints(options.fxItems) : [];
  if (pts.length < 2 || !Number.isFinite(amount) || amount <= 0) return null;
  if (options.fxItems && fxPts.length < 2) return null;

  const first = pts[0];
  const last  = pts[pts.length - 1];
  const fxApplied = fxPts.length >= 2;
  const buyFx  = fxApplied ? valueAt(fxPts, first.time) : 1;
  const lastFx = fxApplied ? valueAt(fxPts, last.time) : 1;
  const buyPriceKrw = first.value * buyFx;
  const exactShares = amount / buyPriceKrw;
  const shares = options.purchaseMode === "whole" ? Math.floor(exactShares) : exactShares;
  const cash = Math.max(0, amount - shares * buyPriceKrw);

  const series = pts.map((p) => ({
    time:  p.time,
    value: Math.round(cash + shares * p.value * (fxApplied ? valueAt(fxPts, p.time) : 1)),
  }));
  const finalValue = series[series.length - 1].value;

  return {
    buyDate:    first.time,
    lastDate:   last.time,
    buyPrice:   first.value,
    lastPrice:  last.value,
    buyFx,
    lastFx,
    shares,
    cash: Math.round(cash),
    fxApplied,
    finalValue,
    profit: finalValue - amount,
    rate:   (finalValue / amount - 1) * 100,
    series,
  };
}

/** 원화 금액을 "1억 2,345만원" / "123만원" / "9,900원" 형태로 표기 */
export function formatKrw(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs  = Math.abs(Math.round(value));

  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const man = Math.round((abs % 100_000_000) / 10_000);
    return man > 0 ? `${sign}${eok}억 ${man.toLocaleString("ko-KR")}만원` : `${sign}${eok}억원`;
  }
  if (abs >= 10_000) {
    const man = Math.round(abs / 10_000);
    return `${sign}${man.toLocaleString("ko-KR")}만원`;
  }
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

/** 손익을 치킨(마리)으로 환산 — 재미 요소 */
export const CHICKEN_PRICE = 25_000;

export function chickenCount(profit: number): number {
  return Math.floor(Math.abs(profit) / CHICKEN_PRICE);
}
