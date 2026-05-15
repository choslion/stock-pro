import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { TrendingUpIcon } from "./ui/Icons";

function IndexBlock({ label, data, border }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-600 text-sm">
        {label} 데이터 없음
      </div>
    );
  }
  const isPositive = data.change_pct >= 0;
  const color = isPositive ? "text-red-400" : "text-blue-400";

  return (
    <div className={`flex flex-col items-center py-5 ${border ? "border-x border-gray-700" : ""}`}>
      <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">
        {data.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className={`text-sm font-semibold mt-1.5 tabular-nums ${color}`}>
        {isPositive ? "+" : ""}{data.change.toFixed(2)}
        <span className="text-xs ml-1 opacity-80">
          ({isPositive ? "+" : ""}{data.change_pct.toFixed(2)}%)
        </span>
      </p>
      <p className="text-[11px] text-gray-600 mt-1">{data.date}</p>
    </div>
  );
}

export default function GetUsIndices() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setData(null);
    setError("");
    axiosInstance
      .get("/us-indices")
      .then((res) => setData(res.data))
      .catch((err) => setError(parseError(err)));
  }, [retryCount]);

  return (
    <Card title="미국 증시" subtitle="S&P 500 · NASDAQ · DOW" icon={TrendingUpIcon}>
      <div className="min-h-[120px] flex flex-col justify-center">
        {error ? (
          <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />
        ) : !data ? (
          <Spin />
        ) : (
          <div className="grid grid-cols-3">
            <IndexBlock label="S&P 500" data={data.sp500} />
            <IndexBlock label="NASDAQ" data={data.nasdaq} border />
            <IndexBlock label="DOW"    data={data.dow} />
          </div>
        )}
      </div>
    </Card>
  );
}
