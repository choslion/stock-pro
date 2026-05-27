import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { ChartBarIcon } from "./ui/Icons";

function now() {
  return new Date().toLocaleString("ko-KR", {
    month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric",
  });
}

export default function TrendingSectors() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.sectors(),
    queryFn:  fetchers.sectors,
  });

  const items = data?.items ?? [];

  return (
    <div className="min-h-[480px]">
      {isLoading ? (
        <div className="flex items-center justify-center h-[480px]">
          <Spin />
        </div>
      ) : error && !data ? (
        <ErrorBlock message={parseError(error)} onRetry={refetch} />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">국내 · {now()} 기준</p>
          <div className="divide-y divide-gray-700/50">
            {items.map((sector, i) => {
              const isPositive = sector.change_rate > 0;
              const isNeutral  = sector.change_rate === 0;
              const rateColor  = isNeutral ? "text-gray-400" : isPositive ? "text-red-400" : "text-blue-400";
              return (
                <div
                  key={sector.name}
                  className="flex items-center gap-3 py-3 px-1 hover:bg-gray-700/20 transition-colors"
                >
                  <span className="text-blue-400 font-bold text-sm w-5 shrink-0 text-center">
                    {i + 1}
                  </span>
                  <span className="w-5 shrink-0 flex justify-center">
                    <ChartBarIcon className="w-3.5 h-3.5 text-gray-600" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sector.name}</p>
                    <p className="text-xs text-gray-500">
                      {sector.total}개 중 {sector.rising}개 종목 상승
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${rateColor}`}>
                    {isPositive ? "+" : ""}{sector.change_rate.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">데이터가 없습니다.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
