import { useState, useEffect, useRef } from "react";
import Spin from "./ui/Spin";
import StockChartModal from "./StockChartModal";
import { MagnifyingGlassIcon, XMarkIcon, StarIcon, StarSolidIcon } from "./ui/Icons";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { useToastStore } from "../store/useToastStore";

import { useDialogFocus } from "../lib/useDialogFocus";
import { useStockSearch } from "../lib/useStockSearch";
import type { SearchResultItem } from "../types/api";

interface ResultItemProps {
  item:    SearchResultItem;
  onClick: () => void;
}

function ResultItem({ item, onClick }: ResultItemProps) {
  const isStarred = useWatchlistStore((s) => s.entries.some((e) => e.ticker === item.ticker));
  const add       = useWatchlistStore((s) => s.add);
  const remove    = useWatchlistStore((s) => s.remove);
  const addToast  = useToastStore((s) => s.addToast);

  const isPos = item.change_rate > 0;
  const isNeg = item.change_rate < 0;
  const rateColor = isPos ? "text-red-400" : isNeg ? "text-blue-400" : "text-gray-500";
  const priceStr = item.market === "KR"
    ? (item.price ? item.price.toLocaleString("ko-KR") + "원" : "-")
    : (item.price ? "$" + item.price.toFixed(2) : "-");

  const toggleStar = () => {
    if (isStarred) {
      remove(item.ticker);
    } else {
      add({ ticker: item.ticker, name: item.name, market: item.market });
      addToast(`${item.name} 관심종목에 추가했어요.`, "success");
    }
  };

  return (
    <div className="flex items-center border-b border-gray-800/40 last:border-0 hover:bg-gray-800/60 transition-colors">
      <button
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-3 pl-4 pr-2 py-3 text-left"
      >
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded
          ${item.market === "KR" ? "bg-blue-900/60 text-blue-300" : "bg-yellow-900/60 text-yellow-300"}`}>
          {item.market}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-white">{item.name}</p>
          <p className="text-xs text-gray-500">{item.ticker}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm text-gray-200 tabular-nums">{priceStr}</p>
          <p className={`text-xs font-semibold tabular-nums ${rateColor}`}>
            {isPos ? "+" : ""}{item.change_rate.toFixed(2)}%
          </p>
        </div>
      </button>
      <button
        onClick={toggleStar}
        aria-label={isStarred ? `${item.name} 관심종목에서 삭제` : `${item.name} 관심종목에 추가`}
        aria-pressed={isStarred}
        className={`shrink-0 w-9 h-9 mr-2 flex items-center justify-center rounded-lg transition-colors
          ${isStarred ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-yellow-400"}`}
      >
        {isStarred ? <StarSolidIcon className="w-4 h-4" /> : <StarIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

interface SearchModalProps {
  onClose:       () => void;
  onOpenWhatIf?: (stock: SearchResultItem) => void;
  onOpenPaperTrade?: (stock: SearchResultItem) => void;
}

export default function SearchModal({ onClose, onOpenWhatIf, onOpenPaperTrade }: SearchModalProps) {
  const [query, setQuery]                   = useState("");
  const [selectedStock, setSelectedStock]   = useState<SearchResultItem | null>(null);
  const { canSearch, loading, failed, results } = useStockSearch(query);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  /* ── 포커스 트랩 + 닫힐 때 초점 복귀 (위에 차트 모달이 열리면 트랩 양보) ── */
  useDialogFocus(panelRef, !selectedStock);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const { scrollX, scrollY } = window;
    const previousRootStyles = {
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
    };
    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    if (scrollbarWidth > 0) {
      const padding = getComputedStyle(body).paddingRight;
      body.style.paddingRight = `calc(${padding} + ${scrollbarWidth}px)`;
    }

    // Freeze the page at its current position, including on mobile browsers.
    Object.assign(root.style, { overflow: "hidden", overscrollBehavior: "none" });
    Object.assign(body.style, { position: "fixed", top: `${-scrollY}px`, left: `${-scrollX}px`, width: "100%" });
    inputRef.current?.focus({ preventScroll: true });

    return () => {
      Object.assign(root.style, previousRootStyles);
      Object.assign(body.style, previousBodyStyles);
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      }
    };
  }, []);

  /* ── 모달 밖 pointerdown으로 초점이 빠져나가는 것 방지 ── */
  useEffect(() => {
    if (selectedStock) return;
    const panel = panelRef.current;
    if (!panel) return;
    const handleOverlayPointerDown = (e: PointerEvent) => {
      if (!panel.contains(e.target as Node)) e.preventDefault();
    };
    document.addEventListener("pointerdown", handleOverlayPointerDown);
    return () => document.removeEventListener("pointerdown", handleOverlayPointerDown);
  }, [selectedStock]);

  /* ── ESC 닫기 — 차트 모달이 열려 있으면 그쪽(뒤로가기)에 양보 ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !selectedStock) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, selectedStock]);

  return (
    <>
    {/* 딤 오버레이 */}
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden overscroll-none bg-black/60 backdrop-blur-sm px-4 pt-14 pb-4">
      <div className="absolute inset-0 touch-none" onClick={onClose} aria-hidden="true" />
      {/* 모달 패널 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="종목 검색"
        className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-700/80 bg-gray-900 shadow-2xl"
        style={{ animation: "slideDown 0.18s ease-out" }}
      >
        {/* 검색 입력 */}
        <div className="flex shrink-0 items-center gap-3 px-4 py-3.5 border-b border-gray-700/60">
          <MagnifyingGlassIcon className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 또는 티커 (예: 삼성전자, 엔비디아, AAPL)"
            aria-label="종목 검색어 입력"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus({ preventScroll: true }); }}
              aria-label="검색어 지우기"
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              aria-label="검색 닫기"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ESC
            </button>
          )}
        </div>

        {/* 결과 */}
        <div className="min-h-0 max-h-[60vh] overflow-y-auto overscroll-contain [color-scheme:dark] [scrollbar-width:thin]" role="region" aria-label="검색 결과" aria-live="polite">
          {loading && <div className="flex justify-center py-8"><Spin /></div>}

          {!canSearch && (
            <p className="text-center text-gray-500 text-xs py-8">
              2글자 이상 또는 1글자 티커를 입력해 주세요
            </p>
          )}
          {failed && (
            <p className="text-center text-gray-400 text-sm py-8">검색에 실패했어요. 잠시 후 다시 검색해 주세요.</p>
          )}
          {canSearch && !loading && !failed && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">검색 결과가 없습니다</p>
          )}
          {results.map((item) => (
            <ResultItem key={`${item.market}-${item.ticker}`} item={item} onClick={() => setSelectedStock(item)} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>

    {selectedStock && (
      <StockChartModal
        stock={selectedStock}
        onBack={() => setSelectedStock(null)}
        onClose={onClose}
        onOpenWhatIf={onOpenWhatIf}
        onOpenPaperTrade={onOpenPaperTrade}
      />
    )}
    </>
  );
}
