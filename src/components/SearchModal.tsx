import { useState, useEffect, useRef, useCallback } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import StockChartModal from "./StockChartModal";
import { MagnifyingGlassIcon, XMarkIcon } from "./ui/Icons";

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface SearchResultItem {
  ticker:      string;
  name:        string;
  market:      "KR" | "US";
  price?:      number;
  change_rate: number;
}

interface ResultItemProps {
  item:    SearchResultItem;
  onClick: () => void;
}

function ResultItem({ item, onClick }: ResultItemProps) {
  const isPos = item.change_rate > 0;
  const isNeg = item.change_rate < 0;
  const rateColor = isPos ? "text-red-400" : isNeg ? "text-blue-400" : "text-gray-500";
  const priceStr = item.market === "KR"
    ? (item.price ? item.price.toLocaleString("ko-KR") + "원" : "-")
    : (item.price ? "$" + item.price.toFixed(2) : "-");

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/60 transition-colors border-b border-gray-800/40 last:border-0 text-left"
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
  );
}

interface SearchModalProps {
  onClose: () => void;
}

export default function SearchModal({ onClose }: SearchModalProps) {
  const [query, setQuery]                   = useState("");
  const [results, setResults]               = useState<SearchResultItem[]>([]);
  const [loading, setLoading]               = useState(false);
  const [searched, setSearched]             = useState(false);
  const [selectedStock, setSelectedStock]   = useState<SearchResultItem | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  /* ── 오토포커스 ── */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* ── 포커스 트랩 ── */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => !(n as HTMLButtonElement).disabled);
      if (!nodes.length) { e.preventDefault(); return; }

      const first = nodes[0];
      const last  = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !panel.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !panel.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleOverlayPointerDown = (e: PointerEvent) => {
      if (!panel.contains(e.target as Node)) e.preventDefault();
    };

    window.addEventListener("keydown", handleTab);
    document.addEventListener("pointerdown", handleOverlayPointerDown);
    return () => {
      window.removeEventListener("keydown", handleTab);
      document.removeEventListener("pointerdown", handleOverlayPointerDown);
    };
  }, []);

  /* ── ESC 닫기 ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── 검색 (400ms 디바운스) ── */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      axiosInstance
        .get<{ items: SearchResultItem[] }>("/search", { params: { q } })
        .then((res) => { setResults(res.data.items ?? []); setSearched(true); })
        .catch(() => { setResults([]); setSearched(true); })
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
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
            placeholder="종목명 또는 티커 (예: 삼성전자, AAPL)"
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
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ESC
            </button>
          )}
        </div>

        {/* 결과 */}
        <div className="max-h-[60vh] overflow-y-auto" role="region" aria-label="검색 결과" aria-live="polite">
          {loading && <div className="flex justify-center py-8"><Spin /></div>}

          {!loading && query.trim().length < 2 && (
            <p className="text-center text-gray-600 text-xs py-8">
              2글자 이상 입력하면 검색합니다
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
      />
    )}
    </>
  );
}
