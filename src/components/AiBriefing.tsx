import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axiosInstance from "../lib/axiosInstance";

interface IconProps { className?: string; }

function SparkleIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.592-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  );
}

function fmtTs(isoUtc: string): string | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul",
  });
}

// 자동 갱신 주기 (백엔드 캐시가 살아있으면 캐시 히트라 비용 부담 없음)
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;   // 10분

export default function AiBriefing() {
  const [briefing, setBriefing]   = useState("");
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchBriefing = () => {
      axiosInstance
        .get<{ briefing: string; fetched_at: string }>("/ai-briefing")
        .then((res) => {
          if (cancelled) return;
          setBriefing(res.data.briefing ?? "");
          setFetchedAt(res.data.fetched_at ?? null);
          setError(false);
        })
        .catch(() => {
          if (!cancelled) setError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    // 최초 로드는 살짝 지연 (스켈레톤 깜빡임 방지)
    const initialTimer = setTimeout(fetchBriefing, 400);

    // 주기적 자동 갱신 — 탭이 보일 때만 호출
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchBriefing();
    }, REFRESH_INTERVAL_MS);

    // 탭으로 돌아오면 즉시 한 번 갱신
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchBriefing();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (error) return <div className="mb-6" />;

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-slate-900/60 px-5 py-4 mb-6">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparkleIcon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-blue-300">AI 시황 브리핑</span>
        </div>
        {fetchedAt && !loading && (
          <span className="text-[11px] text-gray-500">{fmtTs(fetchedAt)} 기준</span>
        )}
      </div>

      {/* 본문 */}
      <motion.div layout transition={{ duration: 0.35, ease: "easeOut" }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5 pt-1"
            >
              <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-full" />
              <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-full" />
              <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-5/6" />
              <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-5/6" />
              <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-3/6" />
            </motion.div>
          ) : (
            <motion.p
              key="content"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
            >
              {briefing}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
