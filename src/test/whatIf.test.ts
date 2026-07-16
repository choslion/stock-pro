import { describe, it, expect } from "vitest";
import { computeWhatIf, formatKrw, chickenCount, CHICKEN_PRICE } from "../lib/whatIf";

const items = [
  { time: "2023-07-16", value: 100 },
  { time: "2024-07-16", value: 150 },
  { time: "2025-07-16", value: 200 },
];

describe("computeWhatIf", () => {
  it("첫 시점 매수 기준으로 평가액·수익률을 계산한다", () => {
    const r = computeWhatIf(items, 1_000_000)!;
    expect(r.buyDate).toBe("2023-07-16");
    expect(r.lastDate).toBe("2025-07-16");
    expect(r.finalValue).toBe(2_000_000); // 100 → 200 = 2배
    expect(r.profit).toBe(1_000_000);
    expect(r.rate).toBeCloseTo(100);
    expect(r.series).toHaveLength(3);
    expect(r.series[1].value).toBe(1_500_000);
  });

  it("하락한 경우 손실을 계산한다", () => {
    const r = computeWhatIf(
      [{ time: "a", value: 200 }, { time: "b", value: 100 }],
      1_000_000,
    )!;
    expect(r.finalValue).toBe(500_000);
    expect(r.profit).toBe(-500_000);
    expect(r.rate).toBeCloseTo(-50);
  });

  it("데이터가 부족하거나 금액이 0 이하면 null을 반환한다", () => {
    expect(computeWhatIf([], 1_000_000)).toBeNull();
    expect(computeWhatIf([{ time: "a", value: 100 }], 1_000_000)).toBeNull();
    expect(computeWhatIf(items, 0)).toBeNull();
  });

  it("value가 0 이하인 포인트는 무시한다", () => {
    const r = computeWhatIf(
      [{ time: "x", value: 0 }, ...items],
      1_000_000,
    )!;
    expect(r.buyDate).toBe("2023-07-16");
  });

  it("날짜가 섞여 있어도 시간순으로 계산한다", () => {
    const r = computeWhatIf([...items].reverse(), 1_000_000)!;
    expect(r.buyDate).toBe("2023-07-16");
    expect(r.lastDate).toBe("2025-07-16");
    expect(r.finalValue).toBe(2_000_000);
  });

  it("미국 주식은 과거와 현재 환율 변동을 평가액에 반영한다", () => {
    const fx = [
      { time: "2023-07-16", value: 1_000 },
      { time: "2024-07-16", value: 1_100 },
      { time: "2025-07-16", value: 1_200 },
    ];
    const r = computeWhatIf(items, 1_000_000, { fxItems: fx })!;
    // 주가 2배, 환율 1.2배 → 원화 평가액 2.4배
    expect(r.finalValue).toBe(2_400_000);
    expect(r.rate).toBeCloseTo(140);
    expect(r.fxApplied).toBe(true);
  });

  it("1주 단위 매수는 남은 현금을 평가액에 포함한다", () => {
    const r = computeWhatIf(
      [{ time: "a", value: 600_000 }, { time: "b", value: 900_000 }],
      1_000_000,
      { purchaseMode: "whole" },
    )!;
    expect(r.shares).toBe(1);
    expect(r.cash).toBe(400_000);
    expect(r.finalValue).toBe(1_300_000);
  });

  it("유한하지 않은 금액과 환율 데이터 부족을 거부한다", () => {
    expect(computeWhatIf(items, Number.POSITIVE_INFINITY)).toBeNull();
    expect(computeWhatIf(items, 1_000_000, { fxItems: [] })).toBeNull();
  });
});

describe("formatKrw", () => {
  it("억/만원 단위로 축약한다", () => {
    expect(formatKrw(250_000_000)).toBe("2억 5,000만원");
    expect(formatKrw(200_000_000)).toBe("2억원");
    expect(formatKrw(1_234_567)).toBe("123만원");
    expect(formatKrw(9_900)).toBe("9,900원");
    expect(formatKrw(-1_500_000)).toBe("-150만원");
  });
});

describe("chickenCount", () => {
  it("손익 절대값을 치킨 마리 수로 환산한다", () => {
    expect(chickenCount(CHICKEN_PRICE * 3)).toBe(3);
    expect(chickenCount(-CHICKEN_PRICE * 2 - 1000)).toBe(2);
    expect(chickenCount(10_000)).toBe(0);
  });
});
