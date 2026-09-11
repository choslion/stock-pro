import { beforeEach, describe, expect, it, vi } from "vitest";
import axiosInstance from "../lib/axiosInstance";
import { fetchers } from "../lib/queries";

vi.mock("../lib/axiosInstance", () => ({
  default: { get: vi.fn() },
}));

const mockGet = vi.mocked(axiosInstance.get);

describe("query fetchers", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: {} });
  });

  it("자동 재시도 중인 조회 요청은 전역 오류 토스트를 띄우지 않는다", async () => {
    await fetchers.kospi();

    expect(mockGet).toHaveBeenCalledWith("/kospi", {
      params: undefined,
      suppressErrorToast: true,
    });
  });

  it("쿼리 파라미터와 오류 토스트 억제 옵션을 함께 전달한다", async () => {
    await fetchers.watchlist({ kr: "000660" });

    expect(mockGet).toHaveBeenCalledWith("/watchlist", {
      params: { kr: "000660" },
      suppressErrorToast: true,
    });
  });
});
