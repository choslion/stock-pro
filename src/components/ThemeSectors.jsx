import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";
import { THEMES } from "../config/themes";
import { GridIcon } from "./ui/Icons";

const THEME_TABS = THEMES.map((t) => ({ id: t.id, label: t.label }));

function ChangeRate({ value }) {
  const color = value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function SectionHeader({ children }) {
  return (
    <p className="text-xs text-gray-500 font-semibold px-2 pt-3 pb-1 border-t border-gray-700/60 mt-1">
      {children}
    </p>
  );
}

export default function ThemeSectors() {
  const [themeId, setThemeId]     = useState(THEMES[0].id);
  const [krMap, setKrMap]               = useState({});
  const [usStocks, setUsStocks]         = useState([]);
  const [usdKrw, setUsdKrw]             = useState(null);
  const [currency, setCurrency]         = useState("krw");
  const [fetchedAt, setFetchedAt]       = useState(null);
  const [krLoading, setKrLoading]       = useState(true);
  const [usLoading, setUsLoading]       = useState(true);
  const [krError, setKrError]           = useState("");
  const [usError, setUsError]           = useState("");
  const [retryCount, setRetryCount]     = useState(0);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    setKrMap({});
    setUsStocks([]);
    setKrError("");
    setUsError("");
    setFetchedAt(null);

    // 국내 — 고정 watchlist
    if (theme.kr_stocks.length > 0) {
      setKrLoading(true);
      axiosInstance
        .get("/watchlist", { params: { kr: theme.kr_stocks.map((s) => s.ticker).join(",") } })
        .then((res) => {
          const map = {};
          for (const item of res.data.items ?? []) map[item.ticker] = item;
          setKrMap(map);
        })
        .catch((err) => setKrError(parseError(err)))
        .finally(() => setKrLoading(false));
    } else {
      setKrLoading(false);
    }

    // 해외 — /theme-ranking (1시간 캐시, 펀더멘털 포함)
    if (theme.us_candidates.length > 0) {
      setUsLoading(true);
      axiosInstance
        .get("/theme-ranking", {
          params: {
            tickers: theme.us_candidates.map((s) => s.ticker).join(","),
            limit: 10,
          },
        })
        .then((res) => {
          setUsStocks(res.data.stocks ?? []);
          setUsdKrw(res.data.usd_krw ?? null);
          setFetchedAt(new Date());
        })
        .catch((err) => setUsError(parseError(err)))
        .finally(() => setUsLoading(false));
    } else {
      setUsLoading(false);
    }
  }, [themeId, retryCount]);

  const usNameMap = Object.fromEntries(theme.us_candidates.map((s) => [s.ticker, s.name]));

  const usValidRates = usStocks.map((s) => s.change_rate).filter((r) => r != null);
  const usAvg = usValidRates.length > 0
    ? usValidRates.reduce((a, b) => a + b, 0) / usValidRates.length
    : null;

  function fmtUsPrice(stock) {
    if (!stock) return "-";
    if (currency === "usd") {
      return "$" + (stock.price_usd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (stock.price_krw ?? 0).toLocaleString("ko-KR") + "원";
  }

  const isLoading = krLoading || usLoading;

  return (
    <Card title="분야별 동향" subtitle="테마별 주요 종목 현황" icon={GridIcon}>
      {/* 테마 탭 */}
      <div className="mb-4">
        <ScrollTabs tabs={THEME_TABS} activeId={themeId} onChange={setThemeId} ariaLabel="테마 선택" />
      </div>

      {/* 헤더 — 2줄 구조로 모바일 대응 */}
      <div className="mb-2 space-y-1 min-h-[40px]">
        {/* 1줄: 해외 평균 (좌) + 원/달러 토글 (우) */}
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${
            !usLoading && usAvg !== null
              ? usAvg > 0 ? "text-red-400" : usAvg < 0 ? "text-blue-400" : "text-gray-400"
              : "text-transparent"
          }`}>
            {!usLoading && usAvg !== null
              ? `해외 평균 ${usAvg > 0 ? "+" : ""}${usAvg.toFixed(2)}%`
              : "·"}
          </span>
          <div className="flex gap-1 bg-gray-700/40 rounded-full p-0.5" role="group" aria-label="통화 선택">
            {["krw", "usd"].map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  currency === c ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {c === "krw" ? "원" : "달러"}
              </button>
            ))}
          </div>
        </div>
        {/* 2줄: 환율 (좌) + 기준 시각 (우) */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{!isLoading && usdKrw ? `1 USD = ${usdKrw.toLocaleString("ko-KR")}원` : ""}</span>
          <span>
            {fetchedAt
              ? fetchedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " 기준"
              : ""}
          </span>
        </div>
      </div>

      {/* 컬럼 헤더 — col-span-2/4 로 첫 컬럼 여유 확보 */}
      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
        <span className="col-span-2 whitespace-nowrap">구분</span>
        <span className="col-span-4">종목명</span>
        <span className="col-span-3 text-right">현재가</span>
        <span className="col-span-3 text-right">등락률</span>
      </div>

      <div className="min-h-[420px]">
        {/* 국내 섹션 */}
        {theme.kr_stocks.length > 0 && (
          <>
            <SectionHeader>
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-blue-900/60 text-blue-300 text-[10px] font-bold px-1.5 py-0.5 rounded">KR</span>
                국내
              </span>
            </SectionHeader>
            {krLoading ? (
              <div className="flex justify-center py-4"><Spin /></div>
            ) : krError ? (
              <ErrorBlock message={krError} onRetry={() => setRetryCount((c) => c + 1)} />
            ) : (
              <div className="divide-y divide-gray-700/50">
                {theme.kr_stocks.map((config) => {
                  const stock = krMap[config.ticker];
                  return (
                    <div
                      key={config.ticker}
                      className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                    >
                      <span className="col-span-2 text-xs font-semibold text-blue-400">KR</span>
                      <span className="col-span-4 text-sm font-medium truncate pr-2">{config.name}</span>
                      <span className="col-span-3 text-right text-sm text-gray-300">
                        {stock ? (stock.price ?? 0).toLocaleString("ko-KR") + "원" : "-"}
                      </span>
                      <span className="col-span-3 text-right text-sm">
                        <ChangeRate value={stock?.change_rate ?? 0} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 해외 섹션 */}
        {theme.us_candidates.length > 0 && (
          <>
            <SectionHeader><span className="inline-flex items-center gap-1.5"><span className="bg-yellow-900/60 text-yellow-300 text-[10px] font-bold px-1.5 py-0.5 rounded">US</span>해외 — 자동 선별 상위 10 (시가총액·매출성장·거래량·변동성·R&D)</span></SectionHeader>
            {usLoading ? (
              <div className="flex justify-center py-6"><Spin /></div>
            ) : usError ? (
              <ErrorBlock message={usError} onRetry={() => setRetryCount((c) => c + 1)} />
            ) : (
              <div className="divide-y divide-gray-700/50">
                {usStocks.map((stock) => (
                  <div
                    key={stock.ticker}
                    className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
                  >
                    <span className="col-span-2 text-xs font-semibold text-yellow-400">
                      {stock.rank}
                    </span>
                    <span className="col-span-4 text-sm font-medium truncate pr-2">
                      {usNameMap[stock.ticker] ?? stock.ticker}
                    </span>
                    <span className="col-span-3 text-right text-sm text-gray-300">
                      {fmtUsPrice(stock)}
                    </span>
                    <span className="col-span-3 text-right text-sm">
                      <ChangeRate value={stock.change_rate ?? 0} />
                    </span>
                  </div>
                ))}
                {usStocks.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">데이터가 없습니다.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
