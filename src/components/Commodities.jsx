import { useEffect, useState } from "react";
import useAutoRefresh from "../hooks/useAutoRefresh";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";

function fmtTs(isoUtc) {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Seoul" });
}

export default function Commodities() {
  const [data, setData]           = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [currency, setCurrency]   = useState("usd");
  const [usdKrw, setUsdKrw]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [retryCount, setRetryCount] = useState(0);
  useAutoRefresh(() => setRetryCount((c) => c + 1));

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance
      .get("/commodities")
      .then((res) => {
        setData(res.data.items ?? res.data ?? []);
        setFetchedAt(res.data.fetched_at ?? null);
        setUsdKrw(res.data.usd_krw ?? null);
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (error)   return <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />;

  const showKrw = currency === "krw" && usdKrw;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-[20px]">
        {fetchedAt
          ? <p className="text-xs text-gray-500">{fmtTs(fetchedAt)} 기준</p>
          : <span />
        }
        <div className="flex gap-0.5 bg-gray-700/40 rounded-full p-0.5">
          {[{ id: "usd", label: "USD" }, { id: "krw", label: "원" }].map((c) => (
            <button
              key={c.id}
              onClick={() => setCurrency(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === c.id ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
        <span className="col-span-4">품목</span>
        <span className="col-span-4 text-right">현재가</span>
        <span className="col-span-4 text-right">등락률</span>
      </div>
      <div className="divide-y divide-gray-700/50">
        {data.map((item) => {
          const isPositive = item.change_pct > 0;
          const isNeutral  = item.change_pct === 0;
          const color = isNeutral ? "text-gray-400" : isPositive ? "text-red-400" : "text-blue-400";
          const priceStr = showKrw
            ? Math.round(item.value * usdKrw).toLocaleString("ko-KR") + "원"
            : "$" + item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const changeStr = showKrw
            ? (isPositive ? "+" : "") + Math.round(item.change * usdKrw).toLocaleString("ko-KR") + "원"
            : (isPositive ? "+" : "") + item.change.toFixed(2);
          return (
            <div key={item.ticker} className="grid grid-cols-12 items-center px-2 py-3 hover:bg-gray-700/20 transition-colors">
              <div className="col-span-4">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">{item.unit}</p>
              </div>
              <div className="col-span-4 text-right">
                <p className="text-sm text-gray-200 tabular-nums">{priceStr}</p>
                <p className={`text-xs tabular-nums ${color}`}>{changeStr}</p>
              </div>
              <div className="col-span-4 text-right">
                <span className={`text-sm font-bold tabular-nums ${color}`}>
                  {isPositive ? "+" : ""}{item.change_pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


