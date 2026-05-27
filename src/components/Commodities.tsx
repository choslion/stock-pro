import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";

function fmtTs(isoUtc: string): string | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Seoul" });
}

export default function Commodities() {
  const [currency, setCurrency] = useState<"usd" | "krw">("usd");

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.commodities(),
    queryFn:  fetchers.commodities,
  });

  const items     = data?.items ?? [];
  const fetchedAt = data?.fetched_at ?? null;
  const usdKrw    = data?.usd_krw ?? null;

  if (isLoading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (error && !data) return <ErrorBlock message={parseError(error)} onRetry={refetch} />;

  const showKrw = currency === "krw" && usdKrw != null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 min-h-[20px]">
        {fetchedAt
          ? <p className="text-xs text-gray-500">{fmtTs(fetchedAt)} 기준</p>
          : <span />
        }
        <div className="flex gap-0.5 bg-gray-700/40 rounded-full p-0.5">
          {(["usd", "krw"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                currency === c ? "bg-blue-500 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {c === "usd" ? "USD" : "원"}
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
        {items.map((item) => {
          const isPositive = item.change_pct > 0;
          const isNeutral  = item.change_pct === 0;
          const color = isNeutral ? "text-gray-400" : isPositive ? "text-red-400" : "text-blue-400";
          const priceStr = showKrw
            ? Math.round(item.value * usdKrw!).toLocaleString("ko-KR") + "원"
            : "$" + item.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const changeStr = showKrw
            ? (isPositive ? "+" : "") + Math.round(item.change * usdKrw!).toLocaleString("ko-KR") + "원"
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
