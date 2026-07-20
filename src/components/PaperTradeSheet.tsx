import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import {
  HORIZON_LABELS,
  INITIAL_PAPER_CASH,
  TRADE_REASON_LABELS,
  formatKrwCompact,
  type InvestmentHorizon,
  type TradeReason,
} from "../lib/portfolio";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useToastStore } from "../store/useToastStore";
import { useDialogFocus } from "../lib/useDialogFocus";
import type { SearchResultItem } from "./SearchModal";
import Spin from "./ui/Spin";
import { ChevronDownIcon, CurrencyDollarIcon, XMarkIcon } from "./ui/Icons";

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000] as const;

interface PaperTradeSheetProps {
  stock: SearchResultItem;
  onClose: () => void;
  onCompleted?: () => void;
}

export default function PaperTradeSheet({ stock, onClose, onCompleted }: PaperTradeSheetProps) {
  const [amountText, setAmountText] = useState("1000000");
  const [reason, setReason] = useState<TradeReason | null>(null);
  const [horizon, setHorizon] = useState<InvestmentHorizon>("3m");
  const [thesis, setThesis] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const trades = usePortfolioStore((state) => state.trades);
  const addTrade = usePortfolioStore((state) => state.addTrade);
  const addToast = useToastStore((state) => state.addToast);

  const params = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    if (stock.market === "KR") {
      result.kr = stock.ticker;
      result.kr_names = stock.name;
    } else {
      result.us = stock.ticker;
    }
    return result;
  }, [stock]);

  const { data, isLoading, error } = useQuery({
    queryKey: Q.watchlist(
      stock.market === "KR" ? stock.ticker : "",
      stock.market === "US" ? stock.ticker : "",
    ),
    queryFn: () => fetchers.watchlist(params),
  });

  /* ── 초점 트랩 + 닫힐 때 열었던 요소로 복귀 ── */
  useDialogFocus(panelRef);
  useEffect(() => { panelRef.current?.focus(); }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const quote = data?.items[0];
  const exchangeRate = stock.market === "US" ? (data?.usd_krw ?? 0) : 1;
  const unitPriceKrw = stock.market === "KR" ? (quote?.price ?? 0) : (quote?.price_krw ?? 0);
  const unitPriceOriginal = stock.market === "KR" ? unitPriceKrw : (quote?.price_usd ?? quote?.price ?? 0);
  const spent = trades.reduce((sum, trade) => sum + trade.totalKrw, 0);
  const availableCash = Math.max(0, INITIAL_PAPER_CASH - spent);
  const requestedAmount = Number(amountText.replace(/,/g, ""));
  const quantity = unitPriceKrw > 0 && requestedAmount > 0
    ? stock.market === "KR"
      ? Math.floor(requestedAmount / unitPriceKrw)
      : Math.floor((requestedAmount / unitPriceKrw) * 10_000) / 10_000
    : 0;
  const actualTotal = quantity * unitPriceKrw;
  const thesisTooShort = thesis.length > 0 && thesis.trim().length < 5;
  const hasValidExchangeRate = stock.market === "KR" || (Number.isFinite(exchangeRate) && exchangeRate > 0);
  const isValid = Boolean(
    reason
    && thesis.trim().length >= 5
    && quantity > 0
    && actualTotal <= availableCash
    && unitPriceKrw > 0
    && hasValidExchangeRate,
  );

  const setAmount = (value: number) => setAmountText(String(Math.min(value, availableCash)));

  const handleSubmit = () => {
    if (!isValid || !reason) return;
    addTrade({
      ticker: stock.ticker,
      name: stock.name,
      market: stock.market,
      quantity,
      unitPriceKrw,
      unitPriceOriginal,
      exchangeRate,
      totalKrw: actualTotal,
      reason,
      horizon,
      thesis: thesis.trim(),
    });
    addToast(`${stock.name} 가상 매수를 기록했어요.`, "success");
    onCompleted?.();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex h-[100dvh] items-end justify-center bg-black/65 backdrop-blur-sm lg:items-center lg:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paper-trade-title"
        tabIndex={-1}
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-gray-700/70 bg-gray-900 shadow-2xl outline-none lg:max-w-md lg:rounded-2xl"
      >
        <div className="flex justify-center pb-1 pt-3 lg:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-gray-600" />
        </div>
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-800 bg-gray-900/95 px-5 py-4 backdrop-blur-sm">
          <div>
            <p className="mb-1 text-[11px] font-semibold text-blue-400">가상 매수</p>
            <h2 id="paper-trade-title" className="text-base font-bold text-white">{stock.name}</h2>
            <p className="text-xs text-gray-500">{stock.ticker} · {stock.market}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white" aria-label="닫기">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </header>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center"><Spin /></div>
        ) : error || unitPriceKrw <= 0 || !hasValidExchangeRate ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">현재가를 불러오지 못해 가상 매수를 진행할 수 없습니다.</div>
        ) : (
          <div className="space-y-6 px-5 py-5">
            <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>현재가</span>
                <span className="font-semibold text-white tabular-nums">
                  {stock.market === "KR"
                    ? formatKrwCompact(unitPriceKrw)
                    : `$${unitPriceOriginal.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                <span>사용 가능한 가상 현금</span>
                <span className="font-semibold text-blue-300 tabular-nums">{formatKrwCompact(availableCash)}</span>
              </div>
            </section>

            <section>
              <label htmlFor="paper-amount" className="text-sm font-semibold text-gray-200">투자 금액</label>
              <div className="relative mt-2">
                <input
                  id="paper-amount"
                  inputMode="numeric"
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value.replace(/[^0-9]/g, ""))}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-10 text-right text-base font-bold text-white outline-none focus:border-blue-500"
                  aria-describedby="paper-quantity"
                  aria-invalid={requestedAmount > availableCash}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">원</span>
              </div>
              <div className="mt-2 flex gap-2">
                {QUICK_AMOUNTS.map((amount) => (
                  <button key={amount} onClick={() => setAmount(amount)} className="flex-1 rounded-lg bg-gray-800 py-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">
                    {amount / 10_000}만원
                  </button>
                ))}
                <button onClick={() => setAmount(availableCash)} className="flex-1 rounded-lg bg-gray-800 py-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">전액</button>
              </div>
              <p id="paper-quantity" aria-live="polite" className={`mt-2 text-right text-xs ${requestedAmount > availableCash ? "text-red-400" : "text-gray-500"}`}>
                {requestedAmount > availableCash
                  ? "사용 가능한 현금을 초과했습니다."
                  : quantity > 0
                    ? `예상 ${quantity.toLocaleString("ko-KR", { maximumFractionDigits: 4 })}주 · ${formatKrwCompact(actualTotal)}`
                    : "최소 1주를 살 수 있는 금액을 입력해주세요."}
              </p>
            </section>

            <fieldset>
              <legend className="text-sm font-semibold text-gray-200">왜 매수하나요?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(TRADE_REASON_LABELS) as TradeReason[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setReason(item)}
                    aria-pressed={reason === item}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      reason === item
                        ? "border-blue-400 bg-blue-500/20 text-blue-200"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {TRADE_REASON_LABELS[item]}
                  </button>
                ))}
              </div>
            </fieldset>

            <section>
              <label htmlFor="paper-horizon" className="text-sm font-semibold text-gray-200">목표 기간</label>
              <div className="relative mt-2">
                <select
                  id="paper-horizon"
                  value={horizon}
                  onChange={(event) => setHorizon(event.target.value as InvestmentHorizon)}
                  className="w-full appearance-none rounded-xl border border-gray-700 bg-gray-800 py-3 pl-4 pr-12 text-sm text-white outline-none focus:border-blue-500"
                >
                  {(Object.keys(HORIZON_LABELS) as InvestmentHorizon[]).map((item) => (
                    <option key={item} value={item}>{HORIZON_LABELS[item]}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <label htmlFor="paper-thesis" className="text-sm font-semibold text-gray-200">기대 시나리오</label>
                <span className="text-[11px] text-gray-600">{thesis.length}/120</span>
              </div>
              <textarea
                id="paper-thesis"
                value={thesis}
                onChange={(event) => setThesis(event.target.value.slice(0, 120))}
                rows={3}
                placeholder="어떤 변화가 생길 것으로 생각했는지 적어보세요."
                aria-invalid={thesisTooShort}
                aria-describedby={thesisTooShort ? "paper-thesis-error" : undefined}
                className="mt-2 w-full resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500"
              />
              {thesisTooShort && <p id="paper-thesis-error" className="mt-1 text-xs text-red-400">5자 이상 적어주세요.</p>}
            </section>

            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              가상 매수 기록하기
            </button>
            <p className="text-center text-[11px] text-gray-600">실제 주문은 발생하지 않으며 이 브라우저에만 저장됩니다.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
