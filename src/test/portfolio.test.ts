import { describe, expect, it } from "vitest";
import {
  calculateMatchedBenchmarkReturn,
  calculatePortfolio,
  formatKrwCompact,
  getWeekKey,
  getTradeVersion,
  selectReviewHoldings,
  type PaperTrade,
} from "../lib/portfolio";

function trade(overrides: Partial<PaperTrade> = {}): PaperTrade {
  return {
    id: "1",
    ticker: "005930",
    name: "삼성전자",
    market: "KR",
    quantity: 10,
    unitPriceKrw: 70_000,
    unitPriceOriginal: 70_000,
    exchangeRate: 1,
    totalKrw: 700_000,
    reason: "earnings",
    horizon: "3m",
    thesis: "실적 개선 확인",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calculatePortfolio", () => {
  it("현금과 보유 종목 평가액을 합산한다", () => {
    const result = calculatePortfolio([trade()], { "KR:005930": 77_000 });
    expect(result.cash).toBe(9_300_000);
    expect(result.holdingsValue).toBe(770_000);
    expect(result.totalAssets).toBe(10_070_000);
    expect(result.profit).toBe(70_000);
    expect(result.returnRate).toBeCloseTo(0.7);
  });

  it("같은 종목의 여러 매수를 평균 단가로 합친다", () => {
    const result = calculatePortfolio([
      trade(),
      trade({ id: "2", quantity: 5, unitPriceKrw: 80_000, totalKrw: 400_000 }),
    ], { "KR:005930": 75_000 });
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0].quantity).toBe(15);
    expect(result.holdings[0].averagePriceKrw).toBeCloseTo(1_100_000 / 15);
  });

  it("현재가가 없으면 매입가로 평가해 잘못된 손익을 만들지 않는다", () => {
    const result = calculatePortfolio([trade()], {});
    expect(result.totalAssets).toBe(10_000_000);
    expect(result.holdings[0].currentPriceKrw).toBeNull();
  });
});

describe("portfolio helpers", () => {
  it("주차 키와 원화 표시를 만든다", () => {
    expect(getWeekKey(new Date("2026-07-20T12:00:00+09:00"))).toBe("2026-W30");
    expect(formatKrwCompact(10_000_000)).toBe("10,000,000원");
    expect(formatKrwCompact(120_050_000)).toBe("1억 2,005만원");
  });

  it("실제 매수 날짜와 금액만 투자한 벤치마크 수익률을 계산한다", () => {
    const trades = [
      trade({ totalKrw: 1_000_000, createdAt: "2026-01-01T00:00:00.000Z" }),
      trade({ id: "2", totalKrw: 1_000_000, createdAt: "2026-02-01T00:00:00.000Z" }),
    ];
    const index = [
      { time: "2026-01-01", value: 100 },
      { time: "2026-02-01", value: 150 },
      { time: "2026-03-01", value: 200 },
    ];
    // 현금 800만원 + 1월 투자 200만원 + 2월 투자 약 133만원
    expect(calculateMatchedBenchmarkReturn(trades, index)).toBeCloseTo(13.3333, 3);
  });

  it("S&P 500 벤치마크에 환율 변동을 함께 반영한다", () => {
    const result = calculateMatchedBenchmarkReturn(
      [trade({ totalKrw: 1_000_000 })],
      [{ time: "2026-07-01", value: 100 }, { time: "2026-08-01", value: 110 }],
      [{ time: "2026-07-01", value: 1_000 }, { time: "2026-08-01", value: 1_100 }],
    );
    // 투자한 10%에 주가 10%·환율 10%가 반영되어 전체 자산은 2.1% 상승
    expect(result).toBeCloseTo(2.1);
  });

  it("AI 복기 대상은 수익률 상·하위 종목을 절반씩 고른다", () => {
    const base = calculatePortfolio([trade()], { "KR:005930": 70_000 }).holdings[0];
    const holdings = Array.from({ length: 31 }, (_, index) => ({
      ...base,
      ticker: String(index),
      returnRate: index - 15,
    }));
    const selected = selectReviewHoldings(holdings);
    expect(selected).toHaveLength(30);
    expect(selected.some((item) => item.returnRate === 15)).toBe(true);
    expect(selected.some((item) => item.returnRate === -15)).toBe(true);
    expect(selected.some((item) => item.returnRate === 0)).toBe(false);
  });

  it("거래가 추가되면 복기 버전이 달라진다", () => {
    const first = trade();
    expect(getTradeVersion([first])).not.toBe(getTradeVersion([trade({ id: "2" }), first]));
  });
});
