import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

const MARKET_TABS = [
  { id: "kr",          label: "국내" },
  { id: "kr_overseas", label: "국내상장 해외" },
  { id: "us",          label: "미국상장" },
];

const MARKET_META = {
  kr:          { title: "국내 ETF",          subtitle: "국내 상장 ETF 순위",          endpoint: "/etf" },
  kr_overseas: { title: "국내상장 해외 ETF", subtitle: "해외지수 추종 국내 상장 ETF", endpoint: "/etf-kr-overseas" },
  us:          { title: "미국상장 ETF",      subtitle: "미국 거래소 상장 ETF 순위",   endpoint: "/etf-us" },
};

const FILTERS = [
  { id: "popular", label: "인기" },
  { id: "amount",  label: "거래대금" },
  { id: "volume",  label: "거래량" },
  { id: "rising",  label: "급상승" },
  { id: "falling", label: "급하락" },
];

function ChangeRate({ value }) {
  const color = value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function formatWon(value) {
  if (!value) return "-";
  if (value >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + "조";
  if (value >= 100_000_000)       return Math.round(value / 100_000_000) + "억";
  if (value >= 10_000)            return Math.round(value / 10_000) + "만";
  return value.toLocaleString("ko-KR");
}

function formatUsd(value) {
  if (!value) return "-";
  if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(1) + "B";
  if (value >= 1_000_000)     return "$" + (value / 1_000_000).toFixed(1) + "M";
  return "$" + value.toLocaleString("en-US");
}

function formatVolume(value) {
  if (!value) return "-";
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + "억주";
  if (value >= 10_000)      return Math.round(value / 10_000) + "만주";
  if (value >= 1_000)       return Math.round(value / 1_000) + "천주";
  return value.toLocaleString("ko-KR") + "주";
}

function EtfTable({ stocks, filter, isUs }) {
  const isPopular = filter === "popular";
  const isAmount  = filter === "amount";
  const isVolume  = filter === "volume";

  function priceStr(stock) {
    if (!isUs) return stock.price ? stock.price.toLocaleString("ko-KR") + "원" : "-";
    return stock.price ? "$" + stock.price.toFixed(2) : "-";
  }

  function metricValue(stock) {
    if (isPopular) return isUs ? formatUsd(stock.amount) : formatWon(stock.marcap);
    if (isAmount)  return isUs ? formatUsd(stock.amount) : formatWon(stock.amount);
    if (isVolume)  return formatVolume(stock.volume);
    return priceStr(stock);
  }

  return (
    <>
      {/* 헤더 */}
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
              {!isPopular && !isAmount && !isVolume ? null : (
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
  const [market, setMarket]       = useState("kr");
  const [filter, setFilter]       = useState("popular");
  const [stocks, setStocks]       = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const meta = MARKET_META[market];

  useEffect(() => {
    setLoading(true);
    setError("");
    setStocks([]);
    axiosInstance
      .get(meta.endpoint, { params: { type: filter } })
      .then((res) => {
        setStocks(res.data.items ?? res.data ?? []);
        setFetchedAt(new Date());
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [market, filter, retryCount, meta.endpoint]);

  function handleMarketChange(id) {
    setMarket(id);
    setFilter("popular");
    setStocks([]);
    setFetchedAt(null);
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
        <ScrollTabs tabs={FILTERS} activeId={filter} onChange={setFilter} ariaLabel="ETF 필터" />
      </div>

      <div className="flex items-center justify-end mb-2 min-h-[16px]">
        {fetchedAt && (
          <p className="text-xs text-gray-500">
            {fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준
          </p>
        )}
      </div>

      <div className="min-h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center h-[420px]">
            <Spin />
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />
        ) : (
          <EtfTable stocks={stocks} filter={filter} isUs={market === "us"} />
        )}
      </div>
    </>
  );
}
