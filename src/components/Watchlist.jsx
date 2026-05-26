import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { WATCHLIST } from "../config/watchlist";
import { BookmarkIcon } from "./ui/Icons";

const KR_LIST    = WATCHLIST.filter((w) => w.market === "KR");
const KR_TICKERS = KR_LIST.map((w) => w.ticker);
const KR_NAMES   = KR_LIST.map((w) => w.name);
const US_TICKERS = WATCHLIST.filter((w) => w.market === "US").map((w) => w.ticker);
const WL_PARAMS  = {};
if (KR_TICKERS.length) { WL_PARAMS.kr = KR_TICKERS.join(","); WL_PARAMS.kr_names = KR_NAMES.join(","); }
if (US_TICKERS.length) WL_PARAMS.us = US_TICKERS.join(",");

function ChangeRate({ value }) {
  const color =
    value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function Watchlist() {
  const [currency, setCurrency] = useState("krw");

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: Q.watchlist(KR_TICKERS.join(","), US_TICKERS.join(",")),
    queryFn:  () => fetchers.watchlist(WL_PARAMS),
    enabled:  Object.keys(WL_PARAMS).length > 0,
  });

  const dataMap = useMemo(() => {
    const map = {};
    for (const item of data?.items ?? []) map[item.ticker] = item;
    return map;
  }, [data]);

  const usdKrw    = data?.usd_krw ?? null;
  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const hasUs     = US_TICKERS.length > 0;

  function formatPrice(config, stock) {
    if (!stock) return "-";
    if (config.market === "KR")
      return (stock.price ?? 0).toLocaleString("ko-KR") + "원";
    if (currency === "usd")
      return "$" + (stock.price_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (stock.price_krw ?? 0).toLocaleString("ko-KR") + "원";
  }

  return (
    <Card title="개발자의 관심종목" subtitle="응원해줘 친구들" icon={BookmarkIcon}>
      {/* 헤더 — 2줄 구조 */}
      <div className="mb-2 space-y-1 min-h-[40px]">
        {/* 1줄: 원/달러 토글 (우) */}
        <div className="flex items-center justify-end">
          {hasUs && (
            <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5" role="group" aria-label="통화 선택">
              {["krw", "usd"].map((c) => (
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
            </div>
            <div className="divide-y divide-gray-700/50">
              {WATCHLIST.map((config) => {
                const stock = dataMap[config.ticker];
                return (
                  <div
                    key={config.ticker}
                    className="px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                  >
                    {/* 1행: 구분 + 종목명 + 등락률 */}
                    <div className="flex items-center gap-2">
                      <span className={`w-8 shrink-0 text-xs font-semibold ${config.market === "KR" ? "text-blue-400" : "text-yellow-400"}`}>
                        {config.market}
                      </span>
                      <p className="flex-1 text-sm font-medium">{config.name}</p>
                      <span className="shrink-0 text-sm">
                        <ChangeRate value={stock?.change_rate ?? 0} />
                      </span>
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
              {WATCHLIST.length === 0 && (
                <p className="text-gray-500 text-center py-6 text-sm">
                  watchlist.js에 종목을 추가하세요.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
