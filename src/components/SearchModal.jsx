import { useState, useEffect, useRef } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import { MagnifyingGlassIcon, XMarkIcon } from "./ui/Icons";

function ResultItem({ item }) {
  const isPos = item.change_rate > 0;
  const isNeg = item.change_rate < 0;
  const rateColor = isPos ? "text-red-400" : isNeg ? "text-blue-400" : "text-gray-500";
  const priceStr = item.market === "KR"
    ? (item.price ? item.price.toLocaleString("ko-KR") + "원" : "-")
    : (item.price ? "$" + item.price.toFixed(2) : "-");

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/60 transition-colors border-b border-gray-800/40 last:border-0">
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
    </div>
  );
}

export default function SearchModal({ onClose }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      axiosInstance
        .get("/search", { params: { q } })
        .then((res) => { setResults(res.data.items ?? []); setSearched(true); })
        .catch(() => { setResults([]); setSearched(true); })
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-14 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in"
        style={{ animation: "slideDown 0.18s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-700/60">
          <MagnifyingGlassIcon className="w-4 h-4 shrink-0 text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="종목명 또는 티커 (예: 삼성전자, AAPL)"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
          />
          {query ? (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300 transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
              ESC
            </button>
          )}
        </div>

        {/* 결과 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8"><Spin /></div>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="text-center text-gray-600 text-xs py-8">
              2글자 이상 입력하면 검색합니다
            </p>
          )}
          {!loading && searched && results.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">
              검색 결과가 없습니다
            </p>
          )}
          {!loading && results.map((item) => (
            <ResultItem key={`${item.market}-${item.ticker}`} item={item} />
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
  );
}
