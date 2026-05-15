import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";

export default function Commodities() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance
      .get("/commodities")
      .then((res) => setData(res.data.items ?? res.data ?? []))
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  if (loading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (error)   return <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />;

  return (
    <div>
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
          return (
            <div key={item.ticker} className="grid grid-cols-12 items-center px-2 py-3 hover:bg-gray-700/20 transition-colors">
              <div className="col-span-4">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-gray-500">{item.unit}</p>
              </div>
              <div className="col-span-4 text-right">
                <p className="text-sm text-gray-200 tabular-nums">${item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
