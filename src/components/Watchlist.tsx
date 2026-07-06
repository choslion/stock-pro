import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { WatchlistItem } from "../types/api";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { WATCHLIST } from "../config/watchlist";
import type { WatchlistEntry } from "../config/watchlist";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { BookmarkIcon, StarIcon, XMarkIcon } from "./ui/Icons";

function ChangeRate({ value }: { value: number }) {
  const color =
    value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

type Currency = "krw" | "usd";

interface WatchlistCardProps {
  title:     string;
  subtitle:  string;
  icon:      React.ComponentType<{ className?: string }>;
  entries:   WatchlistEntry[];
  onRemove?: (ticker: string) => void;
  emptyMessage: string;
}

function WatchlistCard({ title, subtitle, icon, entries, onRemove, emptyMessage }: WatchlistCardProps) {
  const [currency, setCurrency] = useState<Currency>("krw");

  const { krTickers, usTickers, params } = useMemo(() => {
    const krList = entries.filter((w) => w.market === "KR");
    const kr = krList.map((w) => w.ticker);
    const us = entries.filter((w) => w.market === "US").map((w) => w.ticker);
    const p: Record<string, string> = {};
    if (kr.length) { p.kr = kr.join(","); p.kr_names = krList.map((w) => w.name).join(","); }
    if (us.length) p.us = us.join(",");
    return { krTickers: kr, usTickers: us, params: p };
  }, [entries]);

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: Q.watchlist(krTickers.join(","), usTickers.join(",")),
    queryFn:  () => fetchers.watchlist(params),
    enabled:  entries.length > 0,
  });

  const dataMap = useMemo<Record<string, WatchlistItem>>(() => {
    const map: Record<string, WatchlistItem> = {};
    for (const item of data?.items ?? []) map[item.ticker] = item;
    return map;
  }, [data]);

  const usdKrw    = data?.usd_krw ?? null;
  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const hasUs     = usTickers.length > 0;

  function formatPrice(config: WatchlistEntry, stock: WatchlistItem | undefined): string {
    if (!stock) return "-";
    if (config.market === "KR")
      return (stock.price ?? 0).toLocaleString("ko-KR") + "원";
    if (currency === "usd")
      return "$" + (stock.price_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (stock.price_krw ?? 0).toLocaleString("ko-KR") + "원";
  }

  if (entries.length === 0) {
    return (
      <Card title={title} subtitle={subtitle} icon={icon}>
        <p className="text-gray-500 text-center py-8 text-sm whitespace-pre-line">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card title={title} subtitle={subtitle} icon={icon}>
      {/* 헤더 — 2줄 구조 */}
      <div className="mb-2 space-y-1 min-h-[40px]">
        {/* 1줄: 원/달러 토글 (우) */}
        <div className="flex items-center justify-end">
          {hasUs && (
            <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5" role="group" aria-label="통화 선택">
              {(["krw", "usd"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`px-3 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    currency === c
                      ? "bg-blue-500 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {c === "krw" ? "원" : "달러"}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 2줄: 환율 (좌) + 기준 시각 (우) */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{hasUs && usdKrw ? `1 USD = ${usdKrw.toLocaleString("ko-KR")}원` : ""}</span>
          <span>
            {fetchedAt
              ? fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " 기준"
              : ""}
          </span>
        </div>
      </div>

      <div className="min-h-[240px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[240px]">
            <Spin />
          </div>
        ) : error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-700 text-xs text-gray-500">
              <span className="w-8 shrink-0">구분</span>
              <span className="flex-1">종목명</span>
              <span className="shrink-0">등락률</span>
              {onRemove && <span className="w-6 shrink-0" />}
            </div>
            <div className="divide-y divide-gray-700/50">
              {entries.map((config) => {
                const stock = dataMap[config.ticker];
                return (
                  <div
                    key={config.ticker}
                    className="px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                  >
                    {/* 1행: 구분 + 종목명 + 등락률 (+ 삭제) */}
                    <div className="flex items-center gap-2">
                      <span className={`w-8 shrink-0 text-xs font-semibold ${config.market === "KR" ? "text-blue-400" : "text-yellow-400"}`}>
                        {config.market}
                      </span>
                      <p className="flex-1 text-sm font-medium">{config.name}</p>
                      <span className="shrink-0 text-sm">
                        <ChangeRate value={stock?.change_rate ?? 0} />
                      </span>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(config.ticker)}
                          aria-label={`${config.name} 관심종목에서 삭제`}
                          className="w-6 h-6 shrink-0 flex items-center justify-center rounded
                                     text-gray-600 hover:text-red-400 hover:bg-gray-700/60 transition-colors"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {/* 2행: 현재가 */}
                    <div className="pl-10 mt-0.5">
                      <p className="text-[11px] text-gray-500 tabular-nums">
                        {formatPrice(config, stock)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

export default function Watchlist() {
  const myEntries = useWatchlistStore((s) => s.entries);
  const remove    = useWatchlistStore((s) => s.remove);

  return (
    <div className="space-y-6">
      <WatchlistCard
        title="내 관심종목"
        subtitle="이 브라우저에만 저장됩니다"
        icon={StarIcon}
        entries={myEntries}
        onRemove={remove}
        emptyMessage={"아직 관심종목이 없습니다.\n종목 검색에서 ★를 눌러 추가해보세요."}
      />
      <WatchlistCard
        title="개발자의 관심종목"
        subtitle="응원해줘 친구들"
        icon={BookmarkIcon}
        entries={WATCHLIST}
        emptyMessage="watchlist.json에 종목을 추가하세요."
      />
    </div>
  );
}
