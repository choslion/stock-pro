import { screen, waitFor } from "@testing-library/react";
import axiosInstance from "../lib/axiosInstance";
import MarketAlertBanner from "../components/MarketAlertBanner";
import { renderWithQuery } from "./helpers";

vi.mock("../lib/axiosInstance", () => ({
  default: { get: vi.fn() },
}));

const mockGet = vi.mocked(axiosInstance.get);

beforeEach(() => {
  mockGet.mockReset();
});

describe("MarketAlertBanner", () => {
  it("활성 사이드카를 전역 알림으로 표시한다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2026-09-07",
        source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/",
        fetched_at: "2026-09-07T02:00:00Z",
        active_events: [{
          id: "20260907000123",
          kind: "sidecar",
          market: "KOSPI",
          direction: "sell",
          phase: null,
          title: "유가증권시장 매도 사이드카(Side car) 발동",
          occurred_at: "2026-09-07T11:00+09:00",
          status: "active",
          halt_ends_at: null,
          ends_at: "2026-09-07T11:05+09:00",
        }],
        today_events: [],
      },
    });

    renderWithQuery(<MarketAlertBanner />);

    await waitFor(() => expect(screen.getByRole("alert", { name: "매도 사이드카 알림" })).toBeInTheDocument());
    expect(screen.getByText("KOSPI 프로그램 매도호가 효력 정지")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KRX 공지 확인" })).toHaveAttribute("target", "_blank");
  });

  it("활성 이벤트가 없으면 공간을 차지하지 않는다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2026-09-07",
        source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/",
        fetched_at: "2026-09-07T02:00:00Z",
        active_events: [],
        today_events: [],
      },
    });

    const { container } = renderWithQuery(<MarketAlertBanner />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("서킷브레이커 정지 후 단일가 절차를 구분해 안내한다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2024-08-05",
        source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/",
        fetched_at: "2024-08-05T05:20:00Z",
        active_events: [{
          id: "20240805000312",
          kind: "circuit_breaker",
          market: "KOSDAQ",
          direction: null,
          phase: 1,
          title: "코스닥시장 매매거래 일시중단(1단계 CB 발동)",
          occurred_at: "2024-08-05T13:56+09:00",
          status: "recovery",
          halt_ends_at: "2024-08-05T14:16+09:00",
          ends_at: "2024-08-05T14:26+09:00",
        }],
        today_events: [],
      },
    });

    renderWithQuery(<MarketAlertBanner />);

    await waitFor(() => expect(screen.getByRole("alert", { name: "서킷브레이커 1단계 알림" })).toBeInTheDocument());
    expect(screen.getByText("KOSDAQ 단일가 매매 진행 중")).toBeInTheDocument();
    expect(screen.getByText("매매 재개를 위한 10분간의 단일가 절차가 진행 중입니다.")).toBeInTheDocument();
  });
});
