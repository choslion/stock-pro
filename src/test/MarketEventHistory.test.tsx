import { screen, waitFor } from "@testing-library/react";
import axiosInstance from "../lib/axiosInstance";
import MarketEventHistory from "../components/MarketEventHistory";
import { renderWithQuery } from "./helpers";

vi.mock("../lib/axiosInstance", () => ({
  default: { get: vi.fn() },
}));

const mockGet = vi.mocked(axiosInstance.get);

beforeEach(() => {
  mockGet.mockReset();
});

describe("MarketEventHistory", () => {
  it("사이드카와 서킷브레이커의 최근 발동 일시를 표시한다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2026-09-11",
        searched_from: "2006-09-16",
        source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/",
        fetched_at: "2026-09-11T01:00:00Z",
        available: true,
        latest_events: {
          sidecar: {
            id: "sidecar-1", kind: "sidecar", market: "KOSPI", direction: "buy", phase: null,
            title: "매수 사이드카 발동", occurred_at: "2026-08-12T11:57+09:00", status: "ended",
            halt_ends_at: null, ends_at: "2026-08-12T12:02+09:00",
          },
          circuit_breaker: {
            id: "cb-1", kind: "circuit_breaker", market: "KOSDAQ", direction: null, phase: 1,
            title: "1단계 CB 발동", occurred_at: "2026-07-29T12:19+09:00", status: "ended",
            halt_ends_at: "2026-07-29T12:39+09:00", ends_at: "2026-07-29T12:49+09:00",
          },
        },
      },
    });

    renderWithQuery(<MarketEventHistory />);

    await waitFor(() => expect(screen.getByText("2026.08.12")).toBeInTheDocument());
    expect(screen.getByText("11:57")).toBeInTheDocument();
    expect(screen.getByText("2026.07.29")).toBeInTheDocument();
    expect(screen.getByText("12:19")).toBeInTheDocument();
    expect(screen.getByText("KOSPI · 매수 프로그램 호가 정지")).toBeInTheDocument();
    expect(screen.getByText("KOSDAQ · 1단계 · 전체 매매 중단")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "KRX 원문 확인" })).toHaveAttribute("target", "_blank");
  });

  it("모바일에서 항목이 한 열로 쌓이는 반응형 그리드를 사용한다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2026-09-11", searched_from: "2006-09-16", source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/", fetched_at: "2026-09-11T01:00:00Z",
        available: true, latest_events: { sidecar: null, circuit_breaker: null },
      },
    });

    const { container } = renderWithQuery(<MarketEventHistory />);
    await waitFor(() => expect(screen.getAllByText("조회 기간 내 발동 기록 없음")).toHaveLength(2));
    expect(container.querySelector(".grid-cols-1.sm\\:grid-cols-2")).toBeInTheDocument();
  });
  it("available이 false면 카드를 숨긴다", async () => {
    mockGet.mockResolvedValue({
      data: {
        as_of: "2026-09-11", searched_from: "2024-09-11", source: "KRX KIND",
        source_url: "https://kind.krx.co.kr/", fetched_at: "2026-09-11T01:00:00Z",
        available: false, latest_events: { sidecar: null, circuit_breaker: null },
      },
    });

    renderWithQuery(<MarketEventHistory />);
    await waitFor(() =>
      expect(screen.queryByLabelText("최근 시장 안전장치 불러오는 중")).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("최근 시장 안전장치")).not.toBeInTheDocument();
  });

  it("조회 요청이 실패하면 오류 문구 없이 카드를 숨긴다", async () => {
    mockGet.mockRejectedValue(new Error("503"));

    renderWithQuery(<MarketEventHistory />);
    // 컴포넌트가 retry: 1을 쓰므로 재시도 지연까지 기다린다.
    await waitFor(
      () => expect(screen.queryByLabelText("최근 시장 안전장치 불러오는 중")).not.toBeInTheDocument(),
      { timeout: 4000 },
    );
    expect(screen.queryByText("최근 시장 안전장치")).not.toBeInTheDocument();
    expect(screen.queryByText("최근 발동 기록을 확인하지 못했어요.")).not.toBeInTheDocument();
  });
});
