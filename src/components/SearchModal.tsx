import { useState, useEffect, useRef, useCallback } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import StockChartModal from "./StockChartModal";
import { MagnifyingGlassIcon, XMarkIcon, StarIcon, StarSolidIcon } from "./ui/Icons";
import { useWatchlistStore } from "../store/useWatchlistStore";
import { useToastStore } from "../store/useToastStore";

import { useDialogFocus } from "../lib/useDialogFocus";

export interface SearchResultItem {
  ticker:      string;
  name:        string;
  market:      "KR" | "US";
  price?:      number;
  change_rate: number;
}

function isSearchableQuery(value: string) {
  const query = value.trim();
  return query.length >= 2 || /^[a-z]$/i.test(query);
}

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
  const [results, setResults]               = useState<SearchResultItem[]>([]);
  const [loading, setLoading]               = useState(false);
  const [searched, setSearched]             = useState(false);
  const [selectedStock, setSelectedStock]   = useState<SearchResultItem | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  /* ── 오토포커스 ── */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ── 포커스 트랩 + 닫힐 때 초점 복귀 (위에 차트 모달이 열리면 트랩 양보) ── */
  useDialogFocus(panelRef, !selectedStock);

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

  /* ── 검색 (400ms 디바운스) ── */
  useEffect(() => {
    const q = query.trim();
    if (!isSearchableQuery(q)) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      axiosInstance
        .get<{ items: SearchResultItem[] }>("/search", {
          params: { q },
          signal: controller.signal,
        })
        .then((res) => { setResults(res.data.items ?? []); setSearched(true); })
        .catch((error) => {
          if (error?.code !== "ERR_CANCELED") {
            setResults([]);
            setSearched(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <>
    {/* 딤 오버레이 */}
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-14 px-4"
      onClick={handleOverlayClick}
      tabIndex={-1}
      aria-hidden="false"
    >
      {/* 모달 패널 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="종목 검색"
        className="w-full max-w-md bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideDown 0.18s ease-out" }}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/60">
          <MagnifyingGlassIcon className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 또는 티커 (예: 삼성전자, 엔비디아, AAPL)"
            aria-label="종목 검색어 입력"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
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
        <div className="max-h-[60vh] overflow-y-auto" role="region" aria-label="검색 결과" aria-live="polite">
          {loading && <div className="flex justify-center py-8"><Spin /></div>}

          {!loading && !isSearchableQuery(query) && (
            <p className="text-center text-gray-500 text-xs py-8">
              2글자 이상 또는 1글자 티커를 입력해 주세요
            </p>
          )}
          {!loading && searched && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">검색 결과가 없습니다</p>
          )}
          {!loading && results.map((item) => (
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
