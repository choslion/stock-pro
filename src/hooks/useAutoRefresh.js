import { useEffect, useRef } from "react";

const INTERVAL_MS = 5 * 60 * 1000; // 백엔드 캐시 TTL과 동일(5분)

/**
 * 5분마다 onRefresh를 호출하고,
 * 탭이 백그라운드에서 돌아올 때 마지막 갱신으로부터 5분이 지났으면 즉시 재호출.
 *
 * @param {() => void} onRefresh - 호출할 갱신 함수 (최신 참조를 자동으로 추적)
 */
export default function useAutoRefresh(onRefresh) {
  const callbackRef = useRef(onRefresh);
  const lastFetchRef = useRef(Date.now());

  // 항상 최신 콜백을 참조
  useEffect(() => {
    callbackRef.current = onRefresh;
  });

  useEffect(() => {
    // 5분 주기 폴링
    const timer = setInterval(() => {
      callbackRef.current();
      lastFetchRef.current = Date.now();
    }, INTERVAL_MS);

    // 탭 복귀 시 stale 체크
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchRef.current;
        if (elapsed >= INTERVAL_MS) {
          callbackRef.current();
          lastFetchRef.current = Date.now();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []); // mount/unmount 시에만 실행
}
