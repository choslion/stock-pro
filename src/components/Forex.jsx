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

export default function Forex() {
  const [data, setData]           = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [retryCount, setRetryCount] = useState(0);
  useAutoRefresh(() => setRetryCount((c) => c + 1));

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance
      .get("/forex")
      .then((res) => {
        setData(res.data.items ?? res.data ?? []);
        setFetchedAt(res.data.fetched_at ?? null);
      })
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (error)   return <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />;

  return (
    <div>
      {fetchedAt && (
        <p className="text-xs text-gray-500 text-right mb-2">{fmtTs(fetchedAt)} 기준</p>
      )}
      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
        <span className="col-span-4">통화</span>
        <span className="col-span-4 text-right">원화 환율</span>
        <span className="col-span-4 text-right">등락률</span>
      </div>
      <div className="divide-y divide-gray-700/50">
        {data.map((item) => {
          const isPositive = item.change_pct > 0;
          const isNeutral  = item.change_pct === 0;
          const color = isNeutral ? "text-gray-400" : isPositive ? "text-red-400" : "text-blue-400";
          return (
            <div key={item.pair} className="grid grid-cols-12 items-center px-2 py-3 hover:bg-gray-700/20 transition-colors">
              <div className="col-span-4">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-gray-500">{item.pair}</p>
              </div>
              <div className="col-span-4 text-right">
                <p className="text-sm text-gray-200 tabular-nums">
                  {item.value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}원
                </p>
                <p className={`text-xs tabular-nums ${color}`}>
                  {isPositive ? "+" : ""}{item.change.toFixed(2)}
                </p>
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


