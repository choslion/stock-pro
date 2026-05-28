import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, LineSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import type { SearchResultItem } from "./SearchModal";

function SparkleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.592-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
  );
}

const PERIODS = [
  { id: "1w", label: "1주" },
  { id: "1m", label: "1달" },
  { id: "3m", label: "3달" },
  { id: "6m", label: "6달" },
  { id: "1y", label: "1년" },
] as const;

type Period = typeof PERIODS[number]["id"];

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function XMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface StockChartModalProps {
  stock:   SearchResultItem;
  onBack:  () => void;
  onClose: () => void;
}

export default function StockChartModal({ stock, onBack, onClose }: StockChartModalProps) {
  const [period, setPeriod]     = useState<Period>("1m");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [aiText, setAiText]     = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen]     = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef    = useRef<ISeriesApi<"Line"> | null>(null);

  const isPos = stock.change_rate > 0;
  const isNeg = stock.change_rate < 0;
  const rateColor = isPos ? "text-red-400" : isNeg ? "text-blue-400" : "text-gray-400";
  const lineColor = isPos ? "#f87171" : isNeg ? "#60a5fa" : "#9ca3af";

  const priceStr = stock.market === "KR"
    ? (stock.price ? stock.price.toLocaleString("ko-KR") + "원" : "-")
    : (stock.price ? "$" + stock.price.toFixed(2) : "-");

  /* ── 차트 초기화 ── */
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize:    true,
      layout:      { background: { color: "transparent" }, textColor: "#9ca3af", attributionLogo: false },
      grid:        { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      crosshair:   { mode: 1 },
      rightPriceScale: { borderColor: "#374151" },
      timeScale:    { borderColor: "#374151", timeVisible: true, rightOffset: 8 },
      handleScroll: false,
      handleScale:  false,
    });

    const series = chart.addSeries(LineSeries, {
      color:     lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    return () => { chart.remove(); };
  }, [lineColor]);

  /* ── 데이터 로드 ── */
  useEffect(() => {
    if (!seriesRef.current) return;
    setLoading(true);
    setError(false);

    axiosInstance
      .get<{ items: Array<{ time: string; value: number }> }>("/chart", {
        params: { ticker: stock.ticker, market: stock.market, period },
      })
      .then((res) => {
        const items = res.data.items ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        seriesRef.current!.setData(items as any);
        chartRef.current!.timeScale().fitContent();
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [stock.ticker, stock.market, period]);

  /* ── ESC 닫기 ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  const handleOverlay = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onBack();
  }, [onBack]);

  const handleAiAnalysis = useCallback(() => {
    if (aiText) { setAiOpen((v) => !v); return; }
    setAiOpen(true);
    setAiLoading(true);
    axiosInstance
      .get<{ analysis: string }>("/ai-stock-analysis", {
        params: { ticker: stock.ticker, market: stock.market, name: stock.name },
      })
      .then((res) => setAiText(res.data.analysis ?? ""))
      .catch(() => setAiText("분석 정보를 불러올 수 없습니다."))
      .finally(() => setAiLoading(false));
  }, [aiText, stock]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-10 px-4"
      style={{ zIndex: 60 }}
      onClick={handleOverlay}
    >
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideDown 0.18s ease-out" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/60">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="검색으로 돌아가기"
          >
            <ArrowLeftIcon />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded
                ${stock.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>
                {stock.market}
              </span>
              <p className="text-sm font-semibold text-white truncate">{stock.name}</p>
              <p className="text-xs text-gray-500 shrink-0">{stock.ticker}</p>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold text-white tabular-nums">{priceStr}</span>
              <span className={`text-xs font-semibold tabular-nums ${rateColor}`}>
                {isPos ? "+" : ""}{stock.change_rate.toFixed(2)}%
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* 차트 영역 */}
        <div className="px-2 pt-3 pb-1 relative" style={{ height: 260 }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70">
              <Spin />
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-gray-500">차트 데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        {/* 기간 탭 */}
        <div className="flex gap-1 px-4 py-3 border-t border-gray-700/60">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${period === p.id
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-gray-500 hover:text-gray-300"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* AI 분석 */}
        <div className="px-4 pb-4">
          <button
            onClick={handleAiAnalysis}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                       bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20
                       text-blue-300 text-xs font-medium transition-colors"
          >
            <SparkleIcon className="w-3.5 h-3.5" />
            AI 종목 분석
          </button>

          {aiOpen && (
            <div className="mt-2 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-slate-900/60 px-4 py-3">
              {aiLoading ? (
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-700/60 rounded-full animate-pulse w-full" />
                  <div className="h-2.5 bg-gray-700/60 rounded-full animate-pulse w-5/6" />
                  <div className="h-2.5 bg-gray-700/60 rounded-full animate-pulse w-4/6" />
                </div>
              ) : (
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{aiText}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
