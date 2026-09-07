import { describe, expect, it } from "vitest";
import {
  calculateMatchedBenchmarkReturn,
  calculatePortfolio,
  formatKrwCompact,
  getOwnedQuantity,
  type PaperTrade,
} from "../lib/portfolio";

function trade(overrides: Partial<PaperTrade> = {}): PaperTrade {
  return {
    id: "1",
    ticker: "005930",
    name: "삼성전자",
    market: "KR",
    side: "buy",
    quantity: 10,
    unitPriceKrw: 70_000,
    unitPriceOriginal: 70_000,
    exchangeRate: 1,
    totalKrw: 700_000,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const buy = (o: Partial<PaperTrade> = {}) => trade({ side: "buy", ...o });
const sell = (o: Partial<PaperTrade> = {}) => trade({ side: "sell", ...o });

describe("calculatePortfolio - 매수", () => {
  it("현금과 보유 종목 평가액을 합산한다", () => {
    const result = calculatePortfolio([buy()], { "KR:005930": 77_000 });
    expect(result.cash).toBe(9_300_000);
    expect(result.holdingsValue).toBe(770_000);
    expect(result.totalAssets).toBe(10_070_000);
    expect(result.profit).toBe(70_000);
    expect(result.returnRate).toBeCloseTo(0.7);
  });

  it("같은 종목을 나눠 사면 이동평균으로 평단이 잡힌다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        buy({ id: "b", quantity: 10, unitPriceKrw: 90_000, totalKrw: 900_000, createdAt: "2026-07-02T00:00:00.000Z" }),
      ],
      { "KR:005930": 100_000 },
    );
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0].quantity).toBe(20);
    expect(result.holdings[0].averagePriceKrw).toBe(80_000);
  });

  it("현재가를 모르면 취득원가를 평가액으로 쓴다", () => {
    const result = calculatePortfolio([buy()], {});
    expect(result.holdings[0].currentPriceKrw).toBeNull();
    expect(result.holdings[0].currentValue).toBe(700_000);
    expect(result.profit).toBe(0);
  });
});

describe("calculatePortfolio - 매도", () => {
  it("판 만큼 현금이 돌아오고 실현손익이 잡힌다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        sell({ id: "b", quantity: 10, unitPriceKrw: 80_000, totalKrw: 800_000, createdAt: "2026-07-05T00:00:00.000Z" }),
      ],
      { "KR:005930": 80_000 },
    );
    expect(result.cash).toBe(10_100_000);
    expect(result.realizedProfit).toBe(100_000);
    expect(result.holdings).toHaveLength(0);
    expect(result.totalAssets).toBe(10_100_000);
    expect(result.profit).toBe(100_000);
  });

  it("손절도 실현손익에 그대로 반영된다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        sell({ id: "b", quantity: 10, unitPriceKrw: 60_000, totalKrw: 600_000, createdAt: "2026-07-05T00:00:00.000Z" }),
      ],
      {},
    );
    expect(result.realizedProfit).toBe(-100_000);
    expect(result.profit).toBe(-100_000);
    expect(result.returnRate).toBeCloseTo(-1);
  });

  it("일부만 팔면 남은 수량의 평단은 유지된다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        buy({ id: "b", quantity: 10, unitPriceKrw: 90_000, totalKrw: 900_000, createdAt: "2026-07-02T00:00:00.000Z" }),
        sell({ id: "c", quantity: 5, unitPriceKrw: 100_000, totalKrw: 500_000, createdAt: "2026-07-03T00:00:00.000Z" }),
      ],
      { "KR:005930": 100_000 },
    );
    const holding = result.holdings[0];
    expect(holding.quantity).toBe(15);
    expect(holding.averagePriceKrw).toBe(80_000);
    expect(holding.invested).toBe(1_200_000);
    expect(result.realizedProfit).toBe(100_000);
    expect(holding.profit).toBe(300_000);
  });

  it("보유 수량보다 많이 팔아도 보유분까지만 반영한다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        sell({ id: "b", quantity: 25, unitPriceKrw: 80_000, totalKrw: 2_000_000, createdAt: "2026-07-05T00:00:00.000Z" }),
      ],
      {},
    );
    expect(result.cash).toBe(10_100_000);
    expect(result.realizedProfit).toBe(100_000);
    expect(result.holdings).toHaveLength(0);
  });

  it("보유하지 않은 종목의 매도는 무시한다", () => {
    const result = calculatePortfolio(
      [sell({ id: "z", quantity: 5, unitPriceKrw: 80_000, totalKrw: 400_000 })],
      {},
    );
    expect(result.cash).toBe(10_000_000);
    expect(result.realizedProfit).toBe(0);
    expect(result.profit).toBe(0);
  });

  it("전량 매도 후 다시 사면 새 평단으로 시작한다", () => {
    const result = calculatePortfolio(
      [
        buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 }),
        sell({ id: "b", quantity: 10, unitPriceKrw: 80_000, totalKrw: 800_000, createdAt: "2026-07-05T00:00:00.000Z" }),
        buy({ id: "c", quantity: 5, unitPriceKrw: 50_000, totalKrw: 250_000, createdAt: "2026-07-10T00:00:00.000Z" }),
      ],
      { "KR:005930": 50_000 },
    );
    expect(result.holdings[0].quantity).toBe(5);
    expect(result.holdings[0].averagePriceKrw).toBe(50_000);
    expect(result.realizedProfit).toBe(100_000);
  });

  it("기록 순서가 뒤섞여 있어도 시간순으로 계산한다", () => {
    const later = sell({ id: "b", quantity: 10, unitPriceKrw: 80_000, totalKrw: 800_000, createdAt: "2026-07-05T00:00:00.000Z" });
    const earlier = buy({ id: "a", quantity: 10, unitPriceKrw: 70_000, totalKrw: 700_000 });
    expect(calculatePortfolio([later, earlier], {}).realizedProfit).toBe(100_000);
  });
});

describe("getOwnedQuantity", () => {
  it("매수에서 매도를 뺀 수량을 돌려준다", () => {
    const trades = [
      buy({ id: "a", quantity: 10 }),
      sell({ id: "b", quantity: 4, totalKrw: 320_000, createdAt: "2026-07-05T00:00:00.000Z" }),
    ];
    expect(getOwnedQuantity(trades, "KR", "005930")).toBe(6);
  });

  it("보유하지 않은 종목은 0", () => {
    expect(getOwnedQuantity([buy()], "US", "AAPL")).toBe(0);
    expect(getOwnedQuantity([], "KR", "005930")).toBe(0);
  });
});

describe("calculateMatchedBenchmarkReturn", () => {
  const index = [
    { time: "2026-07-01", value: 100 },
    { time: "2026-07-05", value: 110 },
    { time: "2026-07-10", value: 120 },
  ];

  it("기록이 없으면 null", () => {
    expect(calculateMatchedBenchmarkReturn([], index)).toBeNull();
  });

  it("지수 데이터가 부족하면 null", () => {
    expect(calculateMatchedBenchmarkReturn([buy()], [index[0]])).toBeNull();
  });

  it("매수만 있으면 그 금액이 지수를 따라 자란다", () => {
    const rate = calculateMatchedBenchmarkReturn([buy()], index);
    expect(rate).toBeCloseTo(1.4);
  });

  it("매도하면 같은 날 지수도 같은 금액만큼 판다", () => {
    const trades = [
      buy({ id: "a", totalKrw: 700_000 }),
      sell({ id: "b", quantity: 10, unitPriceKrw: 80_000, totalKrw: 800_000, createdAt: "2026-07-05T00:00:00.000Z" }),
    ];
    expect(calculateMatchedBenchmarkReturn(trades, index)).toBeCloseTo(0.7);
  });

  it("환율을 주면 원화 기준으로 환산한다", () => {
    const fx = [
      { time: "2026-07-01", value: 1_000 },
      { time: "2026-07-10", value: 1_100 },
    ];
    const withFx = calculateMatchedBenchmarkReturn([buy()], index, fx);
    const withoutFx = calculateMatchedBenchmarkReturn([buy()], index);
    expect(withFx).toBeGreaterThan(withoutFx as number);
  });
});

describe("formatKrwCompact", () => {
  it("억 단위로 줄여 표기한다", () => {
    expect(formatKrwCompact(123_456_789)).toBe("1억 2,345만원");
    expect(formatKrwCompact(100_000_000)).toBe("1억원");
  });

  it("억 미만은 그대로 표기한다", () => {
    expect(formatKrwCompact(1_234_567)).toBe("1,234,567원");
  });

  it("음수도 처리한다", () => {
    expect(formatKrwCompact(-1_234_567)).toBe("-1,234,567원");
    expect(formatKrwCompact(-123_456_789)).toBe("-1억 2,345만원");
  });
});
