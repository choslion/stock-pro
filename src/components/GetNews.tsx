import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { NewspaperIcon, ChevronDownIcon } from "./ui/Icons";

const COLLAPSED_COUNT = 6;

// 뉴스는 백엔드가 30분 캐시하므로 1분 폴링 대신 5분 주기로 갱신
const NEWS_REFETCH_MS = 5 * 60 * 1000;

const SOURCE_STYLES: Record<string, string> = {
  "연합뉴스":      "bg-blue-900/60 text-blue-300",
  "머니투데이":    "bg-emerald-900/60 text-emerald-300",
  "Yahoo Finance": "bg-purple-900/60 text-purple-300",
};
const DEFAULT_SOURCE_STYLE = "bg-gray-700/60 text-gray-400";

export default function GetNews() {
  const [expanded, setExpanded] = useState(false);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey:        Q.news(),
    queryFn:         fetchers.news,
    staleTime:       NEWS_REFETCH_MS,
    refetchInterval: NEWS_REFETCH_MS,
  });

  const items   = data?.items ?? [];
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <Card title="주요 뉴스" subtitle="국내외 증시 헤드라인" icon={NewspaperIcon}>
      {isLoading ? (
        <div className="flex items-center justify-center h-[180px]">
          <Spin />
        </div>
      ) : error && !data ? (
        <ErrorBlock message={parseError(error)} onRetry={refetch} />
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-center py-6 text-sm">표시할 뉴스가 없습니다.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-700/50">
            {visible.map((item) => (
              <li key={item.link}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 px-2 py-2.5 rounded-lg hover:bg-gray-700/30 transition-colors group"
                >
                  <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap
                    ${SOURCE_STYLES[item.source] ?? DEFAULT_SOURCE_STYLE}`}>
                    {item.source}
                  </span>
                  <span className="flex-1 text-sm text-gray-200 group-hover:text-white leading-snug">
                    {item.title}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {items.length > COLLAPSED_COUNT && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full flex items-center justify-center gap-1 py-2 rounded-lg
                         text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/30 transition-colors"
            >
              {expanded ? "접기" : `${items.length - COLLAPSED_COUNT}개 더보기`}
              <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}
    </Card>
  );
}
