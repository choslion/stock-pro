import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";

function SparkleIcon({ className = "w-4 h-4" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.592-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  );
}

function fmtTs(isoUtc) {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul",
  });
}

export default function AiBriefing() {
  const [briefing, setBriefing]   = useState("");
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      axiosInstance
        .get("/ai-briefing")
        .then((res) => {
          setBriefing(res.data.briefing ?? "");
          setFetchedAt(res.data.fetched_at ?? null);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  if (error) return null;

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
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-full" />
          <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-5/6" />
          <div className="h-3 bg-gray-700/60 rounded-full animate-pulse w-4/6" />
        </div>
      ) : (
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{briefing}</p>
      )}
    </div>
  );
}
