import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

const FILTERS = [
  { id: "amount", label: "거래대금" },
  { id: "volume", label: "거래량" },
  { id: "rising", label: "급상승" },
  { id: "falling", label: "급하락" },
];

const MARKETS = [
  { id: "domestic", label: "국내" },
  { id: "overseas", label: "해외" },
];

function ChangeRate({ value }) {
  const color =
    value === 0
      ? "text-gray-400"
      : value > 0
        ? "text-red-400"
        : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export default function StockRanking() {
  const [market, setMarket] = useState("domestic");
  const [filter, setFilter] = useState("amount");
  const [stocks, setStocks] = useState([]);
  const [usdKrw, setUsdKrw] = useState(null);
  const [currency, setCurrency] = useState("krw");
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    const url =
      market === "overseas" ? "/stocks/us-ranking" : "/stocks/ranking";
    axiosInstance
      .get(url, { params: { type: filter } })
      .then((res) => {
        if (market === "overseas") {
          setStocks(res.data.stocks ?? []);
          setUsdKrw(res.data.usd_krw ?? null);
        } else {
          setStocks(res.data);
          setUsdKrw(null);
        }
        setFetchedAt(new Date());
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [market, filter, retryCount]);

  const isOverseas = market === "overseas";

  function formatPrice(stock) {
    if (!isOverseas) return (stock.price ?? 0).toLocaleString("ko-KR") + "원";
    if (currency === "usd")
      return (
        "$" +
        (stock.price_usd ?? 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    return (stock.price_krw ?? 0).toLocaleString("ko-KR") + "원";
  }

  return (
    <div>
      {/* 국내/해외 — 탭 스타일 */}
      <div className="flex items-center justify-between border-b border-gray-700 mb-3">
        <div className="flex gap-1">
          {MARKETS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMarket(m.id);
                setFilter("amount");
                setCurrency("krw");
              }}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                market === m.id
                  ? "text-white border-b-2 border-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 원/달러 토글 — 해외일 때만 표시 */}
        {isOverseas && (
          <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5 mb-1">
            {["krw", "usd"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
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

      {/* 업데이트 시각 */}
      <div className="flex items-center justify-between mb-2 min-h-[16px]">
        {isOverseas && usdKrw && (
          <p className="text-xs text-gray-500">
            1 USD = {usdKrw.toLocaleString("ko-KR")}원
          </p>
        )}
        {fetchedAt && (
          <p className="text-xs text-gray-500 ml-auto">
            {fetchedAt.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            기준
          </p>
        )}
      </div>

      {/* 필터 — 보조 칩 */}
      <div className="mb-4">
        <ScrollTabs
          tabs={FILTERS}
          activeId={filter}
          onChange={(id) => setFilter(id)}
          ariaLabel="종목 필터"
        />
      </div>

      {/* 고정 높이 영역 — 로딩 시 레이아웃 유지 */}
      <div className="min-h-[420px]">
        {loading ? (
          <div className="flex items-center justify-center h-[420px]">
            <Spin />
          </div>
        ) : error ? (
          <ErrorBlock
            message={error}
            onRetry={() => setRetryCount((c) => c + 1)}
          />
        ) : (
          <>
            <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
              <span className="col-span-2 whitespace-nowrap">순위</span>
              <span className="col-span-4">종목명</span>
              <span className="col-span-3 text-right">현재가</span>
              <span className="col-span-3 text-right">등락률</span>
            </div>

            <div className="divide-y divide-gray-700/50">
              {stocks.map((stock) => (
                <div
                  key={stock.ticker}
                  className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                >
                  <span className="col-span-2 text-gray-500 text-sm">
                    {stock.rank}
                  </span>
                  <span className="col-span-4 text-sm font-medium truncate pr-2">
                    {stock.name}
                  </span>
                  <span className="col-span-3 text-right text-sm text-gray-300">
                    {formatPrice(stock)}
                  </span>
                  <span className="col-span-3 text-right text-sm">
                    <ChangeRate value={stock.change_rate} />
                  </span>
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
