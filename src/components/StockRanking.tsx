import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { RankingStock, UsRankingStock, OverseasRankingData, DomesticRankingData } from "../types/api";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

type Market   = "domestic" | "overseas";
type Filter   = "amount" | "volume" | "rising" | "falling";
type Currency = "usd" | "krw";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "amount",  label: "거래대금" },
  { id: "volume",  label: "거래량"   },
  { id: "rising",  label: "급상승"   },
  { id: "falling", label: "급하락"   },
];

const MARKETS: Array<{ id: Market; label: string }> = [
  { id: "domestic", label: "국내" },
  { id: "overseas", label: "해외" },
];

function ChangeRate({ value }: { value: number }) {
  const color =
    value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

export default function StockRanking() {
  const [market, setMarket]     = useState<Market>("domestic");
  const [filter, setFilter]     = useState<Filter>("amount");
  const [currency, setCurrency] = useState<Currency>("usd");

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: Q.ranking(market, filter),
    queryFn:  () => fetchers.ranking(market, filter),
  });

  const isOverseas = market === "overseas";
  const stocks: (RankingStock | UsRankingStock)[] = isOverseas
    ? ((data as OverseasRankingData)?.stocks ?? [])
    : ((data as DomesticRankingData)?.items ?? []);
  const usdKrw    = isOverseas ? (data as OverseasRankingData)?.usd_krw ?? null : null;
  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  function formatPrice(stock: RankingStock | UsRankingStock): string {
    if (!isOverseas) return ((stock as RankingStock).price ?? 0).toLocaleString("ko-KR") + "원";
    const us = stock as UsRankingStock;
    if (currency === "krw" && usdKrw)
      return (us.price_krw ?? Math.round((us.price_usd ?? 0) * usdKrw)).toLocaleString("ko-KR") + "원";
    return "$" + (us.price_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div>
      {/* 국내/해외 토글 + 원/달러 토글 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMarket(m.id); setFilter("amount"); }}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                market === m.id ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {isOverseas && (
          <div className="flex gap-0.5 bg-gray-700/40 rounded-full p-0.5">
            {(["usd", "krw"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  currency === c ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {c === "usd" ? "USD" : "원"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 업데이트 시각 */}
      <div className="flex items-center justify-between mb-2 min-h-[16px]">
        {fetchedAt && (
          <p className="text-xs text-gray-500 ml-auto">
            {fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준
          </p>
        )}
      </div>

      {/* 필터 — 보조 칩 */}
      <div className="mb-4">
        <ScrollTabs
          tabs={FILTERS}
          activeId={filter}
          onChange={(id) => setFilter(id as Filter)}
          ariaLabel="종목 필터"
        />
      </div>

      {/* 고정 높이 영역 */}
      <div className="min-h-[420px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[420px]">
            <Spin />
          </div>
        ) : error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-700 text-xs text-gray-500">
              <span className="w-8 shrink-0">순위</span>
              <span className="flex-1">종목명</span>
              <span className="shrink-0">등락률</span>
            </div>

            <div className="divide-y divide-gray-700/50">
              {stocks.map((stock) => (
                <div
                  key={stock.ticker}
                  className="px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                >
                  {/* 1행: 순위 + 종목명 + 등락률 */}
                  <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-gray-500 text-xs tabular-nums">{stock.rank}</span>
                    <p className="flex-1 text-sm font-medium">{stock.name}</p>
                    <span className="shrink-0 text-sm">
                      <ChangeRate value={stock.change_rate} />
                    </span>
                  </div>
                  {/* 2행: 현재가 */}
                  <div className="pl-10 mt-0.5">
                    <p className="text-[11px] text-gray-500 tabular-nums">{formatPrice(stock)}</p>
                  </div>
                </div>
              ))}

              {stocks.length === 0 && (
                <p className="text-gray-500 text-center py-6 text-sm">
                  {filter === "rising" || filter === "falling"
                    ? "현재 해당 조건의 종목이 없습니다 (장 마감 또는 변동 없음)"
                    : "데이터가 없습니다."}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
