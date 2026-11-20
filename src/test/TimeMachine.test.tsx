import { screen, within } from "@testing-library/react";
import TimeMachine from "../components/TimeMachine";
import axiosInstance from "../lib/axiosInstance";
import { renderWithQuery } from "./helpers";

vi.mock("../lib/axiosInstance", () => ({ default: { get: vi.fn() } }));
vi.mock("lightweight-charts", () => ({
  createChart: () => ({
    addSeries: () => ({ createPriceLine: vi.fn(), setData: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    remove: vi.fn(),
  }),
  BaselineSeries: {},
  LineStyle: { Dashed: 2 },
}));

it("신규 상장 종목은 실제 매수일부터 평가일까지의 지수 수익률과 비교한다", async () => {
  const mockGet = vi.mocked(axiosInstance.get);
  mockGet.mockImplementation(async (_url, config) => ({
    data: {
      items: config?.params.ticker === "^KS11"
        ? [
            { time: "2023-01-02", value: 100 },
            { time: "2024-01-02", value: 180 },
            { time: "2025-01-02", value: 200 },
            { time: "2025-01-03", value: 220 },
          ]
        : [
            { time: "2024-01-02", value: 100 },
            { time: "2025-01-02", value: 120 },
          ],
    },
  }));

  renderWithQuery(<TimeMachine initialStock={{ ticker: "123456", name: "신규상장주", market: "KR" }} />);

  const benchmark = await screen.findByText("같은 기간 KOSPI");
  expect(within(benchmark.parentElement!).getByText("+11.1%")).toBeInTheDocument();
  expect(screen.getByText("KOSPI 대비 +8.9%p")).toBeInTheDocument();
  expect(mockGet).toHaveBeenCalledWith("/chart", expect.objectContaining({
    params: { ticker: "^KS11", market: "US", period: "3y", start_date: "2024-01-02", end_date: "2025-01-02" },
  }));
});
