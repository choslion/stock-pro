import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { NewsItem } from "../types/api";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { NewspaperIcon } from "./ui/Icons";

// 뉴스는 백엔드가 30분 캐시하므로 1분 폴링 대신 5분 주기로 갱신
const NEWS_REFETCH_MS = 5 * 60 * 1000;

const SOURCE_COLORS: Record<string, string> = {
  "연합뉴스":      "text-blue-400",
  "머니투데이":    "text-emerald-400",
  "Yahoo Finance": "text-purple-400",
};
const DEFAULT_SOURCE_COLOR = "text-gray-400";

const MARKET_LABEL: Record<string, string> = { KR: "국내", US: "해외" };

type MarketFilter = "all" | "KR" | "US";

const FILTERS: Array<{ id: MarketFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "KR",  label: "국내" },
  { id: "US",  label: "해외" },
];

function fmtRelative(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;
  const min = Math.floor(diffMs / 60000);
  if (min < 1)  return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

const kstDay = (d: Date) => d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

/** 시간대 섹션 라벨 — 목록이 최신순이라 같은 섹션은 자연히 연속된다 */
function bucketOf(iso: string | null, now: Date): string {
  if (!iso) return "이전 소식";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "이전 소식";
  if (now.getTime() - d.getTime() < 60 * 60 * 1000) return "최근 1시간";
  if (kstDay(d) === kstDay(now)) return "오늘";
  if (kstDay(d) === kstDay(new Date(now.getTime() - 86400000))) return "어제";
  return "이전 소식";
}

interface NewsGroup { bucket: string; items: NewsItem[]; }

export default function NewsSection() {
  const [filter, setFilter] = useState<MarketFilter>("all");

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey:        Q.news(),
    queryFn:         fetchers.news,
    staleTime:       NEWS_REFETCH_MS,
    refetchInterval: NEWS_REFETCH_MS,
  });

  const groups = useMemo<NewsGroup[]>(() => {
    const all = data?.items ?? [];
    const filtered = filter === "all" ? all : all.filter((it) => it.market === filter);
    const now = new Date();
    const out: NewsGroup[] = [];
    for (const item of filtered) {
      const bucket = bucketOf(item.published, now);
      const last = out[out.length - 1];
      if (last && last.bucket === bucket) last.items.push(item);
      else out.push({ bucket, items: [item] });
    }
    return out;
  }, [data, filter]);

  const isEmpty = groups.length === 0;

  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <Card title="시장을 움직이는 주요 소식" icon={NewspaperIcon}>
      {/* 필터 칩 + 기준 시각 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5" role="group" aria-label="뉴스 필터">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-0.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.id
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500">
          {fetchedAt
            ? fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + " 기준"
            : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[240px]">
          <Spin />
        </div>
      ) : error && !data ? (
        <ErrorBlock message={parseError(error)} onRetry={refetch} />
      ) : isEmpty ? (
        <p className="text-gray-500 text-center py-8 text-sm">표시할 뉴스가 없습니다.</p>
      ) : (
        <div>
          {groups.map((group) => (
            <section key={group.bucket} className="mb-1 last:mb-0">
              <h4 className="flex items-center gap-2 px-2 pt-3 pb-1.5">
                <span className="text-[11px] font-semibold text-gray-500">{group.bucket}</span>
                <span className="flex-1 h-px bg-gray-700/50" aria-hidden="true" />
              </h4>
              <ul className="divide-y divide-gray-700/40">
                {group.items.map((item) => {
                  const meta = [
                    MARKET_LABEL[item.market] ?? item.market,
                    fmtRelative(item.published),
                  ].filter(Boolean);
                  return (
                    <li key={item.link}>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-2 py-2.5 rounded-lg hover:bg-gray-700/30 transition-colors group"
                      >
                        <p className="text-sm text-gray-200 group-hover:text-white leading-snug">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          <span className={`font-medium ${SOURCE_COLORS[item.source] ?? DEFAULT_SOURCE_COLOR}`}>
                            {item.source}
                          </span>
                          {meta.map((m, i) => (
                            <span key={i}> · {m}</span>
                          ))}
                        </p>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
