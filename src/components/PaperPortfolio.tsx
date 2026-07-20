import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchers, Q } from "../lib/queries";
import {
  HORIZON_LABELS,
  INITIAL_PAPER_CASH,
  TRADE_REASON_LABELS,
  calculateMatchedBenchmarkReturn,
  calculatePortfolio,
  formatKrwCompact,
  getTradeVersion,
  getWeekKey,
  selectReviewHoldings,
} from "../lib/portfolio";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { useToastStore } from "../store/useToastStore";
import parseError from "../lib/parseError";
import type { SearchResultItem } from "./SearchModal";
import PaperTradeSheet from "./PaperTradeSheet";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import {
  BookmarkIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
} from "./ui/Icons";

interface PaperPortfolioProps {
  onOpenSearch: () => void;
}

function Rate({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const color = value > 0 ? "text-red-400" : value < 0 ? "text-blue-400" : "text-gray-400";
  return <span className={`font-semibold tabular-nums ${color}`}>{value > 0 ? "+" : ""}{value.toFixed(2)}{suffix}</span>;
}

function BenchmarkValue({ value }: { value: number | null }) {
  return value === null ? <span className="text-gray-600">-</span> : <Rate value={value} />;
}

export default function PaperPortfolio({ onOpenSearch }: PaperPortfolioProps) {
  const trades = usePortfolioStore((state) => state.trades);
  const reviews = usePortfolioStore((state) => state.reviews);
  const saveReview = usePortfolioStore((state) => state.saveReview);
  const watchlist = useWatchlistStore((state) => state.entries);
  const removeWatchlist = useWatchlistStore((state) => state.remove);
  const addToast = useToastStore((state) => state.addToast);
  const [tradeStock, setTradeStock] = useState<SearchResultItem | null>(null);
  const [showAllWatchlist, setShowAllWatchlist] = useState(false);
  const [showReviewHistory, setShowReviewHistory] = useState(false);

  const quoteEntries = useMemo(() => {
    const map = new Map<string, { ticker: string; name: string; market: "KR" | "US" }>();
    for (const item of watchlist) map.set(`${item.market}:${item.ticker}`, item);
    for (const item of trades) map.set(`${item.market}:${item.ticker}`, item);
    return [...map.values()];
  }, [trades, watchlist]);

  const { krTickers, usTickers, quoteParams } = useMemo(() => {
    const kr = quoteEntries.filter((item) => item.market === "KR");
    const us = quoteEntries.filter((item) => item.market === "US");
    const params: Record<string, string> = {};
    if (kr.length) {
      params.kr = kr.map((item) => item.ticker).join(",");
      params.kr_names = kr.map((item) => item.name).join(",");
    }
    if (us.length) params.us = us.map((item) => item.ticker).join(",");
    return {
      krTickers: kr.map((item) => item.ticker),
      usTickers: us.map((item) => item.ticker),
      quoteParams: params,
    };
  }, [quoteEntries]);

  const { data: quoteData, isLoading: quotesLoading } = useQuery({
    queryKey: Q.watchlist(krTickers.join(","), usTickers.join(",")),
    queryFn: () => fetchers.watchlist(quoteParams),
    enabled: quoteEntries.length > 0,
  });

  const quoteMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof quoteData>["items"][number]>();
    for (const item of quoteData?.items ?? []) {
      if (krTickers.includes(item.ticker)) map.set(`KR:${item.ticker}`, item);
      else map.set(`US:${item.ticker}`, item);
    }
    return map;
  }, [krTickers, quoteData]);

  const currentPrices = useMemo<Record<string, number>>(() => {
    const prices: Record<string, number> = {};
    for (const entry of quoteEntries) {
      const quote = quoteMap.get(`${entry.market}:${entry.ticker}`);
      const price = entry.market === "KR" ? quote?.price : quote?.price_krw;
      if (price && price > 0) prices[`${entry.market}:${entry.ticker}`] = price;
    }
    return prices;
  }, [quoteEntries, quoteMap]);

  const summary = useMemo(() => calculatePortfolio(trades, currentPrices), [trades, currentPrices]);
  const oldestTradeDate = useMemo(() => {
    if (!trades.length) return undefined;
    return [...trades].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].createdAt.slice(0, 10);
  }, [trades]);

  const kospiQuery = useQuery({
    // /chart의 market="US"는 미국 시장 의미가 아니라 yfinance 조회 경로를 선택한다.
    queryKey: Q.chart("^KS11", "US", "10y", oldestTradeDate),
    queryFn: () => fetchers.chart("^KS11", "US", "10y", oldestTradeDate),
    enabled: Boolean(oldestTradeDate),
  });
  const sp500Query = useQuery({
    queryKey: Q.chart("^GSPC", "US", "10y", oldestTradeDate),
    queryFn: () => fetchers.chart("^GSPC", "US", "10y", oldestTradeDate),
    enabled: Boolean(oldestTradeDate),
  });
  const usdKrwQuery = useQuery({
    queryKey: Q.chart("USDKRW=X", "US", "10y", oldestTradeDate),
    queryFn: () => fetchers.chart("USDKRW=X", "US", "10y", oldestTradeDate),
    enabled: Boolean(oldestTradeDate),
  });
  const kospiReturn = calculateMatchedBenchmarkReturn(trades, kospiQuery.data?.items);
  const sp500Return = usdKrwQuery.data
    ? calculateMatchedBenchmarkReturn(trades, sp500Query.data?.items, usdKrwQuery.data.items)
    : null;

  const weekKey = getWeekKey();
  const currentReview = reviews.find((review) => review.weekKey === weekKey);
  const previousReviews = reviews.filter((review) => review.weekKey !== weekKey);
  const tradeVersion = getTradeVersion(trades);
  const reviewIsStale = Boolean(currentReview && currentReview.tradeVersion !== tradeVersion);
  const reviewHoldings = useMemo(() => selectReviewHoldings(summary.holdings), [summary.holdings]);
  const reviewMutation = useMutation({
    mutationFn: () => fetchers.portfolioReview({
      portfolio_return: summary.returnRate,
      kospi_return: kospiReturn,
      sp500_return: sp500Return,
      holdings: reviewHoldings.map((holding) => ({
        name: holding.name,
        ticker: holding.ticker,
        market: holding.market,
        return_rate: holding.returnRate,
        reason: TRADE_REASON_LABELS[holding.latestReason],
        horizon: HORIZON_LABELS[holding.latestHorizon],
      })),
      recent_trades: trades.slice(0, 10).map((trade) => ({
        name: trade.name,
        reason: TRADE_REASON_LABELS[trade.reason],
        thesis: trade.thesis,
        created_at: trade.createdAt,
      })),
    }),
    onSuccess: (data) => {
      saveReview({
        weekKey,
        summary: data.summary,
        bestDecision: data.best_decision,
        repeatedMistake: data.repeated_mistake,
        createdAt: data.generated_at,
        tradeVersion,
      });
      addToast("이번 주 투자 복기를 만들었어요.", "success");
    },
    onError: (error) => addToast(parseError(error)),
  });

  const openTrade = (entry: { ticker: string; name: string; market: "KR" | "US" }) => {
    const quote = quoteMap.get(`${entry.market}:${entry.ticker}`);
    const originalPrice = entry.market === "KR" ? quote?.price : (quote?.price_usd ?? quote?.price);
    setTradeStock({
      ticker: entry.ticker,
      name: entry.name,
      market: entry.market,
      price: originalPrice,
      change_rate: quote?.change_rate ?? 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-400">PAPER PORTFOLIO</p>
          <h1 className="mt-1 text-xl font-bold text-white">모의투자</h1>
          <p className="mt-1 text-xs text-gray-500">가상 자금으로 판단을 기록하고 복기해보세요.</p>
        </div>
        <button onClick={onOpenSearch} className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-500 px-3 text-xs font-semibold text-white hover:bg-blue-400">
          <MagnifyingGlassIcon className="h-3.5 w-3.5" />
          종목 찾기
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/70 via-gray-800 to-gray-800 p-5 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400">총 가상 자산</p>
            <p className="mt-1 text-2xl font-bold text-white tabular-nums">{formatKrwCompact(summary.totalAssets)}</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <Rate value={summary.returnRate} />
              <span className="text-gray-600">{summary.profit >= 0 ? "+" : ""}{formatKrwCompact(summary.profit)}</span>
            </div>
          </div>
          <div className="rounded-xl bg-black/20 p-2.5 text-blue-300">
            <CurrencyDollarIcon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-gray-700/70 border-t border-gray-700/60 pt-4 text-center">
          <div><p className="text-[10px] text-gray-500">가상 현금</p><p className="mt-1 text-xs font-semibold text-gray-200 tabular-nums">{formatKrwCompact(summary.cash)}</p></div>
          <div><p className="text-[10px] text-gray-500">KOSPI 대비</p><p className="mt-1 text-xs"><BenchmarkValue value={kospiReturn === null ? null : summary.returnRate - kospiReturn} /></p></div>
          <div><p className="text-[10px] text-gray-500">S&amp;P 500 대비</p><p className="mt-1 text-xs"><BenchmarkValue value={sp500Return === null ? null : summary.returnRate - sp500Return} /></p></div>
        </div>
        {trades.length > 0 && <p className="mt-3 text-center text-[10px] text-gray-600">매수 날짜·금액과 남은 현금을 동일하게 적용한 지수 포트폴리오와 비교합니다.</p>}
        {!trades.length && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-relaxed text-gray-400">가상 자금 {formatKrwCompact(INITIAL_PAPER_CASH)}이 준비됐어요. 관심 있는 종목으로 첫 판단을 기록해보세요.</p>}
      </section>

      <Card title="보유 종목" subtitle={summary.holdings.length ? `${summary.holdings.length}개 종목을 보유 중입니다` : "아직 가상 매수한 종목이 없습니다"} icon={ChartBarIcon}>
        {quotesLoading && trades.length > 0 ? (
          <div className="flex h-28 items-center justify-center"><Spin /></div>
        ) : summary.holdings.length === 0 ? (
          <button onClick={onOpenSearch} className="w-full rounded-xl border border-dashed border-gray-700 py-8 text-sm text-gray-500 hover:border-blue-500/50 hover:text-blue-300">종목을 찾아 첫 가상 매수 시작하기</button>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {summary.holdings.map((holding) => (
              <div key={`${holding.market}:${holding.ticker}`} className="flex w-full items-center gap-3 py-3">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${holding.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>{holding.market}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{holding.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">평균 {formatKrwCompact(holding.averagePriceKrw)} · {holding.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}주</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-200 tabular-nums">{formatKrwCompact(holding.currentValue)}</p>
                  <p className="text-xs"><Rate value={holding.returnRate} /></p>
                </div>
                <button onClick={() => openTrade(holding)} className="shrink-0 rounded-lg border border-blue-500/20 px-2 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/10">추가 매수</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="이번 주 AI 복기" subtitle="수익률보다 판단 과정과 반복되는 습관을 살펴봅니다" icon={SparklesIcon}>
        {!trades.length ? (
          <p className="py-6 text-center text-sm text-gray-500">가상 매수 기록이 생기면 주간 복기를 만들 수 있어요.</p>
        ) : currentReview ? (
          <div className="space-y-3">
            {reviewIsStale && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">복기 후 새 거래가 추가됐어요. 다시 생성하면 최신 기록이 반영됩니다.</p>}
            <p className="text-sm leading-relaxed text-gray-300">{currentReview.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3"><p className="text-[11px] font-semibold text-emerald-400">가장 잘한 판단</p><p className="mt-1.5 text-xs leading-relaxed text-gray-300">{currentReview.bestDecision}</p></div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3"><p className="text-[11px] font-semibold text-amber-400">반복해서 확인할 점</p><p className="mt-1.5 text-xs leading-relaxed text-gray-300">{currentReview.repeatedMistake}</p></div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 disabled:opacity-50">
                {reviewMutation.isPending ? <Spin /> : <SparklesIcon className="h-3.5 w-3.5" />}
                {reviewIsStale ? "새 거래 반영하기" : "다시 복기"}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center">
            <p className="text-xs leading-relaxed text-gray-500">이번 주 매수 이유와 현재 성과를 바탕으로<br />잘한 판단과 반복되는 실수를 정리합니다.</p>
            <button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-500/15 px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 disabled:opacity-50">
              {reviewMutation.isPending ? <Spin /> : <SparklesIcon className="h-3.5 w-3.5" />}
              이번 주 복기 만들기
            </button>
          </div>
        )}
        {previousReviews.length > 0 && (
          <div className="mt-4 border-t border-gray-700/50 pt-3">
            <button onClick={() => setShowReviewHistory((value) => !value)} className="flex w-full items-center justify-between py-1 text-xs font-medium text-gray-500 hover:text-gray-300" aria-expanded={showReviewHistory}>
              <span>지난 복기 {previousReviews.length}개</span>
              <span>{showReviewHistory ? "접기" : "보기"}</span>
            </button>
            {showReviewHistory && (
              <div className="mt-3 space-y-3">
                {previousReviews.map((review) => (
                  <article key={review.weekKey} className="rounded-xl bg-gray-900/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold text-purple-300">{review.weekKey.replace("-W", "년 ")}주차</p>
                      <time className="text-[10px] text-gray-600">{new Date(review.createdAt).toLocaleDateString("ko-KR")}</time>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-300">{review.summary}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-emerald-400/80">잘한 판단 · {review.bestDecision}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-400/80">확인할 점 · {review.repeatedMistake}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="관심종목" subtitle="관심종목에서 바로 가상 매수를 시작할 수 있어요" icon={BookmarkIcon}>
        {watchlist.length === 0 ? (
          <button onClick={onOpenSearch} className="w-full rounded-xl border border-dashed border-gray-700 py-7 text-sm text-gray-500 hover:border-blue-500/50 hover:text-blue-300">검색에서 ★를 눌러 관심종목 추가하기</button>
        ) : (
          <div>
            {watchlist.length > 5 && (
              <div className="flex justify-end pb-1">
                <button onClick={() => setShowAllWatchlist((value) => !value)} className="text-[11px] font-medium text-gray-500 hover:text-blue-300">
                  {showAllWatchlist ? "접기" : `전체 ${watchlist.length}개 보기`}
                </button>
              </div>
            )}
            <div className="divide-y divide-gray-700/50">
            {(showAllWatchlist ? watchlist : watchlist.slice(0, 5)).map((entry) => {
              const quote = quoteMap.get(`${entry.market}:${entry.ticker}`);
              const displayPrice = entry.market === "KR" ? quote?.price : quote?.price_krw;
              return (
                <div key={`${entry.market}:${entry.ticker}`} className="flex items-center gap-3 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${entry.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>{entry.market}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{entry.name}</p><p className="text-[11px] text-gray-500 tabular-nums">{displayPrice ? formatKrwCompact(displayPrice) : "현재가 확인 중"}</p></div>
                  <button onClick={() => openTrade(entry)} disabled={!quote} className="shrink-0 rounded-lg border border-blue-500/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 disabled:opacity-40">가상 매수</button>
                  <button onClick={() => removeWatchlist(entry.ticker)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-700 hover:text-red-400" aria-label={`${entry.name} 관심종목에서 삭제`}><XMarkIcon className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </Card>

      <Card title="최근 투자 기록" subtitle="매수 당시 생각을 나중에 다시 확인해보세요" icon={ClockIcon}>
        {trades.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">기록된 투자 일기가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {trades.slice(0, 5).map((trade) => (
              <article key={trade.id} className="rounded-xl bg-gray-900/50 p-3">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{trade.name}</p><time className="shrink-0 text-[10px] text-gray-600">{new Date(trade.createdAt).toLocaleDateString("ko-KR")}</time></div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{trade.thesis}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded bg-blue-500/10 px-2 py-1 text-blue-300">{TRADE_REASON_LABELS[trade.reason]}</span><span className="rounded bg-gray-700/60 px-2 py-1 text-gray-400">목표 {HORIZON_LABELS[trade.horizon]}</span><span className="rounded bg-gray-700/60 px-2 py-1 text-gray-400">{formatKrwCompact(trade.totalKrw)}</span></div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {tradeStock && <PaperTradeSheet stock={tradeStock} onClose={() => setTradeStock(null)} />}
    </div>
  );
}
