export default function parseError(err) {
  // 타임아웃 — Render 무료 서버 절전 or 느린 데이터 수집
  if (
    err?.code === "ECONNABORTED" ||
    err?.message?.toLowerCase().includes("timeout")
  ) {
    return "서버가 절전 중이에요 ☕  60초 후 다시 시도해 주세요 (Render 무료 서버)";
  }

  // 네트워크 끊김 / CORS / 서버 완전 다운
  if (!err?.response) {
    return "서버에 연결할 수 없어요. 네트워크 상태를 확인해 주세요.";
  }

  const status = err.response.status;
  const msg = err.response?.data?.detail || err.response?.data?.message;

  if (status === 503) return msg || "외부 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (status === 429) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (status >= 500)  return "서버 오류가 발생했어요. 잠시 후 새로고침해 주세요.";
  if (status === 404) return "데이터를 찾을 수 없어요.";

  return msg || err?.message || "오류가 발생했어요. 새로고침해 주세요.";
}
