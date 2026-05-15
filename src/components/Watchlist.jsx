import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { WATCHLIST } from "../config/watchlist";
import { BookmarkIcon } from "./ui/Icons";

const KR_LIST = WATCHLIST.filter((w) => w.market === "KR");
const KR_TICKERS = KR_LIST.map((w) => w.ticker);
const KR_NAMES = KR_LIST.map((w) => w.name);
const US_TICKERS = WATCHLIST.filter((w) => w.market === "US").map(
  (w) => w.ticker,
);

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

export default function Watchlist() {
  const [dataMap, setDataMap] = useState({});
  const [usdKrw, setUsdKrw] = useState(null);
  const [currency, setCurrency] = useState("krw");
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const hasUs = US_TICKERS.length > 0;

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = {};
    if (KR_TICKERS.length) {
      params.kr = KR_TICKERS.join(",");
      params.kr_names = KR_NAMES.join(",");
    }
    if (US_TICKERS.length) params.us = US_TICKERS.join(",");

    axiosInstance
      .get("/watchlist", { params })
      .then((res) => {
        const map = {};
        for (const item of res.data.items ?? []) map[item.ticker] = item;
        setDataMap(map);
        setUsdKrw(res.data.usd_krw ?? null);
        setFetchedAt(new Date());
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  function formatPrice(config, stock) {
    if (!stock) return "-";
    if (config.market === "KR")
      return (stock.price ?? 0).toLocaleString("ko-KR") + "원";
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
    <Card title="개발자의 관심종목" subtitle="응원해줘 친구들" icon={BookmarkIcon}>
      {/* 헤더 — 2줄 구조 */}
      <div className="mb-2 space-y-1 min-h-[40px]">
        {/* 1줄: 좌측 여백 + 원/달러 토글 (우) */}
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
        {loading ? (
          <div className="flex items-center justify-center h-[240px]">
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
              <span className="col-span-2 whitespace-nowrap">구분</span>
              <span className="col-span-4">종목명</span>
              <span className="col-span-3 text-right">현재가</span>
              <span className="col-span-3 text-right">등락률</span>
            </div>
            <div className="divide-y divide-gray-700/50">
              {WATCHLIST.map((config) => {
                const stock = dataMap[config.ticker];
                return (
                  <div
                    key={config.ticker}
                    className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                  >
                    <span
                      className={`col-span-2 text-xs font-semibold ${config.market === "KR" ? "text-blue-400" : "text-yellow-400"}`}
                    >
                      {config.market}
                    </span>
                    <span className="col-span-4 text-sm font-medium truncate pr-2">
                      {config.name}
                    </span>
                    <span className="col-span-3 text-right text-sm text-gray-300">
                      {formatPrice(config, stock)}
                    </span>
                    <span className="col-span-3 text-right text-sm">
                      <ChangeRate value={stock?.change_rate ?? 0} />
                    </span>
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
