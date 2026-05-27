import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { EtfItem } from "../types/api";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

type EtfMarket = "kr" | "kr_overseas" | "us";
type Filter    = "popular" | "amount" | "volume" | "rising" | "falling";
type Currency  = "usd" | "krw";

const MARKET_TABS: Array<{ id: EtfMarket; label: string }> = [
  { id: "kr",          label: "국내"          },
  { id: "kr_overseas", label: "국내상장 해외"  },
  { id: "us",          label: "미국상장"       },
];

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "popular", label: "인기"   },
  { id: "amount",  label: "거래대금" },
  { id: "volume",  label: "거래량"  },
  { id: "rising",  label: "급상승"  },
  { id: "falling", label: "급하락"  },
];

function ChangeRate({ value }: { value: number }) {
  const color = value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function formatWon(value: number | undefined): string {
  if (!value) return "-";
  if (value >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + "조";
  if (value >= 100_000_000)       return Math.round(value / 100_000_000) + "억";
  if (value >= 10_000)            return Math.round(value / 10_000) + "만";
  return value.toLocaleString("ko-KR");
}

function formatUsd(value: number | undefined): string {
  if (!value) return "-";
  if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(1) + "B";
  if (value >= 1_000_000)     return "$" + (value / 1_000_000).toFixed(1) + "M";
  return "$" + value.toLocaleString("en-US");
}

function formatVolume(value: number | undefined): string {
  if (!value) return "-";
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + "억주";
  if (value >= 10_000)      return Math.round(value / 10_000) + "만주";
  if (value >= 1_000)       return Math.round(value / 1_000) + "천주";
  return value.toLocaleString("ko-KR") + "주";
}

interface EtfTableProps {
  stocks:   EtfItem[];
  filter:   Filter;
  isUs:     boolean;
  currency: Currency;
  usdKrw:  number | null;
}

function EtfTable({ stocks, filter, isUs, currency, usdKrw }: EtfTableProps) {
  const isPopular = filter === "popular";
  const isAmount  = filter === "amount";
  const isVolume  = filter === "volume";
  const showKrw   = isUs && currency === "krw" && usdKrw != null;

  function priceStr(stock: EtfItem): string {
    if (!isUs) return stock.price ? stock.price.toLocaleString("ko-KR") + "원" : "-";
    if (showKrw) return stock.price ? Math.round(stock.price * usdKrw!).toLocaleString("ko-KR") + "원" : "-";
    return stock.price ? "$" + stock.price.toFixed(2) : "-";
  }

  function fmtUsAmount(val: number | undefined): string {
    if (showKrw) return formatWon(val != null ? Math.round(val * usdKrw!) : undefined);
    return formatUsd(val);
  }

  function metricValue(stock: EtfItem): string {
    if (isPopular) return isUs ? fmtUsAmount(stock.amount) : formatWon(stock.marcap);
    if (isAmount)  return isUs ? fmtUsAmount(stock.amount) : formatWon(stock.amount);
    if (isVolume)  return formatVolume(stock.volume);
    return priceStr(stock);
  }

  return (
    <>
      <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-700 text-xs text-gray-500">
        <span className="w-8 shrink-0">순위</span>
        <span className="flex-1">ETF명</span>
        <span className="shrink-0">등락률</span>
      </div>

      <div className="divide-y divide-gray-700/50">
        {stocks.map((stock) => (
          <div
            key={stock.ticker}
            className="px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
          >
            {/* 1행: 순위 + 이름 + 등락률 */}
            <div className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-gray-500 text-xs tabular-nums">{stock.rank}</span>
              <p className="flex-1 text-sm font-medium">{stock.name}</p>
              <span className="shrink-0 text-sm">
                <ChangeRate value={stock.change_rate} />
              </span>
            </div>
            {/* 2행: 현재가(좌) + 지표(우) */}
            <div className="flex items-center pl-10 mt-0.5">
              <p className="flex-1 text-[11px] text-gray-500 tabular-nums">{priceStr(stock)}</p>
              {(isPopular || isAmount || isVolume) && (
                <p className="shrink-0 text-[11px] text-gray-500 tabular-nums">{metricValue(stock)}</p>
              )}
            </div>
          </div>
        ))}
        {stocks.length === 0 && (
          <p className="text-gray-500 text-center py-6 text-sm">
            {filter === "rising" || filter === "falling"
              ? "현재 해당 조건의 ETF가 없습니다 (장 마감 또는 변동 없음)"
              : "데이터가 없습니다."}
          </p>
        )}
      </div>
    </>
  );
}

export default function EtfList() {
  const [market, setMarket]     = useState<EtfMarket>("kr");
  const [filter, setFilter]     = useState<Filter>("popular");
  const [currency, setCurrency] = useState<Currency>("usd");

  const { data, error, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: Q.etf(market, filter),
    queryFn:  () => fetchers.etf(market, filter),
  });

  const stocks    = data?.items ?? [];
  const usdKrw    = data?.usd_krw ?? null;
  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const isUs      = market === "us";

  function handleMarketChange(id: EtfMarket) {
    setMarket(id);
    setFilter("popular");
  }

  return (
    <>
      {/* 시장 탭 */}
      <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5 mb-4">
        {MARKET_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleMarketChange(t.id)}
            className={`flex-1 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
              ${market === t.id ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 필터 탭 */}
      <div className="mb-4">
        <ScrollTabs
          tabs={FILTERS}
          activeId={filter}
          onChange={(id) => setFilter(id as Filter)}
          ariaLabel="ETF 필터"
        />
      </div>

      <div className="flex items-center justify-between mb-2 min-h-[20px]">
        {fetchedAt
          ? <p className="text-xs text-gray-500">{fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준</p>
          : <span />
        }
        {isUs && (
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

      <div className="min-h-[420px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[420px]">
            <Spin />
          </div>
        ) : error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : (
          <EtfTable stocks={stocks} filter={filter} isUs={isUs} currency={currency} usdKrw={usdKrw ?? null} />
        )}
      </div>
    </>
  );
}
