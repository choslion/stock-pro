import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";
import { BuildingLibraryIcon } from "./ui/Icons";

const FILTERS = [
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

function formatVolume(value) {
  if (!value) return "-";
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + "억주";
  if (value >= 10_000)      return Math.round(value / 10_000) + "만주";
  if (value >= 1_000)       return Math.round(value / 1_000) + "천주";
  return value.toLocaleString("ko-KR") + "주";
}

function EtfTable({ stocks, filter }) {
  const isAmount = filter === "amount";
  const isVolume = filter === "volume";
  const metricLabel = isAmount ? "거래대금" : isVolume ? "거래량" : "현재가";

  function metricValue(stock) {
    if (isAmount) return formatWon(stock.amount);
    if (isVolume) return formatVolume(stock.volume);
    return (stock.price ?? 0).toLocaleString("ko-KR") + "원";
  }

  return (
    <>
      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
        <span className="col-span-2 whitespace-nowrap">순위</span>
        <span className="col-span-4">ETF명</span>
        <span className="col-span-3 text-right">{metricLabel}</span>
        <span className="col-span-3 text-right">등락률</span>
      </div>
      <div className="divide-y divide-gray-700/50">
        {stocks.map((stock) => (
          <div
            key={stock.ticker}
            className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
          >
            <span className="col-span-2 text-gray-500 text-sm">{stock.rank}</span>
            <span className="col-span-4 text-sm font-medium truncate pr-2">{stock.name}</span>
            <span className="col-span-3 text-right text-sm text-gray-300">{metricValue(stock)}</span>
            <span className="col-span-3 text-right text-sm">
              <ChangeRate value={stock.change_rate} />
            </span>
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
  const [filter, setFilter]       = useState("amount");
  const [stocks, setStocks]       = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance
      .get("/etf", { params: { type: filter } })
      .then((res) => {
        setStocks(res.data.items ?? res.data ?? []);
        setFetchedAt(new Date());
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [filter, retryCount]);

  return (
    <Card title="국내 ETF" subtitle="국내 상장 ETF 순위" icon={BuildingLibraryIcon}>
      <div className="flex items-center justify-between mb-2 min-h-[16px]">
        {fetchedAt && (
          <p className="text-xs text-gray-500 ml-auto">
            {fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 기준
          </p>
        )}
      </div>

      <div className="mb-4">
        <ScrollTabs tabs={FILTERS} activeId={filter} onChange={setFilter} ariaLabel="ETF 필터" />
      </div>

      <div className="min-h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center h-[420px]">
            <Spin />
          </div>
        ) : error ? (
          <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />
        ) : (
          <EtfTable stocks={stocks} filter={filter} />
        )}
      </div>
    </Card>
  );
}
