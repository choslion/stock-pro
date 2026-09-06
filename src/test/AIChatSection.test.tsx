import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIChatSection from "../components/AIChatSection";

/** SSE 본문을 지정한 바이트 경계로 쪼개 흘려보내는 가짜 응답 */
function sseResponse(body: string, cuts: number[]) {
  const bytes = new TextEncoder().encode(body);
  const bounds = [0, ...cuts, bytes.length];
  const chunks = bounds.slice(0, -1).map((b, i) => bytes.slice(b, bounds[i + 1]));
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined },
      }),
    },
  } as unknown as Response;
}

function errorResponse(status: number, detail: string) {
  return {
    ok: false,
    status,
    json: async () => ({ detail }),
  } as unknown as Response;
}

async function ask() {
  const user = userEvent.setup();
  render(<AIChatSection />);
  await user.type(screen.getByRole("textbox"), "테스트");
  await user.keyboard("{Enter}");
}

describe("AIChatSection - SSE 스트리밍", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("청크 경계가 줄 중간에 떨어져도 답변이 온전히 표시된다", async () => {
    const body =
      'data: {"text":"코스피는 "}\n\n' +
      'data: {"text":"상승 마감했습니다."}\n\n' +
      "data: [DONE]\n\n";
    // 16, 33 = 첫 줄 중간(한글 3바이트 경계 포함)에서 자르는 지점
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(body, [16, 33, 60])));

    await ask();
    await waitFor(
      () => expect(screen.getByText("코스피는 상승 마감했습니다.")).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it("한 바이트씩 쪼개 들어와도 한글이 깨지지 않는다", async () => {
    const body = 'data: {"text":"공포탐욕지수"}\n\n' + "data: [DONE]\n\n";
    const cuts = Array.from({ length: new TextEncoder().encode(body).length - 1 }, (_, i) => i + 1);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse(body, cuts)));

    await ask();
    await waitFor(() => expect(screen.getByText("공포탐욕지수")).toBeInTheDocument(), { timeout: 3000 });
  });

  it("요청 한도(429)에 걸리면 서버 안내 문구를 보여준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(errorResponse(429, "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")),
    );

    await ask();
    await waitFor(
      () =>
        expect(
          screen.getByText("요청이 너무 많습니다. 잠시 후 다시 시도해주세요."),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});
