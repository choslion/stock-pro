import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import {
  INITIAL_PAPER_CASH,
  formatKrwCompact,
  getOwnedQuantity,
  type TradeSide,
} from "../lib/portfolio";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { useToastStore } from "../store/useToastStore";
import { useDialogFocus } from "../lib/useDialogFocus";
import type { SearchResultItem } from "./SearchModal";
import Spin from "./ui/Spin";
import { CurrencyDollarIcon, XMarkIcon } from "./ui/Icons";

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000] as const;
const QUICK_RATIOS = [0.25, 0.5, 1] as const;

/** 소수점 넷째 자리까지 — 미국 주식 소수점 매수를 허용하는 단위 */
const QTY_STEP = 10_000;
const floorQty = (value: number) => Math.floor(value * QTY_STEP) / QTY_STEP;
const formatQty = (value: number) => value.toLocaleString("ko-KR", { maximumFractionDigits: 4 });

interface PaperTradeSheetProps {
  stock: SearchResultItem;
  onClose: () => void;
  onCompleted?: () => void;
  initialSide?: TradeSide;
}

export default function PaperTradeSheet({ stock, onClose, onCompleted, initialSide = "buy" }: PaperTradeSheetProps) {
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [amountText, setAmountText] = useState("1000000");
  const [sellQtyText, setSellQtyText] = useState("");
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
  const hasValidExchangeRate = stock.market === "KR" || (Number.isFinite(exchangeRate) && exchangeRate > 0);

  const ownedQuantity = useMemo(
    () => getOwnedQuantity(trades, stock.market, stock.ticker),
    [trades, stock.market, stock.ticker],
  );
  const canSell = ownedQuantity > 0;

  const availableCash = useMemo(() => {
    const spent = trades.reduce(
      (sum, trade) => sum + (trade.side === "sell" ? -trade.totalKrw : trade.totalKrw),
      0,
    );
    return Math.max(0, INITIAL_PAPER_CASH - spent);
  }, [trades]);

  /* 국내 주식은 소수점 거래가 없어 정수로, 미국 주식만 소수점 단위를 허용한다. */
  const roundQty = (value: number) => (stock.market === "KR" ? Math.floor(value) : floorQty(value));

  /* ── 매수: 금액을 넣으면 수량이 나온다 ── */
  const requestedAmount = Number(amountText.replace(/,/g, ""));
  const buyQuantity = unitPriceKrw > 0 && requestedAmount > 0
    ? roundQty(requestedAmount / unitPriceKrw)
    : 0;
  const buyTotal = buyQuantity * unitPriceKrw;

  /* ── 매도: 수량을 넣으면 회수 금액이 나온다 ── */
  const requestedQty = Number(sellQtyText.replace(/,/g, ""));
  const sellQuantity = Number.isFinite(requestedQty) && requestedQty > 0
    ? Math.min(roundQty(requestedQty), ownedQuantity)
    : 0;
  const sellTotal = sellQuantity * unitPriceKrw;

  const overCash = side === "buy" && requestedAmount > availableCash;
  const overOwned = side === "sell" && requestedQty > ownedQuantity + 1 / QTY_STEP;

  const isValid = unitPriceKrw > 0 && hasValidExchangeRate && (
    side === "buy"
      ? buyQuantity > 0 && buyTotal <= availableCash
      : sellQuantity > 0
  );

  const setAmount = (value: number) => setAmountText(String(Math.min(value, availableCash)));
  const setRatio = (ratio: number) =>
    setSellQtyText(String(ratio === 1 ? ownedQuantity : roundQty(ownedQuantity * ratio)));

  const switchSide = (next: TradeSide) => {
    if (next === "sell" && !canSell) return;
    setSide(next);
  };

  const handleSubmit = () => {
    if (!isValid) return;
    addTrade({
      ticker: stock.ticker,
      name: stock.name,
      market: stock.market,
      side,
      quantity: side === "buy" ? buyQuantity : sellQuantity,
      unitPriceKrw,
      unitPriceOriginal,
      exchangeRate,
      totalKrw: side === "buy" ? buyTotal : sellTotal,
    });
    addToast(`${stock.name} 가상 ${side === "buy" ? "매수" : "매도"}를 기록했어요.`, "success");
    onCompleted?.();
    onClose();
  };

  const accent = side === "buy"
    ? { label: "가상 매수", text: "text-red-400", button: "bg-red-500 hover:bg-red-400", panel: "border-red-500/20 bg-red-500/5", focus: "focus:border-red-500" }
    : { label: "가상 매도", text: "text-blue-400", button: "bg-blue-500 hover:bg-blue-400", panel: "border-blue-500/20 bg-blue-500/5", focus: "focus:border-blue-500" };

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
            <p className={`mb-1 text-[11px] font-semibold ${accent.text}`}>{accent.label}</p>
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
          <div className="px-5 py-16 text-center text-sm text-gray-400">현재가를 불러오지 못해 거래를 진행할 수 없습니다.</div>
        ) : (
          <div className="space-y-6 px-5 py-5">
            <div role="tablist" aria-label="매수 또는 매도" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-800 p-1">
              {(["buy", "sell"] as const).map((item) => {
                const active = side === item;
                const disabled = item === "sell" && !canSell;
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => switchSide(item)}
                    className={`rounded-lg py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-gray-600 ${
                      active
                        ? item === "buy" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-300"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {item === "buy" ? "매수" : "매도"}
                  </button>
                );
              })}
            </div>

            <section className={`rounded-2xl border p-4 ${accent.panel}`}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>현재가</span>
                <span className="font-semibold text-white tabular-nums">
                  {stock.market === "KR"
                    ? formatKrwCompact(unitPriceKrw)
                    : `$${unitPriceOriginal.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                {side === "buy" ? (
                  <>
                    <span>사용 가능한 가상 현금</span>
                    <span className="font-semibold text-red-300 tabular-nums">{formatKrwCompact(availableCash)}</span>
                  </>
                ) : (
                  <>
                    <span>보유 수량</span>
                    <span className="font-semibold text-blue-300 tabular-nums">{formatQty(ownedQuantity)}주</span>
                  </>
                )}
              </div>
            </section>

            {side === "buy" ? (
              <section>
                <label htmlFor="paper-amount" className="text-sm font-semibold text-gray-200">투자 금액</label>
                <div className="relative mt-2">
                  <input
                    id="paper-amount"
                    inputMode="numeric"
                    value={amountText}
                    onChange={(event) => setAmountText(event.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-10 text-right text-base font-bold text-white outline-none focus:border-red-500"
                    aria-describedby="paper-trade-hint"
                    aria-invalid={overCash}
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
                <p id="paper-trade-hint" aria-live="polite" className={`mt-2 text-right text-xs ${overCash ? "text-red-400" : "text-gray-500"}`}>
                  {overCash
                    ? "사용 가능한 현금을 초과했습니다."
                    : buyQuantity > 0
                      ? `예상 ${formatQty(buyQuantity)}주 · ${formatKrwCompact(buyTotal)}`
                      : "최소 1주를 살 수 있는 금액을 입력해주세요."}
                </p>
              </section>
            ) : (
              <section>
                <label htmlFor="paper-quantity" className="text-sm font-semibold text-gray-200">매도 수량</label>
                <div className="relative mt-2">
                  <input
                    id="paper-quantity"
                    inputMode="decimal"
                    value={sellQtyText}
                    placeholder="0"
                    onChange={(event) => setSellQtyText(event.target.value.replace(/[^0-9.]/g, ""))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-10 text-right text-base font-bold text-white placeholder-gray-600 outline-none focus:border-blue-500"
                    aria-describedby="paper-trade-hint"
                    aria-invalid={overOwned}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">주</span>
                </div>
                <div className="mt-2 flex gap-2">
                  {QUICK_RATIOS.map((ratio) => (
                    <button key={ratio} onClick={() => setRatio(ratio)} className="flex-1 rounded-lg bg-gray-800 py-2 text-xs text-gray-400 hover:bg-gray-700 hover:text-white">
                      {ratio === 1 ? "전량" : `${ratio * 100}%`}
                    </button>
                  ))}
                </div>
                <p id="paper-trade-hint" aria-live="polite" className={`mt-2 text-right text-xs ${overOwned ? "text-red-400" : "text-gray-500"}`}>
                  {overOwned
                    ? "보유 수량을 초과했습니다."
                    : sellQuantity > 0
                      ? `예상 회수 ${formatKrwCompact(sellTotal)}`
                      : "팔 수량을 입력해주세요."}
                </p>
              </section>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500 ${accent.button}`}
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              {side === "buy" ? "가상 매수하기" : "가상 매도하기"}
            </button>
            <p className="text-center text-[11px] text-gray-600">실제 주문은 발생하지 않으며 이 브라우저에만 저장됩니다.</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
