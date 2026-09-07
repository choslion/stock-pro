import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, BaselineSeries, LineStyle } from "lightweight-charts";
import axiosInstance from "../lib/axiosInstance";
import { Q, fetchers } from "../lib/queries";
import { computeWhatIf, formatKrw, chickenCount } from "../lib/whatIf";
import type { ChartPoint } from "../types/api";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { ClockFaceIcon, MagnifyingGlassIcon, XMarkIcon } from "./ui/Icons";
import { useToastStore } from "../store/useToastStore";

export interface StockPick {
  ticker: string;
  name:   string;
  market: "KR" | "US";
}

const PRESET_STOCKS: StockPick[] = [
  { ticker: "005930", name: "삼성전자",   market: "KR" },
  { ticker: "000660", name: "SK하이닉스", market: "KR" },
  { ticker: "086520", name: "에코프로",   market: "KR" },
  { ticker: "035420", name: "NAVER",      market: "KR" },
  { ticker: "AAPL",   name: "애플",       market: "US" },
  { ticker: "TSLA",   name: "테슬라",     market: "US" },
  { ticker: "NVDA",   name: "엔비디아",   market: "US" },
];

const AMOUNT_PRESETS = [
  { man: 10,    label: "10만원"    },
  { man: 100,   label: "100만원"   },
  { man: 1000,  label: "1,000만원" },
] as const;

const PERIODS = [
  { id: "1y",  label: "1년 전",  years: 1  },
  { id: "3y",  label: "3년 전",  years: 3  },
  { id: "5y",  label: "5년 전",  years: 5  },
  { id: "10y", label: "10년 전", years: 10 },
] as const;

type PeriodId = typeof PERIODS[number]["id"] | "custom";

const MAX_AMOUNT_MAN = 1_000_000; // 100억원

function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yearsAgoIso(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return toLocalIso(d);
}

/** 받침 유무에 따라 조사 선택 (예: 삼성전자를 / 애플을) */
function josa(word: string, withJong: string, withoutJong: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return withoutJong; // 한글이 아니면 (영문 등)
  return (code - 0xac00) % 28 !== 0 ? withJong : withoutJong;
}

/** 축 라벨용 축약 표기 (2.5억 / 1,200만 / 9,900) */
function compactKrw(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}억`;
  if (v >= 10_000)      return `${Math.round(v / 10_000).toLocaleString("ko-KR")}만`;
  return Math.round(v).toLocaleString("ko-KR");
}

/* ── 평가액 차트 (원금 기준선 위 빨강 / 아래 파랑) ── */
function ValueChart({ series, baseValue }: { series: ChartPoint[]; baseValue: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize:     true,
      layout:       { background: { color: "transparent" }, textColor: "#9ca3af", attributionLogo: false },
      grid:         { vertLines: { color: "#1f2937" }, horzLines: { color: "#1f2937" } },
      crosshair:    { mode: 1 },
      rightPriceScale: { borderColor: "#374151" },
      timeScale:    { borderColor: "#374151", rightOffset: 0 },
      handleScroll: false,
      handleScale:  false,
      localization: { priceFormatter: compactKrw },
    });

    const s = chart.addSeries(BaselineSeries, {
      baseValue:        { type: "price", price: baseValue },
      topLineColor:     "#f87171",
      topFillColor1:    "rgba(248, 113, 113, 0.25)",
      topFillColor2:    "rgba(248, 113, 113, 0.02)",
      bottomLineColor:  "#60a5fa",
      bottomFillColor1: "rgba(96, 165, 250, 0.02)",
      bottomFillColor2: "rgba(96, 165, 250, 0.25)",
      lineWidth:        2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    s.createPriceLine({
      price: baseValue,
      color: "#6b7280",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "원금",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s.setData(series as any);
    chart.timeScale().fitContent();

    return () => { chart.remove(); };
  }, [series, baseValue]);

  return <div ref={containerRef} style={{ width: "100%", height: 240 }} />;
}

/* ── 종목 검색 (인라인) ── */
function StockSearch({ onSelect }: { onSelect: (s: StockPick) => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<StockPick[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      axiosInstance
        .get<{ items: Array<StockPick & { price?: number; change_rate: number }> }>("/search", { params: { q } })
        .then((res) => setResults((res.data.items ?? []).slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700/60">
        <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="다른 종목 검색 (예: 카카오, MSFT)"
          aria-label="타임머신 종목 검색"
          className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="검색어 지우기"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg bg-gray-900 border border-gray-700/80 shadow-xl overflow-hidden">
          {loading && <div className="flex justify-center py-3"><Spin /></div>}
          {!loading && results.length === 0 && (
            <p className="text-center text-gray-500 text-xs py-3">검색 결과가 없습니다</p>
          )}
          {!loading && results.map((item) => (
            <button
              key={`${item.market}-${item.ticker}`}
              onClick={() => { onSelect(item); setQuery(""); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/70 transition-colors"
            >
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded
                ${item.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>
                {item.market}
              </span>
              <span className="text-xs font-medium text-white truncate">{item.name}</span>
              <span className="text-[11px] text-gray-500 shrink-0">{item.ticker}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors whitespace-nowrap ${
    active
      ? "bg-blue-500/20 text-blue-300 border-blue-400/50"
      : "bg-gray-900/60 text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/60"
  }`;

interface TimeMachineProps {
  onBack?:      () => void;
  initialStock?: StockPick;
}

export default function TimeMachine({ onBack, initialStock }: TimeMachineProps) {
  const [stock, setStock]               = useState<StockPick>(initialStock ?? PRESET_STOCKS[0]);
  const [amountInput, setAmountInput]   = useState("100"); // 만원 단위
  const [period, setPeriod]             = useState<PeriodId>("3y");
  const [startDate, setStartDate]       = useState(yearsAgoIso(3));
  const addToast = useToastStore((s) => s.addToast);

  const amountManValue = Number(amountInput);
  const amountValid = Number.isFinite(amountManValue) && amountManValue >= 1 && amountManValue <= MAX_AMOUNT_MAN;
  const amountMan = amountValid ? Math.floor(amountManValue) : 0;
  const amount = amountMan * 10_000;
  const apiPeriod = period === "custom" ? "10y" : period;

  const stockQ = useQuery({
    queryKey: Q.chart(stock.ticker, stock.market, apiPeriod, startDate),
    queryFn:  () => fetchers.chart(stock.ticker, stock.market, apiPeriod, startDate),
    staleTime: 5 * 60 * 1000,
  });

  const fxQ = useQuery({
    queryKey: Q.chart("USDKRW=X", "US", apiPeriod, startDate),
    queryFn:  () => fetchers.chart("USDKRW=X", "US", apiPeriod, startDate),
    enabled:  stock.market === "US",
    staleTime: 5 * 60 * 1000,
  });

  const benchmarkTicker = stock.market === "KR" ? "^KS11" : "^GSPC";
  const benchmarkLabel  = stock.market === "KR" ? "KOSPI" : "S&P 500";
  const benchmarkQ = useQuery({
    queryKey: Q.chart(benchmarkTicker, "US", apiPeriod, startDate),
    queryFn:  () => fetchers.chart(benchmarkTicker, "US", apiPeriod, startDate),
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo(
    () => (stockQ.data?.items && amountValid
      ? computeWhatIf(stockQ.data.items, amount, {
          fxItems: stock.market === "US" ? fxQ.data?.items : undefined,
        })
      : null),
    [stockQ.data, fxQ.data, stock.market, amount, amountValid],
  );

  const benchmarkResult = useMemo(
    () => (benchmarkQ.data?.items && amountValid
      ? computeWhatIf(benchmarkQ.data.items, amount, {
          fxItems: stock.market === "US" ? fxQ.data?.items : undefined,
        })
      : null),
    [benchmarkQ.data, fxQ.data, stock.market, amount, amountValid],
  );

  const periodLabel = period === "custom"
    ? `${startDate}부터`
    : PERIODS.find((p) => p.id === period)?.label ?? startDate;

  const selectPeriod = (id: Exclude<PeriodId, "custom">, years: number) => {
    setPeriod(id);
    setStartDate(yearsAgoIso(years));
  };

  const handleShare = async () => {
    if (!result) return;
    const emoji = result.profit > 0 ? "🤑" : result.profit < 0 ? "😭" : "⏱️";
    const text =
      `${emoji} ${periodLabel} ${stock.name}에 ${formatKrw(amount)} 넣었다면 ` +
      `지금 ${formatKrw(result.finalValue)}! (${result.rate >= 0 ? "+" : ""}${result.rate.toFixed(1)}%) — stock-pro`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "만약 그때 샀더라면", text });
      } else {
        await navigator.clipboard.writeText(text);
        addToast("결과를 클립보드에 복사했어요!", "success");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") addToast("공유에 실패했어요.", "error");
    }
  };

  const isLoading = stockQ.isLoading || (stock.market === "US" && fxQ.isLoading);
  const error = stockQ.error ?? (stock.market === "US" ? fxQ.error : null);
  const retryAll = () => {
    stockQ.refetch();
    if (stock.market === "US") fxQ.refetch();
    benchmarkQ.refetch();
  };
  const isProfit = (result?.profit ?? 0) > 0;
  const isLoss   = (result?.profit ?? 0) < 0;
  const chickens = result ? chickenCount(result.profit) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3 mb-5">
          {onBack ? (
            <button
              onClick={onBack}
              aria-label="차트 화면으로 돌아가기"
              className="w-8 h-8 shrink-0 rounded-full border border-gray-700/70 bg-gray-900/50
                         text-gray-400 hover:text-white hover:bg-gray-700/70 transition-colors
                         flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <span className="w-8 h-8 shrink-0 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
              <ClockFaceIcon className="w-4 h-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">만약 그때 샀더라면</h2>
            <p className="mt-0.5 text-xs text-gray-500">종목·금액·시점을 고르면 지금의 결과를 계산해드려요</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 종목 선택 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">어떤 종목을</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_STOCKS.map((s) => (
                <button
                  key={s.ticker}
                  onClick={() => setStock(s)}
                  aria-pressed={stock.ticker === s.ticker}
                  className={chipClass(stock.ticker === s.ticker)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <StockSearch onSelect={setStock} />
          </div>

          {/* 금액 선택 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">얼마나</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {AMOUNT_PRESETS.map((a) => (
                <button
                  key={a.man}
                  onClick={() => setAmountInput(String(a.man))}
                  aria-pressed={amountMan === a.man}
                  className={chipClass(amountMan === a.man)}
                >
                  {a.label}
                </button>
              ))}
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-900/60 border border-gray-700/60">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => {
                    if (/^\d*$/.test(e.target.value)) setAmountInput(e.target.value);
                  }}
                  onBlur={() => {
                    if (!amountInput) setAmountInput("100");
                    else if (Number(amountInput) < 1) setAmountInput("1");
                    else if (Number(amountInput) > MAX_AMOUNT_MAN) setAmountInput(String(MAX_AMOUNT_MAN));
                  }}
                  aria-label="투자 금액 (만원 단위)"
                  className="w-16 bg-transparent text-xs text-right text-white outline-none
                             [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500">만원</span>
              </div>
            </div>
            {!amountValid && amountInput && (
              <p className="mt-1.5 text-[11px] text-red-400">1만원부터 100억원까지 입력할 수 있어요.</p>
            )}
          </div>

          {/* 시점 선택 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">언제 샀다면</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPeriod(p.id, p.years)}
                  aria-pressed={period === p.id}
                  className={chipClass(period === p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700/60">
              <span className="text-xs text-gray-500">날짜 직접 선택</span>
              <input
                type="date"
                value={startDate}
                min={yearsAgoIso(20)}
                max={toLocalIso(new Date())}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDate(e.target.value);
                    setPeriod("custom");
                  }
                }}
                className="bg-transparent text-xs text-gray-200 outline-none [color-scheme:dark]"
              />
            </label>
          </div>

        </div>
      </Card>

      {/* 결과 */}
      <Card>
        {isLoading && (
          <div className="flex justify-center py-14"><Spin /></div>
        )}
        {error && !isLoading && (
          <ErrorBlock message={parseError(error)} onRetry={retryAll} />
        )}
        {!isLoading && !error && !amountValid && (
          <p className="text-center text-sm text-gray-500 py-14">올바른 투자 금액을 입력해주세요.</p>
        )}
        {!isLoading && !error && amountValid && !result && (
          <p className="text-center text-sm text-gray-500 py-14">
            해당 기간의 시세 데이터가 부족해요. 다른 시점을 선택해보세요.
          </p>
        )}
        {!isLoading && !error && result && (
          <div>
            <p className="text-sm text-gray-400">
              {result.buyDate}에 <span className="font-semibold text-gray-200">{stock.name}</span>
              {josa(stock.name, "을", "를")} <span className="font-semibold text-gray-200">{formatKrw(amount)}</span>어치 샀다면
            </p>
            {result.buyDate !== startDate && (
              <p className="mt-1 text-[11px] text-gray-500">선택한 날짜 이후 첫 거래일을 매수일로 계산했어요.</p>
            )}
            <div className="flex flex-wrap items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-bold text-white tabular-nums">
                지금 {formatKrw(result.finalValue)}
              </span>
              <span className={`text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg
                ${isProfit ? "bg-red-500/15 text-red-400" : isLoss ? "bg-blue-500/15 text-blue-400" : "bg-gray-700/50 text-gray-300"}`}>
                {isProfit ? "+" : ""}{result.rate.toFixed(1)}%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 tabular-nums">
              정확히 {result.finalValue.toLocaleString("ko-KR")}원 · {result.lastDate} 기준
            </p>
            <p className={`text-sm font-medium mt-1.5 ${isProfit ? "text-red-400" : isLoss ? "text-blue-400" : "text-gray-400"}`}>
              {isProfit
                ? <>{formatKrw(result.profit)} 벌었어요 {chickens > 0 && `— 치킨 ${chickens.toLocaleString("ko-KR")}마리 🍗`}</>
                : isLoss
                  ? <>{formatKrw(Math.abs(result.profit))} 잃었어요 {chickens > 0 && `— 치킨 ${chickens.toLocaleString("ko-KR")}마리가 날아갔어요 🍗💨`}</>
                  : <>평가액은 투자금과 같아요.</>}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-lg bg-gray-900/50 px-3 py-2">
                <p className="text-[10px] text-gray-500">매수가</p>
                <p className="mt-0.5 text-xs font-medium text-gray-300 tabular-nums">
                  {stock.market === "KR" ? `${result.buyPrice.toLocaleString("ko-KR")}원` : `$${result.buyPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="rounded-lg bg-gray-900/50 px-3 py-2">
                <p className="text-[10px] text-gray-500">최근 가격</p>
                <p className="mt-0.5 text-xs font-medium text-gray-300 tabular-nums">
                  {stock.market === "KR" ? `${result.lastPrice.toLocaleString("ko-KR")}원` : `$${result.lastPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </p>
              </div>
            </div>

            {stock.market === "US" && result.fxApplied && (
              <p className="mt-2 text-[11px] text-gray-500">
                원·달러 환율 {result.buyFx.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원 → {result.lastFx.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}원 반영
              </p>
            )}

            {benchmarkResult && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-2.5">
                <div>
                  <p className="text-[11px] text-gray-500">같은 기간 {benchmarkLabel}</p>
                  <p className="text-sm font-semibold text-gray-300">
                    {benchmarkResult.rate > 0 ? "+" : ""}{benchmarkResult.rate.toFixed(1)}%
                  </p>
                </div>
                <p className={`text-xs font-semibold ${result.rate - benchmarkResult.rate > 0 ? "text-red-400" : result.rate - benchmarkResult.rate < 0 ? "text-blue-400" : "text-gray-400"}`}>
                  {benchmarkLabel} 대비 {result.rate - benchmarkResult.rate > 0 ? "+" : ""}{(result.rate - benchmarkResult.rate).toFixed(1)}%p
                </p>
              </div>
            )}

            <div className="mt-4">
              <ValueChart series={result.series} baseValue={amount} />
            </div>

            <div className="flex items-center justify-between gap-3 mt-3">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                투자금 전액 기준 · {stock.market === "US" && "과거·현재 환율 반영 · "}배당·세금·수수료 미반영
              </p>
              <button
                onClick={handleShare}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20
                           border border-blue-500/20 text-blue-300 text-xs font-medium transition-colors"
              >
                결과 공유
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
