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

export default function Forex() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.forex(),
    queryFn:  fetchers.forex,
  });

  const items     = data?.items ?? [];
  const fetchedAt = data?.fetched_at ?? null;

  if (isLoading) return <div className="flex justify-center py-10"><Spin /></div>;
  if (error && !data) return <ErrorBlock message={parseError(error)} onRetry={refetch} />;

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
        {items.map((item) => {
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
