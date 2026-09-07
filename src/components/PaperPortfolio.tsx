import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchers, Q } from "../lib/queries";
import {
  INITIAL_PAPER_CASH,
  calculateMatchedBenchmarkReturn,
  calculatePortfolio,
  formatKrwCompact,
  type TradeSide,
} from "../lib/portfolio";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useWatchlistStore } from "../store/useWatchlistStore";
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
  XMarkIcon,
} from "./ui/Icons";

interface PaperPortfolioProps {
  onOpenSearch: () => void;
}

type TradeTarget = { stock: SearchResultItem; side: TradeSide };

const formatQty = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 4 });

function Rate({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const color = value > 0 ? "text-red-400" : value < 0 ? "text-blue-400" : "text-gray-400";
  return <span className={`font-semibold tabular-nums ${color}`}>{value > 0 ? "+" : ""}{value.toFixed(2)}{suffix}</span>;
}

function Amount({ value }: { value: number }) {
  const color = value > 0 ? "text-red-400" : value < 0 ? "text-blue-400" : "text-gray-300";
  return <span className={`font-semibold tabular-nums ${color}`}>{value > 0 ? "+" : ""}{formatKrwCompact(value)}</span>;
}

function BenchmarkValue({ value }: { value: number | null }) {
  return value === null ? <span className="text-gray-600">-</span> : <Rate value={value} />;
}

export default function PaperPortfolio({ onOpenSearch }: PaperPortfolioProps) {
  const trades = usePortfolioStore((state) => state.trades);
  const watchlist = useWatchlistStore((state) => state.entries);
  const removeWatchlist = useWatchlistStore((state) => state.remove);
  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null);
  const [showAllWatchlist, setShowAllWatchlist] = useState(false);

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

  const openTrade = (
    entry: { ticker: string; name: string; market: "KR" | "US" },
    side: TradeSide = "buy",
  ) => {
    const quote = quoteMap.get(`${entry.market}:${entry.ticker}`);
    const originalPrice = entry.market === "KR" ? quote?.price : (quote?.price_usd ?? quote?.price);
    setTradeTarget({
      side,
      stock: {
        ticker: entry.ticker,
        name: entry.name,
        market: entry.market,
        price: originalPrice,
        change_rate: quote?.change_rate ?? 0,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-400">PAPER PORTFOLIO</p>
          <h1 className="mt-1 text-xl font-bold text-white">모의투자</h1>
          <p className="mt-1 text-xs text-gray-500">가상 자금으로 사고팔며 수익률을 확인해보세요.</p>
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
        <div className="mt-5 border-t border-gray-700/60 pt-4">
          <div className="grid grid-cols-2 divide-x divide-gray-700/70 text-center">
            <div><p className="text-[10px] text-gray-500">가상 현금</p><p className="mt-1 text-xs font-semibold text-gray-200 tabular-nums">{formatKrwCompact(summary.cash)}</p></div>
            <div><p className="text-[10px] text-gray-500">실현 손익</p><p className="mt-1 text-xs"><Amount value={summary.realizedProfit} /></p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 divide-x divide-gray-700/70 border-t border-gray-700/40 pt-3 text-center">
            <div><p className="text-[10px] text-gray-500">KOSPI 대비</p><p className="mt-1 text-xs"><BenchmarkValue value={kospiReturn === null ? null : summary.returnRate - kospiReturn} /></p></div>
            <div><p className="text-[10px] text-gray-500">S&amp;P 500 대비</p><p className="mt-1 text-xs"><BenchmarkValue value={sp500Return === null ? null : summary.returnRate - sp500Return} /></p></div>
          </div>
        </div>
        {trades.length > 0 && <p className="mt-3 text-center text-[10px] text-gray-600">같은 날 같은 금액을 지수에 넣고 뺐다면 어땠을지와 비교합니다.</p>}
        {!trades.length && <p className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-relaxed text-gray-400">가상 자금 {formatKrwCompact(INITIAL_PAPER_CASH)}이 준비됐어요. 마음에 드는 종목을 사고팔아 보세요.</p>}
      </section>

      <Card title="보유 종목" subtitle={summary.holdings.length ? `${summary.holdings.length}개 종목을 보유 중입니다` : "아직 가상 매수한 종목이 없습니다"} icon={ChartBarIcon}>
        {quotesLoading && trades.length > 0 ? (
          <div className="flex h-28 items-center justify-center"><Spin /></div>
        ) : summary.holdings.length === 0 ? (
          <button onClick={onOpenSearch} className="w-full rounded-xl border border-dashed border-gray-700 py-8 text-sm text-gray-500 hover:border-red-500/50 hover:text-red-300">종목을 찾아 첫 가상 매수 시작하기</button>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {summary.holdings.map((holding) => (
              <div key={`${holding.market}:${holding.ticker}`} className="flex w-full items-center gap-3 py-3">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${holding.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>{holding.market}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{holding.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">평균 {formatKrwCompact(holding.averagePriceKrw)} · {formatQty(holding.quantity)}주</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-200 tabular-nums">{formatKrwCompact(holding.currentValue)}</p>
                  <p className="text-xs"><Rate value={holding.returnRate} /></p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openTrade(holding, "buy")} className="rounded-lg border border-red-500/25 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/10">매수</button>
                  <button onClick={() => openTrade(holding, "sell")} className="rounded-lg border border-blue-500/25 px-2 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/10">매도</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="관심종목" subtitle="관심종목에서 바로 가상 매수를 시작할 수 있어요" icon={BookmarkIcon}>
        {watchlist.length === 0 ? (
          <button onClick={onOpenSearch} className="w-full rounded-xl border border-dashed border-gray-700 py-7 text-sm text-gray-500 hover:border-red-500/50 hover:text-red-300">검색에서 ★를 눌러 관심종목 추가하기</button>
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
                  <button onClick={() => openTrade(entry, "buy")} disabled={!quote} className="shrink-0 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40">가상 매수</button>
                  <button onClick={() => removeWatchlist(entry.ticker)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-700 hover:text-red-400" aria-label={`${entry.name} 관심종목에서 삭제`}><XMarkIcon className="h-3.5 w-3.5" /></button>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </Card>

      <Card title="거래 내역" subtitle="언제 얼마에 사고팔았는지 확인해보세요" icon={ClockIcon}>
        {trades.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">아직 거래 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {trades.slice(0, 10).map((trade) => (
              <div key={trade.id} className="flex items-center gap-3 py-3">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${trade.side === "buy" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-300"}`}>
                  {trade.side === "buy" ? "매수" : "매도"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{trade.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500 tabular-nums">{formatQty(trade.quantity)}주 · {formatKrwCompact(trade.unitPriceKrw)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-200 tabular-nums">{formatKrwCompact(trade.totalKrw)}</p>
                  <time className="text-[10px] text-gray-600">{new Date(trade.createdAt).toLocaleDateString("ko-KR")}</time>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {tradeTarget && (
        <PaperTradeSheet
          stock={tradeTarget.stock}
          initialSide={tradeTarget.side}
          onClose={() => setTradeTarget(null)}
        />
      )}
    </div>
  );
}
