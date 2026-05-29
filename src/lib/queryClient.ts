import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:                60 * 1000,        // 1분 — 백엔드 캐시 TTL과 동일
      gcTime:                  10 * 60 * 1000,  // 10분간 메모리 유지
      refetchOnWindowFocus:    true,             // 탭 복귀 시 stale이면 즉시 재요청
      refetchInterval:          60 * 1000,       // 1분 주기 자동갱신
      refetchIntervalInBackground: false,        // 탭 숨겨지면 폴링 중단
      retry: 1,
    },
  },
});
